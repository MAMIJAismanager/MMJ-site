import { createHash } from 'node:crypto'

export const PUBLIC_CONVERGENCE_TARGET_CONTRACT = 'mmj-public-site-convergence-target-v1'
export const PUBLIC_CONVERGENCE_GENERATION_CONTRACT = 'mmj-public-site-convergence-generation-v1'
export const PUBLIC_CONVERGENCE_AUTHORITY_CONTRACT = 'mmj-public-site-convergence-authority-v1'
export const PUBLIC_CONVERGENCE_EXACT_SNAPSHOT_CONTRACT = 'mmj-public-convergence-exact-snapshot-v1'

const SHA40 = /^[0-9a-f]{40}$/
const SHA64 = /^[0-9a-f]{64}$/
const KEY = /^pcv_[0-9a-f]{32}$/
const PORTFOLIO_DELIVERY = /^pdispatch_v1_[0-9a-f]{64}$/
const PORTFOLIO_COLLECTION = /^pcol_[A-Za-z0-9_-]{8,128}$/
const PORTFOLIO_RECEIPT = /^phnd_[A-Za-z0-9_-]{8,128}$/
const COMMISSION_VERSION = /^cgv_[A-Za-z0-9_-]{8,128}$/
const COMMISSION_RECEIPT = /^cgh_[A-Za-z0-9_-]{8,128}$/

function canonicalObject(value) {
  if (Array.isArray(value)) return value.map(canonicalObject)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalObject(value[key])]))
  return value
}
export function canonicalJson(value) { return JSON.stringify(canonicalObject(value)) }
export function canonicalDigest(value) { return createHash('sha256').update(canonicalJson(value)).digest('hex') }

function required(env, name) {
  const value = String(env[name] ?? '')
  if (!value) throw new Error(`E_MMJ_PUBLIC_CONVERGENCE_ENV_MISSING:${name}`)
  return value
}
function integer(env, name, min = 0) {
  const value = Number(required(env, name))
  if (!Number.isSafeInteger(value) || value < min) throw new Error(`E_MMJ_PUBLIC_CONVERGENCE_ENV_INVALID:${name}`)
  return value
}
function pattern(value, re, field) {
  if (!re.test(value)) throw new Error(`E_MMJ_PUBLIC_CONVERGENCE_ENV_INVALID:${field}`)
  return value
}
function iso(value, field) {
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) throw new Error(`E_MMJ_PUBLIC_CONVERGENCE_ENV_INVALID:${field}`)
  return value
}

export function convergenceIdentityMaterial(target) {
  return Object.freeze({
    contract: PUBLIC_CONVERGENCE_TARGET_CONTRACT,
    source: Object.freeze({ ...target.source }),
    portfolio: Object.freeze({
      deliveryKey: target.portfolio.deliveryKey,
      generationContract: target.portfolio.generationContract,
      generationDigest: target.portfolio.generationDigest,
      collectionVersionId: target.portfolio.collectionVersionId,
      snapshotDigest: target.portfolio.snapshotDigest,
      handoffReceiptId: target.portfolio.handoffReceiptId,
      projectCount: target.portfolio.projectCount,
      assetCount: target.portfolio.assetCount,
      sourceWorkbookRevision: target.portfolio.sourceWorkbookRevision,
      collectionHeadRevision: target.portfolio.collectionHeadRevision,
    }),
    commission: Object.freeze({
      guideId: target.commission.guideId,
      publicationVersionId: target.commission.publicationVersionId,
      snapshotDigest: target.commission.snapshotDigest,
      contentDigest: target.commission.contentDigest,
      handoffReceiptId: target.commission.handoffReceiptId,
      sourceWorkbookRevision: target.commission.sourceWorkbookRevision,
      publicationHeadRevision: target.commission.publicationHeadRevision,
    }),
  })
}

export function derivePublicConvergenceDigest(target) {
  return canonicalDigest(convergenceIdentityMaterial(target))
}

export function derivePublicConvergenceDeliveryIdentity(input) {
  const digest = canonicalDigest({
    contract: 'mmj-public-convergence-delivery-identity-v1',
    eventType: 'mmj_public_converge',
    repository: input.repository,
    convergenceKey: input.convergenceKey,
    convergenceRevision: input.convergenceRevision,
    convergenceDigest: input.convergenceDigest,
  })
  return `pcdi_v1_${digest}`
}

