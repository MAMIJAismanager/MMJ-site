import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { verifyGeneratedArtifactSet } from './mmj-ui29-public-contract.mjs'
import { verifyCommissionGeneratedArtifactSet } from './mmj-ui29-commission-contract.mjs'
import {
  canonicalJson,
  derivePublicConvergenceDigest,
  exactSnapshotFromConvergenceInput,
  assertExactSourceCheckout,
} from './mmj-ui29-public-convergence.mjs'

function mismatch(domain, field, actual, expected) {
  if (String(actual) !== String(expected)) {
    throw new Error(`E_MMJ_PUBLIC_CONVERGENCE_${domain}_SNAPSHOT_MISMATCH:${field}`)
  }
}

export function readCheckedOutSourceCommit(root = process.cwd()) {
  const output = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  return String(output).trim().toLowerCase()
}

export function verifyCheckedOutSourceSnapshot(input, root = process.cwd()) {
  const actual = readCheckedOutSourceCommit(root)
  assertExactSourceCheckout(input.target.source.commitSha, actual)
  return Object.freeze({ ...input.target.source, commitSha: actual })
}

export function exactSnapshotFromVerifiedArtifacts(input, source, portfolioArtifacts, commissionArtifacts) {
  const expected = exactSnapshotFromConvergenceInput(input)
  assertExactSourceCheckout(input.target.source.commitSha, source.commitSha)

  const pReceipt = portfolioArtifacts.receipt
  const pLock = portfolioArtifacts.lock
  const pActual = {
    deliveryKey: pLock.deliveryKey,
    generationContract: pLock.generationContract,
    generationDigest: pLock.generationDigest,
    collectionVersionId: pReceipt.collectionVersionId,
    snapshotDigest: portfolioArtifacts.snapshotDigest,
    handoffReceiptId: pReceipt.receiptId,
    projectCount: pReceipt.projectCount,
    assetCount: pReceipt.assetCount,
    sourceWorkbookRevision: pLock.sourceWorkbookRevision,
    collectionHeadRevision: pLock.collectionHeadRevision,
    issuedAt: input.target.portfolio.issuedAt,
  }
  for (const field of [
    'deliveryKey', 'generationContract', 'generationDigest', 'collectionVersionId', 'snapshotDigest',
    'handoffReceiptId', 'projectCount', 'assetCount', 'sourceWorkbookRevision', 'collectionHeadRevision',
  ]) mismatch('PORTFOLIO', field, pActual[field], input.target.portfolio[field])

  const cReceipt = commissionArtifacts.receipt
  const cLock = commissionArtifacts.lock
  const cActual = {
    guideId: cReceipt.guideId,
    publicationVersionId: cReceipt.publicationVersionId,
    snapshotDigest: commissionArtifacts.snapshotDigest,
    contentDigest: commissionArtifacts.contentDigest,
    handoffReceiptId: cReceipt.receiptId,
    sourceWorkbookRevision: cReceipt.sourceWorkbookRevision,
    publicationHeadRevision: cReceipt.publicationHeadRevision,
    issuedAt: input.target.commission.issuedAt,
  }
  for (const field of [
    'guideId', 'publicationVersionId', 'snapshotDigest', 'contentDigest', 'handoffReceiptId',
    'sourceWorkbookRevision', 'publicationHeadRevision',
  ]) mismatch('COMMISSION', field, cActual[field], input.target.commission[field])
  mismatch('COMMISSION', 'buildLock.publicationVersionId', cLock.publicationVersionId, cActual.publicationVersionId)
  mismatch('COMMISSION', 'buildLock.snapshotDigest', cLock.snapshotDigest, cActual.snapshotDigest)
  mismatch('COMMISSION', 'buildLock.contentDigest', cLock.contentDigest, cActual.contentDigest)
  mismatch('COMMISSION', 'buildLock.handoffReceiptId', cLock.handoffReceiptId, cActual.handoffReceiptId)

  const actualTarget = Object.freeze({ source: Object.freeze({ ...source }), portfolio: Object.freeze(pActual), commission: Object.freeze(cActual) })
  const actualDigest = derivePublicConvergenceDigest(actualTarget)
  if (actualDigest !== expected.snapshotDigest) throw new Error('E_MMJ_PUBLIC_CONVERGENCE_ADOPTED_SNAPSHOT_MISMATCH')
  if (canonicalJson(actualTarget) !== canonicalJson(expected.target)) throw new Error('E_MMJ_PUBLIC_CONVERGENCE_ADOPTED_SNAPSHOT_MISMATCH:target')

  return Object.freeze({
    snapshot: Object.freeze({ ...expected, target: actualTarget }),
    evidence: Object.freeze({
      sourceCommitSha: source.commitSha,
      portfolioBuildInputLockDigest: portfolioArtifacts.buildInputLockDigest,
      portfolioSnapshotRawDigest: portfolioArtifacts.snapshotDigest,
      portfolioHandoffReceiptDigest: portfolioArtifacts.handoffReceiptDigest,
      commissionBuildInputLockDigest: commissionArtifacts.buildInputLockDigest,
      commissionSnapshotRawDigest: commissionArtifacts.snapshotDigest,
      commissionHandoffReceiptDigest: commissionArtifacts.handoffReceiptDigest,
    }),
  })
}

export async function reconstructAdoptedPublicConvergenceSnapshot(input, options = {}) {
  const root = resolve(options.root ?? process.cwd())
  const generated = resolve(root, options.generatedDirectory ?? 'generated')
  const source = verifyCheckedOutSourceSnapshot(input, root)
  const [portfolioArtifacts, commissionArtifacts] = await Promise.all([
    verifyGeneratedArtifactSet(generated, root),
    verifyCommissionGeneratedArtifactSet(generated, root),
  ])
  return exactSnapshotFromVerifiedArtifacts(input, source, portfolioArtifacts, commissionArtifacts)
}
