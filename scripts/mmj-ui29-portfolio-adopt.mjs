import { randomBytes } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  Ui29Error,
  createBuildInputLock,
  createPublicReleaseManifest,
  createRouteManifest,
  computeProducerRevision,
  fail,
  prettyJson,
  sha256,
  validateHead,
  validateHeadStability,
  validateReceipt,
  validateSnapshot,
  verifyGeneratedArtifactSet,
} from './lib/mmj-ui29-public-contract.mjs'

const root = process.cwd()
const generated = resolve(root, 'generated')
const origin = resolveOrigin(process.env.MMJ_PORTFOLIO_HANDOFF_ORIGIN)
const totalDeadline = Date.now() + 60_000
const targetNames = [
  'portfolio.snapshot.json',
  'portfolio.routes.json',
  'portfolio.handoff.json',
  'portfolio.build-input-lock.json',
  'public-release.manifest.json',
]

function resolveOrigin(raw) {
  if (!raw) fail('E_MMJ_UI29_HANDOFF_ORIGIN_MISSING', 'MMJ_PORTFOLIO_HANDOFF_ORIGIN is required.')
  let url
  try { url = new URL(raw) } catch { fail('E_MMJ_UI29_HANDOFF_ORIGIN_INVALID', 'Portfolio handoff origin is not a valid URL.') }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  const allowLoopback = process.env.MMJ_PORTFOLIO_HANDOFF_ALLOW_INSECURE_LOOPBACK === '1'
  if (url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) {
    fail('E_MMJ_UI29_HANDOFF_ORIGIN_INVALID', 'Portfolio handoff origin must contain only scheme and host.')
  }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback && allowLoopback)) {
    fail('E_MMJ_UI29_HANDOFF_ORIGIN_INVALID', 'Portfolio handoff origin must use HTTPS.')
  }
  url.pathname = ''
  return url.origin
}

async function readLimited(response, maximum, stage) {
  const lengthHeader = response.headers.get('content-length')
  if (lengthHeader !== null) {
    const length = Number(lengthHeader)
    if (!Number.isSafeInteger(length) || length < 0 || length > maximum) {
      fail('E_MMJ_UI29_HANDOFF_RESPONSE_TOO_LARGE', `${stage} response exceeds the admitted size.`, { stage, byteCount: lengthHeader })
    }
  }
  if (!response.body) return Buffer.alloc(0)
  const chunks = []
  let total = 0
  for await (const chunk of response.body) {
    const bytes = Buffer.from(chunk)
    total += bytes.length
    if (total > maximum) fail('E_MMJ_UI29_HANDOFF_RESPONSE_TOO_LARGE', `${stage} response exceeds the admitted size.`, { stage, byteCount: total })
    chunks.push(bytes)
  }
  return Buffer.concat(chunks)
}

async function fetchJson(path, maximum, stage) {
  if (Date.now() >= totalDeadline) fail('E_MMJ_UI29_HANDOFF_TIMEOUT', 'Portfolio handoff transaction exceeded 60 seconds.', { stage })
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  let response
  try {
    response = await fetch(`${origin}${path}`, {
      method: 'GET',
      redirect: 'error',
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        accept: 'application/json',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
      },
    })
  } catch (error) {
    if (error?.name === 'AbortError') fail('E_MMJ_UI29_HANDOFF_TIMEOUT', `${stage} request timed out.`, { stage })
    const message = String(error?.message ?? '')
    if (/redirect/i.test(message)) fail('E_MMJ_UI29_HANDOFF_REDIRECTED', `${stage} request was redirected.`, { stage })
    fail('E_MMJ_UI29_HANDOFF_TIMEOUT', `${stage} request failed.`, { stage })
  } finally {
    clearTimeout(timeout)
  }
  const contentType = response.headers.get('content-type') ?? ''
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
    fail('E_MMJ_UI29_HANDOFF_CONTENT_TYPE_INVALID', `${stage} response is not application/json.`, {
      stage,
      status: response.status,
      contentType,
    })
  }
  const bytes = await readLimited(response, maximum, stage)
  if (!response.ok) {
    if (response.status === 404) fail('E_MMJ_UI29_PORTFOLIO_COLLECTION_NOT_PROMOTED', 'Portfolio collection has not been promoted.', { stage, status: response.status, byteCount: bytes.length })
    fail('E_MMJ_UI29_HANDOFF_TIMEOUT', `${stage} request returned an error response.`, { stage, status: response.status, byteCount: bytes.length })
  }
  let value
  try { value = JSON.parse(bytes.toString('utf8')) } catch {
    fail(stage === 'head' ? 'E_MMJ_UI29_HEAD_INVALID' : stage === 'receipt' ? 'E_MMJ_UI29_RECEIPT_INVALID' : 'E_MMJ_UI29_SNAPSHOT_INVALID', `${stage} response is not valid JSON.`)
  }
  return { response, bytes, value }
}

