import { randomBytes } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  CommissionContractError,
  createAggregatePublicReleaseManifest,
  createCommissionBuildInputLock,
  fail,
  prettyJson,
  sha256,
  validateCommissionHead,
  validateCommissionReceipt,
  validateCommissionSnapshot,
  verifyCommissionGeneratedArtifactSet,
} from './lib/mmj-ui29-commission-contract.mjs'
import {
  computeProducerRevision,
  verifyGeneratedArtifactSet,
} from './lib/mmj-ui29-public-contract.mjs'
import {
  runCommissionHandoffTransactionWithRetry,
} from './lib/mmj-ui29-commission-handoff-retry-authority.mjs'

const root = process.cwd()
const generated = resolve(root, 'generated')
const origin = resolveOrigin(process.env.MMJ_COMMISSION_GUIDE_HANDOFF_ORIGIN ?? process.env.MMJ_PORTFOLIO_HANDOFF_ORIGIN)
const deadline = Date.now() + 60_000
const targetNames = [
  'commission-guide.snapshot.json',
  'commission-guide.handoff.json',
  'commission-guide.build-input-lock.json',
  'public-release.manifest.json',
]

function resolveOrigin(raw) {
  if (!raw) fail('E_MMJ_COMMISSION_HANDOFF_ORIGIN_MISSING', 'MMJ_COMMISSION_GUIDE_HANDOFF_ORIGIN is required.')
  let url
  try { url = new URL(raw) } catch { fail('E_MMJ_COMMISSION_HANDOFF_ORIGIN_INVALID', 'Commission handoff origin is not a valid URL.') }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  const allowLoopback = process.env.MMJ_COMMISSION_GUIDE_HANDOFF_ALLOW_INSECURE_LOOPBACK === '1'
  if (url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) fail('E_MMJ_COMMISSION_HANDOFF_ORIGIN_INVALID', 'Commission handoff origin must contain only scheme and host.')
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback && allowLoopback)) fail('E_MMJ_COMMISSION_HANDOFF_ORIGIN_INVALID', 'Commission handoff origin must use HTTPS.')
  return url.origin
}

async function fetchBytes(path, maximum, stage) {
  if (Date.now() >= deadline) fail('E_MMJ_COMMISSION_HANDOFF_TIMEOUT', 'Commission handoff transaction exceeded 60 seconds.', { stage })
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  let response
  try {
    response = await fetch(`${origin}${path}`, {
      method: 'GET',
      redirect: 'error',
      cache: 'no-store',
      signal: controller.signal,
      headers: { accept: 'application/json', 'cache-control': 'no-cache', pragma: 'no-cache' },
    })
  } catch (error) {
    const originalErrorName = typeof error?.name === 'string' ? error.name : 'Error'
    const originalErrorMessage = typeof error?.message === 'string' ? error.message : String(error)
    const originalCauseCode = typeof error?.cause?.code === 'string' ? error.cause.code : null
    if (error?.name === 'AbortError') fail('E_MMJ_COMMISSION_HANDOFF_TIMEOUT', `${stage} request timed out.`, {
      stage,
      transportKind: 'timeout',
      originalErrorName,
      originalErrorMessage,
      originalCauseCode,
    })
    fail('E_MMJ_COMMISSION_HANDOFF_TIMEOUT', `${stage} request failed.`, {
      stage,
      transportKind: 'network',
      originalErrorName,
      originalErrorMessage,
      originalCauseCode,
    })
  } finally {
    clearTimeout(timeout)
  }
  if (!response.ok) fail('E_MMJ_COMMISSION_HANDOFF_FETCH_FAILED', `${stage} request returned an error response.`, { stage, status: response.status })
  const length = Number(response.headers.get('content-length') ?? 0)
  if (Number.isFinite(length) && length > maximum) fail('E_MMJ_COMMISSION_HANDOFF_RESPONSE_TOO_LARGE', `${stage} response exceeds admitted size.`, { stage, length })
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length > maximum) fail('E_MMJ_COMMISSION_HANDOFF_RESPONSE_TOO_LARGE', `${stage} response exceeds admitted size.`, { stage, length: bytes.length })
  return { response, bytes }
}

