import { createHash } from 'node:crypto'

function canonicalObject(value) {
  if (Array.isArray(value)) return value.map(canonicalObject)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalObject(value[key])]))
  return value
}
function canonicalDigest(value) {
  return createHash('sha256').update(JSON.stringify(canonicalObject(value))).digest('hex')
}

export const PORTFOLIO_DISPATCH_GENERATION_CONTRACT = 'mmj-portfolio-dispatch-generation-identity-v1'
export const PORTFOLIO_DISPATCH_GENERATION_AUTHORITY_CONTRACT = 'mmj-portfolio-dispatch-generation-authority-v1'

const DELIVERY_KEY = /^pdispatch_v1_[0-9a-f]{64}$/
const COLLECTION_ID = /^pcol_[A-Za-z0-9_-]{8,128}$/
const RECEIPT_ID = /^phnd_[A-Za-z0-9_-]{8,128}$/
const SHA256 = /^[0-9a-f]{64}$/

function integer(value, field, minimum = 0) {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < minimum) throw new Error(`E_MMJ_UI29_DISPATCH_GENERATION_${field.toUpperCase()}_INVALID`)
  return parsed
}

export function readPortfolioDispatchGenerationEnvironment(env = process.env) {
  const schemaVersion = integer(env.MMJ_DISPATCH_SCHEMA_VERSION, 'schema_version', 1)
  if (schemaVersion !== 2) throw new Error('E_MMJ_UI29_DISPATCH_GENERATION_SCHEMA_VERSION_INVALID')
  const deliveryKey = String(env.MMJ_DELIVERY_KEY || '')
  const collectionVersionId = String(env.MMJ_COLLECTION_VERSION_ID || '')
  const snapshotDigest = String(env.MMJ_EXPECTED_SNAPSHOT_DIGEST || '')
  const handoffReceiptId = String(env.MMJ_HANDOFF_RECEIPT_ID || '')
  const generationContract = String(env.MMJ_DISPATCH_GENERATION_CONTRACT || '')
  const generationDigest = String(env.MMJ_DISPATCH_GENERATION_DIGEST || '')
  const issuedAt = String(env.MMJ_ISSUED_AT || '')
  if (!DELIVERY_KEY.test(deliveryKey)) throw new Error('E_MMJ_UI29_DISPATCH_GENERATION_DELIVERY_KEY_INVALID')
  if (!COLLECTION_ID.test(collectionVersionId)) throw new Error('E_MMJ_UI29_DISPATCH_GENERATION_COLLECTION_VERSION_INVALID')
  if (!SHA256.test(snapshotDigest)) throw new Error('E_MMJ_UI29_DISPATCH_GENERATION_SNAPSHOT_DIGEST_INVALID')
  if (!RECEIPT_ID.test(handoffReceiptId)) throw new Error('E_MMJ_UI29_DISPATCH_GENERATION_HANDOFF_RECEIPT_INVALID')
  if (generationContract !== PORTFOLIO_DISPATCH_GENERATION_CONTRACT) throw new Error('E_MMJ_UI29_DISPATCH_GENERATION_CONTRACT_INVALID')
  if (!SHA256.test(generationDigest)) throw new Error('E_MMJ_UI29_DISPATCH_GENERATION_DIGEST_INVALID')
  const parsedIssuedAt = Date.parse(issuedAt)
  if (!Number.isFinite(parsedIssuedAt) || new Date(parsedIssuedAt).toISOString() !== issuedAt) throw new Error('E_MMJ_UI29_DISPATCH_GENERATION_ISSUED_AT_INVALID')
  return Object.freeze({
    schemaVersion,
    deliveryKey,
    generationContract,
    generationDigest,
    collectionVersionId,
    snapshotDigest,
    handoffReceiptId,
    projectCount: integer(env.MMJ_PROJECT_COUNT, 'project_count', 0),
    assetCount: integer(env.MMJ_ASSET_COUNT, 'asset_count', 0),
    sourceWorkbookRevision: integer(env.MMJ_SOURCE_WORKBOOK_REVISION, 'source_workbook_revision', 1),
    collectionHeadRevision: integer(env.MMJ_COLLECTION_HEAD_REVISION, 'collection_head_revision', 1),
    issuedAt,
  })
}

export function portfolioDispatchGenerationIdentity(input) {
  return Object.freeze({
    contract: PORTFOLIO_DISPATCH_GENERATION_CONTRACT,
    deliveryKey: input.deliveryKey,
    collectionVersionId: input.collectionVersionId,
    snapshotDigest: input.snapshotDigest,
    handoffReceiptId: input.handoffReceiptId,
    projectCount: input.projectCount,
    assetCount: input.assetCount,
    sourceWorkbookRevision: input.sourceWorkbookRevision,
    collectionHeadRevision: input.collectionHeadRevision,
  })
}

export function portfolioDispatchGenerationDigest(input) {
  return canonicalDigest(portfolioDispatchGenerationIdentity(input))
}

export function assertPortfolioDispatchGenerationInput(input) {
  const actual = portfolioDispatchGenerationDigest(input)
  if (actual !== input.generationDigest) throw new Error('E_MMJ_UI29_DISPATCH_GENERATION_DIGEST_MISMATCH')
  return input
}

export function assertPortfolioDispatchGenerationAuthority(value, input) {
  if (!value || value.schemaVersion !== 1 || value.contract !== PORTFOLIO_DISPATCH_GENERATION_AUTHORITY_CONTRACT) {
    throw new Error('E_MMJ_UI29_DISPATCH_GENERATION_AUTHORITY_INVALID')
  }
  if (value.relation !== 'current' && value.relation !== 'historical') throw new Error('E_MMJ_UI29_DISPATCH_GENERATION_RELATION_INVALID')
  const generation = value.generation
  const expected = { ...portfolioDispatchGenerationIdentity(input), generationDigest: input.generationDigest, issuedAt: input.issuedAt }
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (String(generation?.[key]) !== String(expectedValue)) throw new Error(`E_MMJ_UI29_DISPATCH_GENERATION_AUTHORITY_MISMATCH:${key}`)
  }
  return Object.freeze({ relation: value.relation, generation: Object.freeze({ ...generation }) })
}
