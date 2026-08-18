import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  PORTFOLIO_DISPATCH_GENERATION_CONTRACT,
  portfolioDispatchGenerationDigest,
} from './lib/mmj-ui29-portfolio-dispatch-generation.mjs'

const verifier = fileURLToPath(new URL('./mmj-ui29-dispatch-input-verify.mjs', import.meta.url))
const identity = {
  schemaVersion: 2,
  deliveryKey: `pdispatch_v1_${'1'.repeat(64)}`,
  generationContract: PORTFOLIO_DISPATCH_GENERATION_CONTRACT,
  collectionVersionId: 'pcol_dispatchauthority01',
  snapshotDigest: '2'.repeat(64),
  handoffReceiptId: 'phnd_dispatchauthority01',
  projectCount: 0,
  assetCount: 0,
  sourceWorkbookRevision: 33,
  collectionHeadRevision: 2,
  issuedAt: '2026-07-30T06:00:00.000Z',
}
identity.generationDigest = portfolioDispatchGenerationDigest(identity)
const baseEnv = {
  ...process.env,
  MMJ_DISPATCH_SCHEMA_VERSION: String(identity.schemaVersion),
  MMJ_DISPATCH_GENERATION_CONTRACT: identity.generationContract,
  MMJ_DISPATCH_GENERATION_DIGEST: identity.generationDigest,
  MMJ_DELIVERY_KEY: identity.deliveryKey,
  MMJ_COLLECTION_VERSION_ID: identity.collectionVersionId,
  MMJ_EXPECTED_SNAPSHOT_DIGEST: identity.snapshotDigest,
  MMJ_HANDOFF_RECEIPT_ID: identity.handoffReceiptId,
  MMJ_PROJECT_COUNT: String(identity.projectCount),
  MMJ_ASSET_COUNT: String(identity.assetCount),
  MMJ_SOURCE_WORKBOOK_REVISION: String(identity.sourceWorkbookRevision),
  MMJ_COLLECTION_HEAD_REVISION: String(identity.collectionHeadRevision),
  MMJ_ISSUED_AT: identity.issuedAt,
  MMJ_PORTFOLIO_HANDOFF_ORIGIN: 'https://cms.example.test',
}

const negativeAttempt = spawnSync(process.execPath, [verifier, 'preflight'], {
  env: { ...baseEnv, MMJ_PROJECT_COUNT: '-1' },
  encoding: 'utf8',
})
assert.equal(negativeAttempt.status, 1)
assert.match(negativeAttempt.stderr, /DISPATCH_INPUT_INVALID/)

Object.assign(process.env, baseEnv)
let fetchCount = 0
globalThis.fetch = async (url, init) => {
  fetchCount += 1
  assert.equal(String(url), `https://cms.example.test/api/v1/public/portfolio-snapshot/dispatch-generations/${identity.deliveryKey}`)
  assert.equal(init?.redirect, 'error')
  return new Response(JSON.stringify({
    schemaVersion: 1,
    contract: 'mmj-portfolio-dispatch-generation-authority-v1',
    relation: 'historical',
    generation: {
      contract: identity.generationContract,
      deliveryKey: identity.deliveryKey,
      collectionVersionId: identity.collectionVersionId,
      snapshotDigest: identity.snapshotDigest,
      handoffReceiptId: identity.handoffReceiptId,
      projectCount: identity.projectCount,
      assetCount: identity.assetCount,
      sourceWorkbookRevision: identity.sourceWorkbookRevision,
      collectionHeadRevision: identity.collectionHeadRevision,
      generationDigest: identity.generationDigest,
      issuedAt: identity.issuedAt,
    },
  }), { status: 200, headers: { 'content-type': 'application/json' } })
}
await import(`./mmj-ui29-dispatch-input-verify.mjs?test=${Date.now()}`)
assert.equal(fetchCount, 1)
console.log('PASS_MMJ_UI29_GENERATION_AUTHORITY_PREFLIGHT_TEST')
console.log('PASS_MMJ_UI29_HISTORICAL_GENERATION_PREFLIGHT_ALLOWED')