function parse(bytes, stage) {
  try { return JSON.parse(bytes.toString('utf8')) } catch { fail('E_MMJ_COMMISSION_HANDOFF_INVALID', `${stage} response is not valid JSON.`) }
}

async function transaction() {
  const headAResponse = await fetchBytes('/api/v1/public/commission-guide/head', 64 * 1024, 'head')
  const headA = validateCommissionHead(parse(headAResponse.bytes, 'head'))
  const receiptResponse = await fetchBytes(`/api/v1/public/commission-guide/receipts/${encodeURIComponent(headA.handoffReceiptId)}`, 256 * 1024, 'receipt')
  const receipt = validateCommissionReceipt(parse(receiptResponse.bytes, 'receipt'), headA)
  const query = new URLSearchParams({
    publicationVersionId: headA.publicationVersionId,
    handoffReceiptId: headA.handoffReceiptId,
    snapshotDigest: headA.snapshotDigest,
  })
  const snapshotResponse = await fetchBytes(`/api/v1/public/commission-guide?${query}`, 8 * 1024 * 1024, 'snapshot')
  const actualDigest = sha256(snapshotResponse.bytes)
  if (actualDigest !== headA.snapshotDigest || actualDigest !== receipt.snapshotDigest) fail('E_MMJ_COMMISSION_SNAPSHOT_DIGEST_MISMATCH', 'Commission snapshot raw-byte digest mismatch.', { expected: headA.snapshotDigest, actual: actualDigest })
  const etag = snapshotResponse.response.headers.get('etag')?.replace(/^W\//, '')
  const versionHeader = snapshotResponse.response.headers.get('x-mmj-commission-publication-version')
  const receiptHeader = snapshotResponse.response.headers.get('x-mmj-commission-handoff-receipt')
  if (etag !== `"${headA.snapshotDigest}"` || versionHeader !== headA.publicationVersionId || receiptHeader !== headA.handoffReceiptId) fail('E_MMJ_COMMISSION_SNAPSHOT_HEADER_MISMATCH', 'Commission snapshot response headers do not match the head.')
  const snapshot = parse(snapshotResponse.bytes, 'snapshot')
  const validated = validateCommissionSnapshot(snapshot, headA)
  if (validated.contentDigest !== headA.contentDigest || validated.contentDigest !== receipt.contentDigest) fail('E_MMJ_COMMISSION_SNAPSHOT_DIGEST_MISMATCH', 'Commission content digest mismatch.')
  const headBResponse = await fetchBytes('/api/v1/public/commission-guide/head', 64 * 1024, 'head-repeat')
  const headB = validateCommissionHead(parse(headBResponse.bytes, 'head-repeat'))
  for (const field of ['publicationVersionId', 'snapshotDigest', 'handoffReceiptId', 'publicationHeadRevision']) {
    if (headA[field] !== headB[field]) fail('E_MMJ_COMMISSION_HEAD_UNSTABLE', `Commission head changed at ${field}.`, { before: headA[field], after: headB[field] })
  }
  return { head: headA, receipt, snapshotBytes: snapshotResponse.bytes, receiptBytes: receiptResponse.bytes }
}

async function adopt(input) {
  await mkdir(generated, { recursive: true })
  const portfolio = await verifyGeneratedArtifactSet(generated, root)
  const producerRevision = await computeProducerRevision(root)
  const portfolioHandoff = JSON.parse(await readFile(resolve(generated, 'portfolio.handoff.json'), 'utf8'))
  const handoffReceiptDigest = sha256(input.receiptBytes)
  const buildLock = createCommissionBuildInputLock({ upstreamOrigin: origin, head: input.head, receipt: input.receipt, handoffReceiptDigest })
  const buildLockBytes = Buffer.from(prettyJson(buildLock), 'utf8')
  const commissionIdentity = {
    snapshotDigest: input.head.snapshotDigest,
    contentDigest: input.head.contentDigest,
    handoffReceiptDigest,
    buildInputLockDigest: sha256(buildLockBytes),
    publicationVersionId: input.head.publicationVersionId,
    handoffReceiptId: input.head.handoffReceiptId,
    sourceWorkbookRevision: input.head.sourceWorkbookRevision,
    publicationHeadRevision: input.head.publicationHeadRevision,
  }
  const manifest = createAggregatePublicReleaseManifest({
    producerRevision,
    generatedAt: input.receipt.createdAt,
    portfolio: {
      snapshotDigest: portfolio.snapshotDigest,
      routesDigest: portfolio.routesFileDigest,
      handoffReceiptDigest: portfolio.handoffReceiptDigest,
      buildInputLockDigest: portfolio.buildInputLockDigest,
      collectionVersionId: portfolioHandoff.collectionVersionId,
      handoffReceiptId: portfolioHandoff.receiptId,
      sourceDigest: portfolioHandoff.sourceDigest,
      projectCount: portfolio.projectCount,
      assetCount: portfolio.assetCount,
    },
    commissionGuide: commissionIdentity,
  })
  const stageId = randomBytes(8).toString('hex')
  const stage = resolve(generated, `.commission-stage-${stageId}`)
  const backup = resolve(generated, `.commission-backup-${stageId}`)
  await mkdir(stage, { recursive: false })
  const files = new Map([
    ['commission-guide.snapshot.json', input.snapshotBytes],
    ['commission-guide.handoff.json', input.receiptBytes],
    ['commission-guide.build-input-lock.json', buildLockBytes],
    ['public-release.manifest.json', Buffer.from(prettyJson(manifest), 'utf8')],
  ])
  try {
    for (const [name, bytes] of files) await writeFile(resolve(stage, name), bytes, { flag: 'wx' })
    await verifyCommissionGeneratedArtifactSet(stage, root)
    await mkdir(backup, { recursive: false })
    const backedUp = []
    const installed = []
    try {
      for (const name of targetNames) {
        try { await rename(resolve(generated, name), resolve(backup, name)); backedUp.push(name) } catch (error) { if (error?.code !== 'ENOENT') throw error }
      }
      for (const name of targetNames) { await rename(resolve(stage, name), resolve(generated, name)); installed.push(name) }
      await verifyCommissionGeneratedArtifactSet(generated, root)
      await rm(backup, { recursive: true, force: true })
      await rm(stage, { recursive: true, force: true })
    } catch (error) {
      for (const name of installed.reverse()) await rm(resolve(generated, name), { force: true }).catch(() => undefined)
      for (const name of backedUp) await rename(resolve(backup, name), resolve(generated, name)).catch(() => undefined)
      throw error
    }
  } catch (error) {
    await rm(stage, { recursive: true, force: true }).catch(() => undefined)
    await rm(backup, { recursive: true, force: true }).catch(() => undefined)
    if (error instanceof CommissionContractError) throw error
    fail('E_MMJ_COMMISSION_GENERATED_COMMIT_FAILED', 'Commission generated artifact transaction failed.')
  }
  return { manifest, commissionIdentity }
}

const adopted = await runCommissionHandoffTransactionWithRetry({
  deadline,
  transaction: async () => adopt(await transaction()),
})

console.log(JSON.stringify({
  event: 'PASS_MMJ_UI29_COMMISSION_GUIDE_ADOPTED',
  guideId: 'default',
  publicationVersionId: adopted.commissionIdentity.publicationVersionId,
  snapshotDigest: adopted.commissionIdentity.snapshotDigest,
  contentDigest: adopted.commissionIdentity.contentDigest,
  handoffReceiptDigest: adopted.commissionIdentity.handoffReceiptDigest,
  releaseId: adopted.manifest.releaseId,
  runtimeCmsFetch: 'absent',
}))
