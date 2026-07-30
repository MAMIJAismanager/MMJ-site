import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const mode = process.argv[2] || 'preflight'
const required = {
  deliveryKey: process.env.MMJ_DELIVERY_KEY,
  collectionVersionId: process.env.MMJ_COLLECTION_VERSION_ID,
  snapshotDigest: process.env.MMJ_EXPECTED_SNAPSHOT_DIGEST,
  handoffReceiptId: process.env.MMJ_HANDOFF_RECEIPT_ID,
  projectCount: process.env.MMJ_PROJECT_COUNT,
  assetCount: process.env.MMJ_ASSET_COUNT,
  sourceWorkbookRevision: process.env.MMJ_SOURCE_WORKBOOK_REVISION,
  collectionHeadRevision: process.env.MMJ_COLLECTION_HEAD_REVISION,
  issuedAt: process.env.MMJ_ISSUED_AT,
}

function fail(code, message, details = undefined) {
  console.error(JSON.stringify({ schemaVersion: 1, error: code, message, details }))
  process.exit(1)
}

function positiveInteger(value, field) {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 1) fail('E_MMJ_UI29_DISPATCH_INPUT_INVALID', `${field} is invalid.`)
  return parsed
}

function canonicalIso(value, field) {
  const parsed = Date.parse(String(value || ''))
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) fail('E_MMJ_UI29_DISPATCH_INPUT_INVALID', `${field} is invalid.`)
  return value
}

function validateInput() {
  if (!/^pdispatch_v1_[0-9a-f]{64}$/.test(required.deliveryKey || '')) fail('E_MMJ_UI29_DISPATCH_INPUT_INVALID', 'deliveryKey is invalid.')
  if (!/^pcol_[A-Za-z0-9_-]{8,128}$/.test(required.collectionVersionId || '')) fail('E_MMJ_UI29_DISPATCH_INPUT_INVALID', 'collectionVersionId is invalid.')
  if (!/^[0-9a-f]{64}$/.test(required.snapshotDigest || '')) fail('E_MMJ_UI29_DISPATCH_INPUT_INVALID', 'snapshotDigest is invalid.')
  if (!/^phnd_[A-Za-z0-9_-]{8,128}$/.test(required.handoffReceiptId || '')) fail('E_MMJ_UI29_DISPATCH_INPUT_INVALID', 'handoffReceiptId is invalid.')
  return {
    schemaVersion: 1,
    deliveryKey: required.deliveryKey,
    collectionVersionId: required.collectionVersionId,
    snapshotDigest: required.snapshotDigest,
    handoffReceiptId: required.handoffReceiptId,
    projectCount: positiveInteger(required.projectCount, 'projectCount'),
    assetCount: positiveInteger(required.assetCount, 'assetCount'),
    sourceWorkbookRevision: positiveInteger(required.sourceWorkbookRevision, 'sourceWorkbookRevision'),
    collectionHeadRevision: positiveInteger(required.collectionHeadRevision, 'collectionHeadRevision'),
    issuedAt: canonicalIso(required.issuedAt, 'issuedAt'),
  }
}

function resolveOrigin() {
  const raw = process.env.MMJ_PORTFOLIO_HANDOFF_ORIGIN
  if (!raw) fail('E_MMJ_UI29_HANDOFF_ORIGIN_MISSING', 'MMJ_PORTFOLIO_HANDOFF_ORIGIN is required.')
  let url
  try { url = new URL(raw) } catch { fail('E_MMJ_UI29_HANDOFF_ORIGIN_INVALID', 'MMJ_PORTFOLIO_HANDOFF_ORIGIN is invalid.') }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || (url.pathname !== '' && url.pathname !== '/')) {
    fail('E_MMJ_UI29_HANDOFF_ORIGIN_INVALID', 'MMJ_PORTFOLIO_HANDOFF_ORIGIN must be an HTTPS origin.')
  }
  return url.origin
}

async function preflight(input) {
  const origin = resolveOrigin()
  const response = await fetch(`${origin}/api/v1/public/portfolio-snapshot/dispatch-authority`, {
    headers: { accept: 'application/json', 'cache-control': 'no-cache' },
    redirect: 'error',
  })
  if (!response.ok) fail('E_MMJ_UI29_DISPATCH_HEAD_FETCH_FAILED', 'Portfolio head request failed.', { status: response.status })
  const authority = await response.json()
  if (authority.contract !== 'mmj-portfolio-dispatch-authority-v1') fail('E_MMJ_UI29_DISPATCH_AUTHORITY_INVALID', 'Portfolio dispatch authority contract is invalid.')
  const mismatches = []
  for (const field of ['deliveryKey', 'collectionVersionId', 'snapshotDigest', 'handoffReceiptId', 'projectCount', 'assetCount', 'sourceWorkbookRevision', 'collectionHeadRevision']) {
    if (String(authority[field]) !== String(input[field])) mismatches.push({ field, expected: input[field], actual: authority[field] })
  }
  if (mismatches.length) fail('E_MMJ_UI29_DISPATCH_HEAD_MISMATCH', 'Current portfolio head does not match dispatch payload.', { mismatches })
  console.log(JSON.stringify({ event: 'PASS_MMJ_UI29_B_DISPATCH_PREFLIGHT', ...input }))
}

async function postAdopt(input) {
  const root = process.cwd()
  const [manifestBytes, handoffBytes] = await Promise.all([
    readFile(resolve(root, 'generated/public-release.manifest.json')),
    readFile(resolve(root, 'generated/portfolio.handoff.json')),
  ])
  const manifest = JSON.parse(manifestBytes.toString('utf8'))
  const handoff = JSON.parse(handoffBytes.toString('utf8'))
  const mismatches = []
  const checks = [
    ['snapshotDigest', manifest.snapshotDigest, input.snapshotDigest],
    ['collectionVersionId', manifest.portfolioCollectionVersionId, input.collectionVersionId],
    ['handoffReceiptId', manifest.portfolioHandoffReceiptId, input.handoffReceiptId],
    ['projectCount', manifest.projectCount, input.projectCount],
    ['assetCount', manifest.assetCount, input.assetCount],
    ['handoff.snapshotDigest', handoff.snapshotDigest, input.snapshotDigest],
  ]
  for (const [field, actual, expected] of checks) if (String(actual) !== String(expected)) mismatches.push({ field, expected, actual })
  if (mismatches.length) fail('E_MMJ_UI29_DISPATCH_ADOPTION_MISMATCH', 'Adopted artifacts do not match dispatch payload.', { mismatches })
  console.log(JSON.stringify({
    event: 'PASS_MMJ_UI29_B_DISPATCH_ADOPTION_VERIFIED',
    ...input,
    publicReleaseManifestDigest: createHash('sha256').update(manifestBytes).digest('hex'),
  }))
}

const input = validateInput()
if (mode === 'preflight') await preflight(input)
else if (mode === 'post-adopt') await postAdopt(input)
else fail('E_MMJ_UI29_DISPATCH_MODE_INVALID', 'Expected preflight or post-adopt mode.')
