import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const verifier = fileURLToPath(new URL('./mmj-ui29-dispatch-input-verify.mjs', import.meta.url))
const identity = {
  deliveryKey: `pdispatch_v1_${'1'.repeat(64)}`,
  collectionVersionId: 'pcol_dispatchauthority01',
  snapshotDigest: '2'.repeat(64),
  handoffReceiptId: 'phnd_dispatchauthority01',
  projectCount: '0',
  assetCount: '0',
  sourceWorkbookRevision: '33',
  collectionHeadRevision: '2',
  issuedAt: '2026-07-30T06:00:00.000Z',
}
const baseEnv = {
  ...process.env,
  MMJ_DELIVERY_KEY: identity.deliveryKey,
  MMJ_COLLECTION_VERSION_ID: identity.collectionVersionId,
  MMJ_EXPECTED_SNAPSHOT_DIGEST: identity.snapshotDigest,
  MMJ_HANDOFF_RECEIPT_ID: identity.handoffReceiptId,
  MMJ_PROJECT_COUNT: identity.projectCount,
  MMJ_ASSET_COUNT: identity.assetCount,
  MMJ_SOURCE_WORKBOOK_REVISION: identity.sourceWorkbookRevision,
  MMJ_COLLECTION_HEAD_REVISION: identity.collectionHeadRevision,
  MMJ_ISSUED_AT: identity.issuedAt,
  MMJ_PORTFOLIO_HANDOFF_ORIGIN: 'https://cms.example.test',
}

const negativeAttempt = spawnSync(process.execPath, [verifier, 'preflight'], {
  env: { ...baseEnv, MMJ_PROJECT_COUNT: '-1' },
  encoding: 'utf8',
})
assert.equal(negativeAttempt.status, 1)
assert.match(negativeAttempt.stderr, /projectCount is invalid/)

Object.assign(process.env, baseEnv)
let fetchCount = 0
globalThis.fetch = async (url, init) => {
  fetchCount += 1
  assert.equal(String(url), 'https://cms.example.test/api/v1/public/portfolio-snapshot/dispatch-authority')
  assert.equal(init?.redirect, 'error')
  return new Response(JSON.stringify({
    schemaVersion: 1,
    contract: 'mmj-portfolio-dispatch-authority-v1',
    deliveryKey: identity.deliveryKey,
    collectionVersionId: identity.collectionVersionId,
    snapshotDigest: identity.snapshotDigest,
    handoffReceiptId: identity.handoffReceiptId,
    projectCount: Number(identity.projectCount),
    assetCount: Number(identity.assetCount),
    sourceWorkbookRevision: Number(identity.sourceWorkbookRevision),
    collectionHeadRevision: Number(identity.collectionHeadRevision),
  }), { status: 200, headers: { 'content-type': 'application/json' } })
}
await import(`./mmj-ui29-dispatch-input-verify.mjs?test=${Date.now()}`)
assert.equal(fetchCount, 1)
console.log('PASS_MMJ_UI29_DISPATCH_AUTHORITY_PREFLIGHT_TEST')