export function readPublicConvergenceEnvironment(env = process.env) {
  const convergenceKey = pattern(required(env, 'MMJ_PUBLIC_CONVERGENCE_KEY'), KEY, 'convergenceKey')
  const convergenceRevision = integer(env, 'MMJ_PUBLIC_CONVERGENCE_REVISION', 1)
  const convergenceDigest = pattern(required(env, 'MMJ_PUBLIC_CONVERGENCE_DIGEST'), SHA64, 'convergenceDigest')
  const snapshotContract = required(env, 'MMJ_PUBLIC_CONVERGENCE_SNAPSHOT_CONTRACT')
  const snapshotDigest = pattern(required(env, 'MMJ_PUBLIC_CONVERGENCE_SNAPSHOT_DIGEST'), SHA64, 'snapshotDigest')
  if (snapshotContract !== PUBLIC_CONVERGENCE_EXACT_SNAPSHOT_CONTRACT) throw new Error('E_MMJ_PUBLIC_CONVERGENCE_SNAPSHOT_CONTRACT_INVALID')
  if (snapshotDigest !== convergenceDigest) throw new Error('E_MMJ_PUBLIC_CONVERGENCE_SNAPSHOT_DIGEST_MISMATCH')
  const issuedAt = iso(required(env, 'MMJ_PUBLIC_CONVERGENCE_ISSUED_AT'), 'issuedAt')

  const source = Object.freeze({
    repository: required(env, 'MMJ_PUBLIC_SOURCE_REPOSITORY'),
    ref: required(env, 'MMJ_PUBLIC_SOURCE_REF'),
    commitSha: pattern(required(env, 'MMJ_PUBLIC_SOURCE_COMMIT_SHA'), SHA40, 'source.commitSha'),
  })
  if (source.repository !== 'MAMIJAismanager/MMJ-site' || source.ref !== 'refs/heads/main') throw new Error('E_MMJ_PUBLIC_CONVERGENCE_SOURCE_IDENTITY_INVALID')

  const portfolio = Object.freeze({
    deliveryKey: pattern(required(env, 'MMJ_DELIVERY_KEY'), PORTFOLIO_DELIVERY, 'portfolio.deliveryKey'),
    generationContract: required(env, 'MMJ_DISPATCH_GENERATION_CONTRACT'),
    generationDigest: pattern(required(env, 'MMJ_DISPATCH_GENERATION_DIGEST'), SHA64, 'portfolio.generationDigest'),
    collectionVersionId: pattern(required(env, 'MMJ_COLLECTION_VERSION_ID'), PORTFOLIO_COLLECTION, 'portfolio.collectionVersionId'),
    snapshotDigest: pattern(required(env, 'MMJ_EXPECTED_SNAPSHOT_DIGEST'), SHA64, 'portfolio.snapshotDigest'),
    handoffReceiptId: pattern(required(env, 'MMJ_HANDOFF_RECEIPT_ID'), PORTFOLIO_RECEIPT, 'portfolio.handoffReceiptId'),
    projectCount: integer(env, 'MMJ_PROJECT_COUNT', 0),
    assetCount: integer(env, 'MMJ_ASSET_COUNT', 0),
    sourceWorkbookRevision: integer(env, 'MMJ_SOURCE_WORKBOOK_REVISION', 1),
    collectionHeadRevision: integer(env, 'MMJ_COLLECTION_HEAD_REVISION', 1),
    issuedAt: iso(required(env, 'MMJ_ISSUED_AT'), 'portfolio.issuedAt'),
  })
  if (portfolio.generationContract !== 'mmj-portfolio-dispatch-generation-identity-v1') throw new Error('E_MMJ_PUBLIC_CONVERGENCE_PORTFOLIO_CONTRACT_INVALID')

  const commission = Object.freeze({
    guideId: required(env, 'MMJ_COMMISSION_GUIDE_ID'),
    publicationVersionId: pattern(required(env, 'MMJ_COMMISSION_PUBLICATION_VERSION_ID'), COMMISSION_VERSION, 'commission.publicationVersionId'),
    snapshotDigest: pattern(required(env, 'MMJ_COMMISSION_EXPECTED_SNAPSHOT_DIGEST'), SHA64, 'commission.snapshotDigest'),
    contentDigest: pattern(required(env, 'MMJ_COMMISSION_CONTENT_DIGEST'), SHA64, 'commission.contentDigest'),
    handoffReceiptId: pattern(required(env, 'MMJ_COMMISSION_HANDOFF_RECEIPT_ID'), COMMISSION_RECEIPT, 'commission.handoffReceiptId'),
    sourceWorkbookRevision: integer(env, 'MMJ_COMMISSION_SOURCE_WORKBOOK_REVISION', 1),
    publicationHeadRevision: integer(env, 'MMJ_COMMISSION_PUBLICATION_HEAD_REVISION', 0),
    issuedAt: iso(required(env, 'MMJ_COMMISSION_ISSUED_AT'), 'commission.issuedAt'),
  })
  if (commission.guideId !== 'default') throw new Error('E_MMJ_PUBLIC_CONVERGENCE_COMMISSION_GUIDE_INVALID')

  const target = Object.freeze({ source, portfolio, commission })
  const actual = derivePublicConvergenceDigest(target)
  if (actual !== convergenceDigest) throw new Error('E_MMJ_PUBLIC_CONVERGENCE_DIGEST_MISMATCH')
  return Object.freeze({ schemaVersion: 1, convergenceKey, convergenceRevision, convergenceDigest, snapshotContract, snapshotDigest, target, issuedAt })
}