async function transaction() {
  const headAResponse = await fetchJson('/api/v1/public/portfolio-snapshot/head', 64 * 1024, 'head')
  const headA = validateHead(headAResponse.value)
  const receiptResponse = await fetchJson(`/api/v1/public/portfolio-snapshot/receipts/${encodeURIComponent(headA.handoffReceiptId)}`, 2 * 1024 * 1024, 'receipt')
  const receipt = validateReceipt(receiptResponse.value, headA)
  const snapshotQuery = new URLSearchParams({
    collectionVersionId: headA.collectionVersionId,
    handoffReceiptId: headA.handoffReceiptId,
    snapshotDigest: headA.snapshotDigest,
  })
  const snapshotResponse = await fetchJson(`/api/v1/public/portfolio-snapshot?${snapshotQuery}`, 32 * 1024 * 1024, 'snapshot')
  const etag = snapshotResponse.response.headers.get('etag')
  const collectionHeader = snapshotResponse.response.headers.get('x-mmj-portfolio-collection-version')
  const receiptHeader = snapshotResponse.response.headers.get('x-mmj-portfolio-handoff-receipt')
  if (etag?.replace(/^W\//, '') !== `"${headA.snapshotDigest}"` || collectionHeader !== headA.collectionVersionId || receiptHeader !== headA.handoffReceiptId) {
    fail('E_MMJ_UI29_SNAPSHOT_HEADER_MISMATCH', 'Snapshot response headers do not match the admitted head.', {
      expected: {
        etag: `"${headA.snapshotDigest}"`,
        collectionVersionId: headA.collectionVersionId,
        handoffReceiptId: headA.handoffReceiptId,
      },
      actual: {
        etag,
        collectionVersionId: collectionHeader,
        handoffReceiptId: receiptHeader,
        cfCacheStatus: snapshotResponse.response.headers.get('cf-cache-status'),
        age: snapshotResponse.response.headers.get('age'),
      },
    })
  }
  const actualSnapshotDigest = sha256(snapshotResponse.bytes)
  if (actualSnapshotDigest !== headA.snapshotDigest || actualSnapshotDigest !== receipt.snapshotDigest) {
    fail('E_MMJ_UI29_SNAPSHOT_DIGEST_MISMATCH', 'Snapshot raw-byte digest mismatch.', {
      expectedDigest: headA.snapshotDigest,
      actualDigest: actualSnapshotDigest,
      collectionVersionId: headA.collectionVersionId,
    })
  }
  const { routes } = validateSnapshot(snapshotResponse.value, receipt)
  const headBResponse = await fetchJson('/api/v1/public/portfolio-snapshot/head', 64 * 1024, 'head')
  const headB = validateHead(headBResponse.value)
  validateHeadStability(headA, headB)
  return { head: headA, receipt, snapshotBytes: snapshotResponse.bytes, receiptBytes: receiptResponse.bytes, routes }
}

async function adopt(input) {
  await mkdir(generated, { recursive: true })
  const handoffReceiptDigest = sha256(input.receiptBytes)
  const producerRevision = await computeProducerRevision(root)
  const routeManifest = createRouteManifest(input.routes, input.head.snapshotDigest)
  const routeBytes = Buffer.from(prettyJson(routeManifest), 'utf8')
  const buildInputLock = createBuildInputLock({
    upstreamOrigin: origin,
    head: input.head,
    receipt: input.receipt,
    handoffReceiptDigest,
  })
  const buildInputLockBytes = Buffer.from(prettyJson(buildInputLock), 'utf8')
  const publicReleaseManifest = createPublicReleaseManifest({
    snapshotDigest: input.head.snapshotDigest,
    routesFileDigest: sha256(routeBytes),
    producerRevision,
    handoffReceiptDigest,
    projectCount: input.head.projectCount,
    assetCount: input.head.assetCount,
    publicationCutoff: input.head.publicationCutoff,
    generatedAt: input.receipt.createdAt,
    collectionVersionId: input.head.collectionVersionId,
    handoffReceiptId: input.head.handoffReceiptId,
    sourceDigest: input.head.sourceDigest,
    buildInputLockDigest: sha256(buildInputLockBytes),
  })
  const stageId = randomBytes(8).toString('hex')
  const stage = resolve(generated, `.ui29-stage-${stageId}`)
  const backup = resolve(generated, `.ui29-backup-${stageId}`)
  await mkdir(stage, { recursive: false })
  const files = new Map([
    ['portfolio.snapshot.json', input.snapshotBytes],
    ['portfolio.routes.json', routeBytes],
    ['portfolio.handoff.json', input.receiptBytes],
    ['portfolio.build-input-lock.json', buildInputLockBytes],
    ['public-release.manifest.json', Buffer.from(prettyJson(publicReleaseManifest), 'utf8')],
  ])
  try {
    for (const [name, bytes] of files) await writeFile(resolve(stage, name), bytes, { flag: 'wx' })
    await verifyGeneratedArtifactSet(stage, root, { expectedOrigin: origin })
    await mkdir(backup, { recursive: false })
    const backedUp = []
    const installed = []
    try {
      for (const name of targetNames) {
        const target = resolve(generated, name)
        try {
          await rename(target, resolve(backup, name))
          backedUp.push(name)
        } catch (error) {
          if (error?.code !== 'ENOENT') throw error
        }
      }
      for (const name of targetNames) {
        await rename(resolve(stage, name), resolve(generated, name))
        installed.push(name)
      }
      await verifyGeneratedArtifactSet(generated, root, { expectedOrigin: origin })
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
    if (error instanceof Ui29Error) throw error
    fail('E_MMJ_UI29_GENERATED_ATOMIC_COMMIT_FAILED', 'Generated artifact transaction failed.')
  }
  return publicReleaseManifest
}

let adopted
for (let attempt = 1; attempt <= 3; attempt += 1) {
  try {
    adopted = await adopt(await transaction())
    break
  } catch (error) {
    const retryable = error instanceof Ui29Error && [
      'E_MMJ_UI29_PORTFOLIO_HEAD_UNSTABLE',
      'E_MMJ_UI29_SNAPSHOT_HEADER_MISMATCH',
    ].includes(error.code)
    if (!retryable || attempt === 3) throw error
    await new Promise(resolveDelay => setTimeout(resolveDelay, attempt * 250))
  }
}

console.log(JSON.stringify({
  event: 'PASS_MMJ_UI29_A_PORTFOLIO_HANDOFF_ADOPTED',
  releaseId: adopted.releaseId,
  collectionVersionId: adopted.portfolioCollectionVersionId,
  handoffReceiptId: adopted.portfolioHandoffReceiptId,
  snapshotDigest: adopted.snapshotDigest,
  projectCount: adopted.projectCount,
  assetCount: adopted.assetCount,
}))
