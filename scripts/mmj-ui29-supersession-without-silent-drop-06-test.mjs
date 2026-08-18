import assert from 'node:assert/strict'
import { observePortfolioDeploymentAdmission } from './lib/mmj-ui29-portfolio-deployment-authority.mjs'
import { PORTFOLIO_DISPATCH_GENERATION_CONTRACT, portfolioDispatchGenerationDigest } from './lib/mmj-ui29-portfolio-dispatch-generation.mjs'

const input = {
  schemaVersion: 2,
  deliveryKey: `pdispatch_v1_${'1'.repeat(64)}`,
  generationContract: PORTFOLIO_DISPATCH_GENERATION_CONTRACT,
  collectionVersionId: 'pcol_r06_public_old',
  snapshotDigest: '2'.repeat(64),
  handoffReceiptId: 'phnd_r06_public_old',
  projectCount: 2,
  assetCount: 3,
  sourceWorkbookRevision: 60,
  collectionHeadRevision: 60,
  issuedAt: '2026-08-18T12:00:00.000Z',
}
input.generationDigest = portfolioDispatchGenerationDigest(input)
const env = {
  MMJ_PORTFOLIO_EVENT_ACTIVE: '1',
  MMJ_PORTFOLIO_HANDOFF_ORIGIN: 'https://cms.example.test',
  MMJ_DISPATCH_SCHEMA_VERSION: '2',
  MMJ_DISPATCH_GENERATION_CONTRACT: input.generationContract,
  MMJ_DISPATCH_GENERATION_DIGEST: input.generationDigest,
  MMJ_DELIVERY_KEY: input.deliveryKey,
  MMJ_COLLECTION_VERSION_ID: input.collectionVersionId,
  MMJ_EXPECTED_SNAPSHOT_DIGEST: input.snapshotDigest,
  MMJ_HANDOFF_RECEIPT_ID: input.handoffReceiptId,
  MMJ_PROJECT_COUNT: String(input.projectCount),
  MMJ_ASSET_COUNT: String(input.assetCount),
  MMJ_SOURCE_WORKBOOK_REVISION: String(input.sourceWorkbookRevision),
  MMJ_COLLECTION_HEAD_REVISION: String(input.collectionHeadRevision),
  MMJ_ISSUED_AT: input.issuedAt,
}
const current = {
  schemaVersion: 1,
  contract: 'mmj-portfolio-dispatch-authority-v1',
  deliveryKey: `pdispatch_v1_${'3'.repeat(64)}`,
  collectionVersionId: 'pcol_r06_public_new',
  snapshotDigest: '4'.repeat(64),
  handoffReceiptId: 'phnd_r06_public_new',
  projectCount: 2,
  assetCount: 3,
  sourceWorkbookRevision: 61,
  collectionHeadRevision: 61,
}
const response = value => new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })

const historical = await observePortfolioDeploymentAdmission({ env, retryDelaysMs: [0], fetchImpl: async () => response(current) })
assert.equal(historical.state, 'withheld')
assert.equal(historical.relation, 'historical')
assert.equal(historical.deploy, false)
assert.equal(historical.reason, 'delivery-no-longer-current')
assert.deepEqual(historical.observedCurrentAuthority, {
  deliveryKey: current.deliveryKey,
  collectionVersionId: current.collectionVersionId,
  snapshotDigest: current.snapshotDigest,
  collectionHeadRevision: current.collectionHeadRevision,
})

const currentExact = { ...current, deliveryKey: input.deliveryKey, collectionVersionId: input.collectionVersionId, snapshotDigest: input.snapshotDigest, handoffReceiptId: input.handoffReceiptId, projectCount: input.projectCount, assetCount: input.assetCount, sourceWorkbookRevision: input.sourceWorkbookRevision, collectionHeadRevision: input.collectionHeadRevision }
const admitted = await observePortfolioDeploymentAdmission({ env, retryDelaysMs: [0], fetchImpl: async () => response(currentExact) })
assert.equal(admitted.state, 'admitted')
assert.equal(admitted.relation, 'current')
assert.equal(admitted.observedCurrentAuthority, null)

console.log('PASS_HISTORICAL_WITHHOLD_OBSERVATION_EXACT')
console.log('PASS_ADMISSION_OBSERVATION_REUSED_FOR_SUPERSESSION_RECEIPT')
console.log('PASS_CURRENT_DELIVERY_NO_SUPERSESSION_OBSERVATION')