export function exactSnapshotFromConvergenceInput(input) {
  if (input.snapshotContract !== PUBLIC_CONVERGENCE_EXACT_SNAPSHOT_CONTRACT) throw new Error('E_MMJ_PUBLIC_CONVERGENCE_SNAPSHOT_CONTRACT_INVALID')
  if (input.snapshotDigest !== input.convergenceDigest) throw new Error('E_MMJ_PUBLIC_CONVERGENCE_SNAPSHOT_DIGEST_MISMATCH')
  const actual = derivePublicConvergenceDigest(input.target)
  if (actual !== input.snapshotDigest) throw new Error('E_MMJ_PUBLIC_CONVERGENCE_SNAPSHOT_TARGET_MISMATCH')
  return Object.freeze({
    schemaVersion: 1,
    contract: PUBLIC_CONVERGENCE_EXACT_SNAPSHOT_CONTRACT,
    convergenceKey: input.convergenceKey,
    convergenceRevision: input.convergenceRevision,
    snapshotDigest: input.snapshotDigest,
    target: input.target,
    issuedAt: input.issuedAt,
  })
}

export function assertExactSourceCheckout(expectedCommitSha, actualCommitSha) {
  if (String(actualCommitSha).trim().toLowerCase() !== String(expectedCommitSha).trim().toLowerCase()) throw new Error('E_MMJ_PUBLIC_CONVERGENCE_SOURCE_SNAPSHOT_MISMATCH')
  return String(actualCommitSha).trim().toLowerCase()
}

export function assertPublicConvergenceGeneration(value, input) {
  if (!value || value.schemaVersion !== 1 || value.contract !== PUBLIC_CONVERGENCE_GENERATION_CONTRACT) throw new Error('E_MMJ_PUBLIC_CONVERGENCE_GENERATION_INVALID')
  if (!['current', 'historical'].includes(value.relation)) throw new Error('E_MMJ_PUBLIC_CONVERGENCE_RELATION_INVALID')
  const generation = value.generation
  const checks = [
    ['convergenceKey', generation?.convergenceKey, input.convergenceKey],
    ['convergenceRevision', generation?.convergenceRevision, input.convergenceRevision],
    ['convergenceDigest', generation?.convergenceDigest, input.convergenceDigest],
    ['issuedAt', generation?.issuedAt, input.issuedAt],
  ]
  for (const [field, actual, expected] of checks) if (String(actual) !== String(expected)) throw new Error(`E_MMJ_PUBLIC_CONVERGENCE_GENERATION_MISMATCH:${field}`)
  if (canonicalJson(generation?.target) !== canonicalJson(input.target)) throw new Error('E_MMJ_PUBLIC_CONVERGENCE_GENERATION_MISMATCH:target')
  const snapshot = value.snapshot
  if (!snapshot || snapshot.schemaVersion !== 1 || snapshot.contract !== PUBLIC_CONVERGENCE_EXACT_SNAPSHOT_CONTRACT) throw new Error('E_MMJ_PUBLIC_CONVERGENCE_SNAPSHOT_CONTRACT_INVALID')
  const snapshotChecks = [
    ['convergenceKey', snapshot.convergenceKey, input.convergenceKey],
    ['convergenceRevision', snapshot.convergenceRevision, input.convergenceRevision],
    ['snapshotDigest', snapshot.snapshotDigest, input.snapshotDigest],
    ['issuedAt', snapshot.issuedAt, input.issuedAt],
  ]
  for (const [field, actual, expected] of snapshotChecks) if (String(actual) !== String(expected)) throw new Error(`E_MMJ_PUBLIC_CONVERGENCE_SNAPSHOT_MISMATCH:${field}`)
  if (canonicalJson(snapshot.target) !== canonicalJson(input.target)) throw new Error('E_MMJ_PUBLIC_CONVERGENCE_SNAPSHOT_MISMATCH:target')
  if (derivePublicConvergenceDigest(snapshot.target) !== snapshot.snapshotDigest) throw new Error('E_MMJ_PUBLIC_CONVERGENCE_SNAPSHOT_TARGET_MISMATCH')
  return Object.freeze({ relation: value.relation, generation: Object.freeze({ ...generation }), snapshot: Object.freeze({ ...snapshot }) })
}

export function assertPublicConvergenceAuthority(value) {
  if (!value || value.schemaVersion !== 1 || value.contract !== PUBLIC_CONVERGENCE_AUTHORITY_CONTRACT) throw new Error('E_MMJ_PUBLIC_CONVERGENCE_AUTHORITY_INVALID')
  pattern(String(value.currentConvergenceKey ?? ''), KEY, 'authority.currentConvergenceKey')
  pattern(String(value.convergenceDigest ?? ''), SHA64, 'authority.convergenceDigest')
  const revision = Number(value.convergenceRevision)
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('E_MMJ_PUBLIC_CONVERGENCE_AUTHORITY_INVALID:revision')
  return Object.freeze({ ...value })
}
