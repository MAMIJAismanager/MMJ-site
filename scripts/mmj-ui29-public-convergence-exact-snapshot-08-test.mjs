import assert from 'node:assert/strict'
import {
  assertExactSourceCheckout,
  assertPublicConvergenceGeneration,
  derivePublicConvergenceDigest,
  exactSnapshotFromConvergenceInput,
  readPublicConvergenceEnvironment,
} from './lib/mmj-ui29-public-convergence.mjs'
import { exactSnapshotFromVerifiedArtifacts } from './lib/mmj-ui29-public-convergence-exact-snapshot.mjs'

const repository = 'MAMIJAismanager/MMJ-site'
const source = { repository, ref: 'refs/heads/main', commitSha: '1'.repeat(40) }
const portfolio = {
  deliveryKey: `pdispatch_v1_${'2'.repeat(64)}`,
  generationContract: 'mmj-portfolio-dispatch-generation-identity-v1',
  generationDigest: '3'.repeat(64),
  collectionVersionId: 'pcol_exactsnapshot08', snapshotDigest: '4'.repeat(64), handoffReceiptId: 'phnd_exactsnapshot08',
  projectCount: 2, assetCount: 3, sourceWorkbookRevision: 10, collectionHeadRevision: 11,
  issuedAt: '2026-08-22T05:30:00.000Z',
}
const commission = {
  guideId: 'default', publicationVersionId: 'cgv_exactsnapshot08', snapshotDigest: '5'.repeat(64), contentDigest: '6'.repeat(64),
  handoffReceiptId: 'cgh_exactsnapshot08', sourceWorkbookRevision: 12, publicationHeadRevision: 13,
  issuedAt: '2026-08-22T05:30:01.000Z',
}
const target = { source, portfolio, commission }
const digest = derivePublicConvergenceDigest(target)
const input = {
  schemaVersion: 1,
  convergenceKey: `pcv_${digest.slice(0, 32)}`,
  convergenceRevision: 8,
  convergenceDigest: digest,
  snapshotContract: 'mmj-public-convergence-exact-snapshot-v1',
  snapshotDigest: digest,
  target,
  issuedAt: '2026-08-22T05:30:02.000Z',
}

const snapshot = exactSnapshotFromConvergenceInput(input)
assert.equal(snapshot.snapshotDigest, digest)
assert.deepEqual(snapshot.target, target)
console.log('PASS_08_PUBLIC_EXACT_SNAPSHOT_CONTRACT')

const env = {
  MMJ_PUBLIC_CONVERGENCE_KEY: input.convergenceKey,
  MMJ_PUBLIC_CONVERGENCE_REVISION: String(input.convergenceRevision),
  MMJ_PUBLIC_CONVERGENCE_DIGEST: digest,
  MMJ_PUBLIC_CONVERGENCE_SNAPSHOT_CONTRACT: input.snapshotContract,
  MMJ_PUBLIC_CONVERGENCE_SNAPSHOT_DIGEST: digest,
  MMJ_PUBLIC_CONVERGENCE_ISSUED_AT: input.issuedAt,
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
assert.equal(parsed.snapshotDigest, digest)
assert.throws(() => readPublicConvergenceEnvironment({ ...env, MMJ_PUBLIC_CONVERGENCE_SNAPSHOT_DIGEST: 'f'.repeat(64) }), /SNAPSHOT_DIGEST_MISMATCH/)
console.log('PASS_08_PUBLIC_SNAPSHOT_ENV_STRICT')

const generationEnvelope = {
  schemaVersion: 1,
  contract: 'mmj-public-site-convergence-generation-v1',
  relation: 'current',
  generation: { convergenceKey: input.convergenceKey, convergenceRevision: 8, convergenceDigest: digest, target, issuedAt: input.issuedAt },
  snapshot,
}
const admitted = assertPublicConvergenceGeneration(generationEnvelope, input)
assert.equal(admitted.snapshot.snapshotDigest, digest)
console.log('PASS_08_PUBLIC_GENERATION_SNAPSHOT_PARITY')

const portfolioArtifacts = {
  receipt: { collectionVersionId: portfolio.collectionVersionId, receiptId: portfolio.handoffReceiptId, projectCount: portfolio.projectCount, assetCount: portfolio.assetCount },
  lock: { deliveryKey: portfolio.deliveryKey, generationContract: portfolio.generationContract, generationDigest: portfolio.generationDigest, sourceWorkbookRevision: portfolio.sourceWorkbookRevision, collectionHeadRevision: portfolio.collectionHeadRevision },
  snapshotDigest: portfolio.snapshotDigest,
  buildInputLockDigest: '7'.repeat(64), handoffReceiptDigest: '8'.repeat(64),
}
const commissionArtifacts = {
  receipt: { guideId: commission.guideId, publicationVersionId: commission.publicationVersionId, receiptId: commission.handoffReceiptId, sourceWorkbookRevision: commission.sourceWorkbookRevision, publicationHeadRevision: commission.publicationHeadRevision },
  lock: { publicationVersionId: commission.publicationVersionId, snapshotDigest: commission.snapshotDigest, contentDigest: commission.contentDigest, handoffReceiptId: commission.handoffReceiptId },
  snapshotDigest: commission.snapshotDigest, contentDigest: commission.contentDigest,
  buildInputLockDigest: '9'.repeat(64), handoffReceiptDigest: 'a'.repeat(64),
}
const reconstructed = exactSnapshotFromVerifiedArtifacts(input, source, portfolioArtifacts, commissionArtifacts)
assert.equal(reconstructed.snapshot.snapshotDigest, digest)
assert.deepEqual(reconstructed.snapshot.target, target)
assert.equal(reconstructed.evidence.sourceCommitSha, source.commitSha)
console.log('PASS_08_PUBLIC_ADOPTED_TARGET_RECONSTRUCTION')

assert.throws(() => exactSnapshotFromVerifiedArtifacts(input, source, { ...portfolioArtifacts, snapshotDigest: 'b'.repeat(64) }, commissionArtifacts), /PORTFOLIO_SNAPSHOT_MISMATCH/)
assert.throws(() => assertExactSourceCheckout(source.commitSha, 'c'.repeat(40)), /SOURCE_SNAPSHOT_MISMATCH/)
console.log('PASS_08_PUBLIC_ADOPTED_MISMATCH_FAILS_CLOSED')

const transportOnly = { ...input, attemptId: 'attempt-other', githubRunId: 99 }
assert.equal(exactSnapshotFromConvergenceInput(transportOnly).snapshotDigest, digest)
console.log('PASS_08_PUBLIC_TRANSPORT_METADATA_DOES_NOT_CHANGE_SNAPSHOT')
