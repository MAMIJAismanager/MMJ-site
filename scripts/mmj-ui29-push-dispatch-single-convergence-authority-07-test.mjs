import assert from 'node:assert/strict'
import {
  derivePublicConvergenceDigest,
  readPublicConvergenceEnvironment,
} from './lib/mmj-ui29-public-convergence.mjs'
import { observePublicConvergenceDeploymentAdmission } from './lib/mmj-ui29-public-convergence-deployment-authority.mjs'

const portfolio = {
  deliveryKey: `pdispatch_v1_${'1'.repeat(64)}`,
  generationContract: 'mmj-portfolio-dispatch-generation-identity-v1',
  generationDigest: '2'.repeat(64),
  collectionVersionId: 'pcol_r07exact',
  snapshotDigest: '3'.repeat(64),
  handoffReceiptId: 'phnd_r07exact',
  projectCount: 2,
  assetCount: 5,
  sourceWorkbookRevision: 70,
  collectionHeadRevision: 17,
  issuedAt: '2026-08-18T13:00:00.000Z',
}
const commission = {
  guideId: 'default',
  publicationVersionId: 'cgv_1234567890abcdef1234567890ab',
  snapshotDigest: '4'.repeat(64),
  contentDigest: '5'.repeat(64),
  handoffReceiptId: 'cgh_1234567890abcdef1234567890',
  sourceWorkbookRevision: 44,
  publicationHeadRevision: 12,
  issuedAt: '2026-08-18T13:00:01.000Z',
}
const source = { repository: 'MAMIJAismanager/MMJ-site', ref: 'refs/heads/main', commitSha: '6'.repeat(40) }
const target = { source, portfolio, commission }
const digest = derivePublicConvergenceDigest(target)
const key = `pcv_${digest.slice(0, 32)}`
const env = {
  MMJ_PUBLIC_CONVERGENCE_KEY: key,
  MMJ_PUBLIC_CONVERGENCE_REVISION: '9',
  MMJ_PUBLIC_CONVERGENCE_DIGEST: digest,
MMJ_PUBLIC_CONVERGENCE_SNAPSHOT_CONTRACT: 'mmj-public-convergence-exact-snapshot-v1',
MMJ_PUBLIC_CONVERGENCE_SNAPSHOT_DIGEST: digest,
  MMJ_PUBLIC_CONVERGENCE_ISSUED_AT: '2026-08-18T13:00:02.000Z',
  MMJ_PUBLIC_SOURCE_REPOSITORY: source.repository,
  MMJ_PUBLIC_SOURCE_REF: source.ref,
  MMJ_PUBLIC_SOURCE_COMMIT_SHA: source.commitSha,
  MMJ_DELIVERY_KEY: portfolio.deliveryKey,
  MMJ_DISPATCH_GENERATION_CONTRACT: portfolio.generationContract,
  MMJ_DISPATCH_GENERATION_DIGEST: portfolio.generationDigest,
  MMJ_COLLECTION_VERSION_ID: portfolio.collectionVersionId,
  MMJ_EXPECTED_SNAPSHOT_DIGEST: portfolio.snapshotDigest,
  MMJ_HANDOFF_RECEIPT_ID: portfolio.handoffReceiptId,
  MMJ_PROJECT_COUNT: String(portfolio.projectCount),
  MMJ_ASSET_COUNT: String(portfolio.assetCount),
  MMJ_SOURCE_WORKBOOK_REVISION: String(portfolio.sourceWorkbookRevision),
  MMJ_COLLECTION_HEAD_REVISION: String(portfolio.collectionHeadRevision),
  MMJ_ISSUED_AT: portfolio.issuedAt,
  MMJ_COMMISSION_GUIDE_ID: commission.guideId,
  MMJ_COMMISSION_PUBLICATION_VERSION_ID: commission.publicationVersionId,
  MMJ_COMMISSION_EXPECTED_SNAPSHOT_DIGEST: commission.snapshotDigest,
  MMJ_COMMISSION_CONTENT_DIGEST: commission.contentDigest,
  MMJ_COMMISSION_HANDOFF_RECEIPT_ID: commission.handoffReceiptId,
  MMJ_COMMISSION_SOURCE_WORKBOOK_REVISION: String(commission.sourceWorkbookRevision),
  MMJ_COMMISSION_PUBLICATION_HEAD_REVISION: String(commission.publicationHeadRevision),
  MMJ_COMMISSION_ISSUED_AT: commission.issuedAt,
}
const parsed = readPublicConvergenceEnvironment(env)
assert.equal(parsed.convergenceDigest, digest)
assert.equal(parsed.target.source.commitSha, source.commitSha)
assert.equal(parsed.target.portfolio.deliveryKey, portfolio.deliveryKey)
assert.equal(parsed.target.commission.publicationVersionId, commission.publicationVersionId)

assert.equal(derivePublicConvergenceDigest({ ...target, portfolio: { ...portfolio, issuedAt: '2027-01-01T00:00:00.000Z' }, commission: { ...commission, issuedAt: '2027-01-01T00:00:00.000Z' } }), digest)
assert.notEqual(derivePublicConvergenceDigest({ ...target, source: { ...source, commitSha: '7'.repeat(40) } }), digest)
assert.notEqual(derivePublicConvergenceDigest({ ...target, portfolio: { ...portfolio, generationDigest: '8'.repeat(64) } }), digest)
assert.notEqual(derivePublicConvergenceDigest({ ...target, commission: { ...commission, snapshotDigest: '9'.repeat(64) } }), digest)

const response = value => new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
const currentAuthority = { schemaVersion: 1, contract: 'mmj-public-site-convergence-authority-v1', currentConvergenceKey: key, convergenceRevision: 9, convergenceDigest: digest, target, createdAt: '2026-08-18T13:00:02.000Z' }
const current = await observePublicConvergenceDeploymentAdmission({ input: parsed, origin: 'https://cms.example.test', retryDelaysMs: [0], fetchImpl: async () => response(currentAuthority) })
assert.equal(current.deploy, true)
assert.equal(current.relation, 'current')

const historicalAuthority = { ...currentAuthority, currentConvergenceKey: `pcv_${'a'.repeat(32)}`, convergenceRevision: 10, convergenceDigest: 'b'.repeat(64) }
const historical = await observePublicConvergenceDeploymentAdmission({ input: parsed, origin: 'https://cms.example.test', retryDelaysMs: [0], fetchImpl: async () => response(historicalAuthority) })
assert.equal(historical.deploy, false)
assert.equal(historical.relation, 'historical')
assert.equal(historical.observedCurrentAuthority.convergenceKey, historicalAuthority.currentConvergenceKey)

const unavailable = await observePublicConvergenceDeploymentAdmission({ input: parsed, origin: 'https://cms.example.test', retryDelaysMs: [0, 0], sleep: async () => {}, fetchImpl: async () => { throw new Error('network') } })
assert.equal(unavailable.deploy, false)
assert.equal(unavailable.state, 'undetermined')

console.log('PASS_SINGLE_PUBLIC_CONVERGENCE_AUTHORITY')
console.log('PASS_SITE_CONVERGENCE_DIGEST')
console.log('PASS_OPERATIONAL_ISSUED_AT_EXCLUDED_FROM_IDENTITY')
console.log('PASS_EXACT_SOURCE_PORTFOLIO_COMMISSION_BINDING')
console.log('PASS_CURRENT_CONVERGENCE_PREDEPLOY_ADMISSION')
console.log('PASS_HISTORICAL_CONVERGENCE_WITHHOLD')
console.log('PASS_CONVERGENCE_AUTHORITY_UNAVAILABLE_NO_FAIL_OPEN')
