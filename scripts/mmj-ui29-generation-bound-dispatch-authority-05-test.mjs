import assert from 'node:assert/strict'
import {
  PORTFOLIO_DISPATCH_GENERATION_CONTRACT,
  portfolioDispatchGenerationDigest,
} from './lib/mmj-ui29-portfolio-dispatch-generation.mjs'
import { observePortfolioDeploymentAdmission } from './lib/mmj-ui29-portfolio-deployment-authority.mjs'
import { createBuildInputLock } from './lib/mmj-ui29-public-contract.mjs'

const input = {
  schemaVersion: 2,
  deliveryKey: `pdispatch_v1_${'5'.repeat(64)}`,
  generationContract: PORTFOLIO_DISPATCH_GENERATION_CONTRACT,
  collectionVersionId: 'pcol_generation05',
  snapshotDigest: '6'.repeat(64),
  handoffReceiptId: 'phnd_generation05',
  projectCount: 2,
  assetCount: 4,
  sourceWorkbookRevision: 55,
  collectionHeadRevision: 8,
  issuedAt: '2026-08-18T11:30:00.000Z',
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
function authority(overrides = {}) {
  return {
    schemaVersion: 1,
    contract: 'mmj-portfolio-dispatch-authority-v1',
    deliveryKey: input.deliveryKey,
    collectionVersionId: input.collectionVersionId,
    snapshotDigest: input.snapshotDigest,
    handoffReceiptId: input.handoffReceiptId,
    projectCount: input.projectCount,
    assetCount: input.assetCount,
    sourceWorkbookRevision: input.sourceWorkbookRevision,
    collectionHeadRevision: input.collectionHeadRevision,
    ...overrides,
  }
}
const jsonResponse = value => new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })

const admitted = await observePortfolioDeploymentAdmission({ env, retryDelaysMs: [0], fetchImpl: async () => jsonResponse(authority()) })
assert.deepEqual(admitted, { state: 'admitted', relation: 'current', deploy: true, reason: 'current-authority-exact-match', observedCurrentAuthority: null })

const historical = await observePortfolioDeploymentAdmission({ env, retryDelaysMs: [0], fetchImpl: async () => jsonResponse(authority({ deliveryKey: `pdispatch_v1_${'7'.repeat(64)}` })) })
assert.equal(historical.state, 'withheld')
assert.equal(historical.relation, 'historical')
assert.equal(historical.deploy, false)

const contradiction = await observePortfolioDeploymentAdmission({ env, retryDelaysMs: [0], fetchImpl: async () => jsonResponse(authority({ snapshotDigest: '8'.repeat(64) })) })
assert.equal(contradiction.state, 'undetermined')
assert.equal(contradiction.deploy, false)

const unavailable = await observePortfolioDeploymentAdmission({ env, retryDelaysMs: [0, 0], fetchImpl: async () => { throw new Error('network') }, sleep: async () => {} })
assert.equal(unavailable.state, 'undetermined')
assert.equal(unavailable.deploy, false)

const nonPortfolio = await observePortfolioDeploymentAdmission({ env: { MMJ_PORTFOLIO_EVENT_ACTIVE: '0' } })
assert.equal(nonPortfolio.deploy, true)
assert.equal(nonPortfolio.relation, 'non-portfolio')

const head = {
  collectionVersionId: input.collectionVersionId,
  generation: input.collectionHeadRevision,
  snapshotDigest: input.snapshotDigest,
  sourceDigest: '9'.repeat(64),
  sourceHeadSetDigest: '9'.repeat(64),
  publicationCutoff: input.issuedAt,
  projectCount: input.projectCount,
  assetCount: input.assetCount,
  routeCount: input.projectCount,
}
const receipt = { receiptId: input.handoffReceiptId, routesDigest: 'a'.repeat(64), createdAt: input.issuedAt }
const lock = createBuildInputLock({ upstreamOrigin: 'https://cms.example.test', head, receipt, handoffReceiptDigest: 'b'.repeat(64), generation: {
  deliveryKey: input.deliveryKey,
  generationContract: input.generationContract,
  generationDigest: input.generationDigest,
  sourceWorkbookRevision: input.sourceWorkbookRevision,
  collectionHeadRevision: input.collectionHeadRevision,
} })
assert.equal(lock.schemaVersion, 2)
assert.equal(lock.deliveryKey, input.deliveryKey)
assert.equal(lock.generationDigest, input.generationDigest)
assert.equal(lock.collectionHeadRevision, input.collectionHeadRevision)

console.log('PASS_PREDEPLOY_CURRENT_AUTHORITY_FENCE')
console.log('PASS_HISTORICAL_GENERATION_NO_PAGES_WRITE')
console.log('PASS_HISTORICAL_WITHHOLD_NO_FALSE_FAILURE')
console.log('PASS_AUTHORITY_UNAVAILABLE_NO_FAIL_OPEN')
console.log('PASS_BUILD_INPUT_GENERATION_SEAL')
