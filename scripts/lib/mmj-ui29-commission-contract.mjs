import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export const COMMISSION_HEAD_CONTRACT = 'mmj-public-commission-guide-head-v1'
export const COMMISSION_SNAPSHOT_CONTRACT = 'mmj-public-commission-guide-v1'
export const COMMISSION_RECEIPT_CONTRACT = 'mmj-static-commission-guide-handoff-receipt-v1'
export const COMMISSION_BUILD_LOCK_CONTRACT = 'mmj-ui29-commission-guide-build-input-lock-v1'
export const PUBLIC_RELEASE_V2_CONTRACT = 'mmj-ui29-public-release-manifest-v2'

const SHA256 = /^[a-f0-9]{64}$/
const VERSION_ID = /^cgv_[a-f0-9]{28}$/
const RECEIPT_ID = /^cgh_[a-f0-9]{26}$/
const DELIVERY_KEY = /^cgdispatch_v1_[a-f0-9]{64}$/

export class CommissionContractError extends Error {
  constructor(code, message, details = {}) {
    super(`${code}: ${message}`)
    this.name = 'CommissionContractError'
    this.code = code
    this.details = Object.freeze({ ...details })
  }
}

export function fail(code, message, details = {}) {
  throw new CommissionContractError(code, message, details)
}

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function normalize(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(normalize)
  if (value && typeof value === 'object') {
    const output = {}
    for (const key of Object.keys(value).sort()) output[key] = normalize(value[key])
    return output
  }
  fail('E_MMJ_COMMISSION_GENERATED_STAGE_INVALID', 'Unsupported canonical JSON value.')
}

export function canonicalJson(value) {
  return JSON.stringify(normalize(value))
}

export function canonicalDigest(value) {
  return sha256(Buffer.from(canonicalJson(value), 'utf8'))
}

export function prettyJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

function plain(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function exactKeys(value, keys, pointer, code) {
  if (!plain(value)) fail(code, `Expected object at ${pointer}.`)
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  if (actual.join('\0') !== expected.join('\0')) fail(code, `Unexpected object keys at ${pointer}.`, { actual, expected })
}

function text(value, pointer, code, pattern = null) {
  if (typeof value !== 'string' || value.length === 0) fail(code, `Expected non-empty string at ${pointer}.`)
  if (pattern && !pattern.test(value)) fail(code, `String format is invalid at ${pointer}.`, { value })
  return value
}

function integer(value, pointer, code, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) fail(code, `Expected safe integer >= ${minimum} at ${pointer}.`, { value })
  return value
}

function iso(value, pointer, code) {
  text(value, pointer, code)
  if (!Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) fail(code, `Expected canonical ISO timestamp at ${pointer}.`, { value })
  return value
}

export function validateCommissionHead(value) {
  const code = 'E_MMJ_COMMISSION_HEAD_INVALID'
  exactKeys(value, [
    'schemaVersion', 'contract', 'guideId', 'publicationVersionId', 'snapshotDigest',
    'contentDigest', 'handoffReceiptId', 'sourceWorkbookRevision',
    'publicationHeadRevision', 'publishedAt', 'producerRelease',
  ], '$commissionHead', code)
  if (value.schemaVersion !== 1 || value.contract !== COMMISSION_HEAD_CONTRACT || value.guideId !== 'default') fail(code, 'Commission head contract mismatch.')
  text(value.publicationVersionId, '$commissionHead.publicationVersionId', code, VERSION_ID)
  text(value.snapshotDigest, '$commissionHead.snapshotDigest', code, SHA256)
  text(value.contentDigest, '$commissionHead.contentDigest', code, SHA256)
  text(value.handoffReceiptId, '$commissionHead.handoffReceiptId', code, RECEIPT_ID)
  integer(value.sourceWorkbookRevision, '$commissionHead.sourceWorkbookRevision', code, 1)
  integer(value.publicationHeadRevision, '$commissionHead.publicationHeadRevision', code, 0)
  iso(value.publishedAt, '$commissionHead.publishedAt', code)
  text(value.producerRelease, '$commissionHead.producerRelease', code)
  return Object.freeze({ ...value })
}

export function validateCommissionReceipt(value, head = null) {
  const code = 'E_MMJ_COMMISSION_RECEIPT_INVALID'
  exactKeys(value, [
    'schemaVersion', 'contract', 'receiptId', 'guideId', 'publicationVersionId',
    'snapshotDigest', 'contentDigest', 'sourceWorkbookRevision',
    'publicationHeadRevision', 'route', 'previousPublicationVersionId',
    'producerRelease', 'createdAt',
  ], '$commissionReceipt', code)
  if (value.schemaVersion !== 1 || value.contract !== COMMISSION_RECEIPT_CONTRACT || value.guideId !== 'default' || value.route !== '/about') fail(code, 'Commission receipt contract mismatch.')
  text(value.receiptId, '$commissionReceipt.receiptId', code, RECEIPT_ID)
  text(value.publicationVersionId, '$commissionReceipt.publicationVersionId', code, VERSION_ID)
  text(value.snapshotDigest, '$commissionReceipt.snapshotDigest', code, SHA256)
  text(value.contentDigest, '$commissionReceipt.contentDigest', code, SHA256)
  integer(value.sourceWorkbookRevision, '$commissionReceipt.sourceWorkbookRevision', code, 1)
  integer(value.publicationHeadRevision, '$commissionReceipt.publicationHeadRevision', code, 0)
  if (value.previousPublicationVersionId !== null) text(value.previousPublicationVersionId, '$commissionReceipt.previousPublicationVersionId', code, VERSION_ID)
  text(value.producerRelease, '$commissionReceipt.producerRelease', code)
  iso(value.createdAt, '$commissionReceipt.createdAt', code)
  if (head) {
    for (const field of ['guideId', 'publicationVersionId', 'snapshotDigest', 'contentDigest', 'sourceWorkbookRevision', 'publicationHeadRevision']) {
      if (value[field] !== head[field]) fail('E_MMJ_COMMISSION_RECEIPT_HEAD_MISMATCH', `Commission receipt differs from head at ${field}.`)
    }
    if (value.receiptId !== head.handoffReceiptId) fail('E_MMJ_COMMISSION_RECEIPT_HEAD_MISMATCH', 'Commission receipt identity differs from head.')
  }
  return Object.freeze({ ...value })
}

export function validateCommissionSnapshot(value, expected = null) {
  const code = 'E_MMJ_COMMISSION_SNAPSHOT_INVALID'
  exactKeys(value, [
    'schemaVersion', 'contract', 'publicationVersionId', 'versionNumber',
    'sourceWorkbookRevision', 'sourceDraftDigest', 'publishedAt', 'content',
  ], '$commissionSnapshot', code)
  if (value.schemaVersion !== 1 || value.contract !== COMMISSION_SNAPSHOT_CONTRACT) fail(code, 'Commission snapshot contract mismatch.')
  text(value.publicationVersionId, '$commissionSnapshot.publicationVersionId', code, VERSION_ID)
  integer(value.versionNumber, '$commissionSnapshot.versionNumber', code, 1)
  integer(value.sourceWorkbookRevision, '$commissionSnapshot.sourceWorkbookRevision', code, 1)
  text(value.sourceDraftDigest, '$commissionSnapshot.sourceDraftDigest', code, SHA256)
  iso(value.publishedAt, '$commissionSnapshot.publishedAt', code)
  if (!plain(value.content) || value.content.schemaVersion !== 10) fail(code, 'Commission content schemaVersion must equal 10.')
  for (const field of ['eyebrow', 'title', 'lead', 'seoTitle', 'seoDescription', 'sectionHeading', 'commonNoticeHeading', 'worksLinkLabel', 'contactLinkLabel']) {
    text(value.content[field], `$commissionSnapshot.content.${field}`, code)
  }
  if (!Array.isArray(value.content.services) || !Array.isArray(value.content.terms)) fail(code, 'Commission services and terms must be arrays.')
  const serviceIds = new Set()
  for (const [index, service] of value.content.services.entries()) {
    if (!plain(service)) fail(code, `Commission service ${index} is invalid.`)
    text(service.id, `$commissionSnapshot.content.services[${index}].id`, code)
    if (serviceIds.has(service.id)) fail(code, 'Commission service ids must be unique.', { serviceId: service.id })
    serviceIds.add(service.id)
  }
  if (expected) {
    if (value.publicationVersionId !== expected.publicationVersionId) fail('E_MMJ_COMMISSION_SNAPSHOT_HEAD_MISMATCH', 'Commission snapshot publication version differs from head.')
    if (value.sourceWorkbookRevision !== expected.sourceWorkbookRevision) fail('E_MMJ_COMMISSION_SNAPSHOT_HEAD_MISMATCH', 'Commission snapshot source workbook revision differs from head.')
  }
  return Object.freeze({ snapshot: value, contentDigest: canonicalDigest(value.content) })
}

export function validateCommissionDispatchInput(value) {
  const code = 'E_MMJ_COMMISSION_DISPATCH_PAYLOAD_INVALID'
  exactKeys(value, [
    'schemaVersion', 'contentKind', 'deliveryKey', 'guideId', 'publicationVersionId',
    'snapshotDigest', 'handoffReceiptId', 'sourceWorkbookRevision',
    'publicationHeadRevision', 'issuedAt',
  ], '$commissionDispatch', code)
  if (value.schemaVersion !== 1 || value.contentKind !== 'commission-guide' || value.guideId !== 'default') fail(code, 'Commission dispatch contract mismatch.')
  text(value.deliveryKey, '$commissionDispatch.deliveryKey', code, DELIVERY_KEY)
  text(value.publicationVersionId, '$commissionDispatch.publicationVersionId', code, VERSION_ID)
  text(value.snapshotDigest, '$commissionDispatch.snapshotDigest', code, SHA256)
  text(value.handoffReceiptId, '$commissionDispatch.handoffReceiptId', code, RECEIPT_ID)
  integer(value.sourceWorkbookRevision, '$commissionDispatch.sourceWorkbookRevision', code, 1)
  integer(value.publicationHeadRevision, '$commissionDispatch.publicationHeadRevision', code, 0)
  iso(value.issuedAt, '$commissionDispatch.issuedAt', code)
  return Object.freeze({ ...value })
}

export function createCommissionBuildInputLock(input) {
  return Object.freeze({
    schemaVersion: 1,
    contract: COMMISSION_BUILD_LOCK_CONTRACT,
    upstreamOrigin: input.upstreamOrigin,
    guideId: input.head.guideId,
    publicationVersionId: input.head.publicationVersionId,
    snapshotDigest: input.head.snapshotDigest,
    contentDigest: input.head.contentDigest,
    handoffReceiptId: input.head.handoffReceiptId,
    handoffReceiptDigest: input.handoffReceiptDigest,
    sourceWorkbookRevision: input.head.sourceWorkbookRevision,
    publicationHeadRevision: input.head.publicationHeadRevision,
    producerRelease: input.head.producerRelease,
    adoptedAt: input.receipt.createdAt,
  })
}

export function createAggregatePublicReleaseManifest(input) {
  const releaseDigest = sha256(Buffer.from([
    input.portfolio.snapshotDigest,
    input.portfolio.routesDigest,
    input.portfolio.handoffReceiptDigest,
    input.commissionGuide.snapshotDigest,
    input.commissionGuide.handoffReceiptDigest,
    input.producerRevision,
  ].join('\n'), 'utf8'))
  return Object.freeze({
    schemaVersion: 2,
    contract: PUBLIC_RELEASE_V2_CONTRACT,
    releaseId: `rel_${releaseDigest.slice(0, 26)}`,
    producerRevision: input.producerRevision,
    generatedAt: input.generatedAt,
    portfolio: Object.freeze({ ...input.portfolio }),
    commissionGuide: Object.freeze({ ...input.commissionGuide }),
  })
}

export async function verifyCommissionGeneratedArtifactSet(directory, sourceRoot) {
  const [snapshotBytes, receiptBytes, lockBytes, releaseBytes] = await Promise.all([
    readFile(resolve(directory, 'commission-guide.snapshot.json')),
    readFile(resolve(directory, 'commission-guide.handoff.json')),
    readFile(resolve(directory, 'commission-guide.build-input-lock.json')),
    readFile(resolve(directory, 'public-release.manifest.json')),
  ])
  const parse = (bytes, label) => {
    try { return JSON.parse(bytes.toString('utf8')) } catch { fail('E_MMJ_COMMISSION_GENERATED_STAGE_INVALID', `${label} is not valid JSON.`) }
  }
  const snapshot = parse(snapshotBytes, 'commission-guide.snapshot.json')
  const receipt = validateCommissionReceipt(parse(receiptBytes, 'commission-guide.handoff.json'))
  const lock = parse(lockBytes, 'commission-guide.build-input-lock.json')
  const release = parse(releaseBytes, 'public-release.manifest.json')
  const snapshotDigest = sha256(snapshotBytes)
  const handoffReceiptDigest = sha256(receiptBytes)
  const lockDigest = sha256(lockBytes)
  const validated = validateCommissionSnapshot(snapshot, receipt)
  if (snapshotDigest !== receipt.snapshotDigest) fail('E_MMJ_COMMISSION_SNAPSHOT_DIGEST_MISMATCH', 'Commission snapshot raw bytes do not match receipt.')
  if (validated.contentDigest !== receipt.contentDigest) fail('E_MMJ_COMMISSION_SNAPSHOT_DIGEST_MISMATCH', 'Commission content digest does not match receipt.')
  exactKeys(lock, [
    'schemaVersion', 'contract', 'upstreamOrigin', 'guideId', 'publicationVersionId',
    'snapshotDigest', 'contentDigest', 'handoffReceiptId', 'handoffReceiptDigest',
    'sourceWorkbookRevision', 'publicationHeadRevision', 'producerRelease', 'adoptedAt',
  ], '$commissionBuildInputLock', 'E_MMJ_COMMISSION_GENERATED_STAGE_INVALID')
  if (lock.schemaVersion !== 1 || lock.contract !== COMMISSION_BUILD_LOCK_CONTRACT) fail('E_MMJ_COMMISSION_GENERATED_STAGE_INVALID', 'Commission build lock contract mismatch.')
  const expectedLock = createCommissionBuildInputLock({ upstreamOrigin: lock.upstreamOrigin, head: { ...receipt, handoffReceiptId: receipt.receiptId, publishedAt: receipt.createdAt }, receipt, handoffReceiptDigest })
  if (canonicalJson(lock) !== canonicalJson(expectedLock)) fail('E_MMJ_COMMISSION_GENERATED_STAGE_INVALID', 'Commission build lock identity mismatch.')
  if (release.schemaVersion !== 2 || release.contract !== PUBLIC_RELEASE_V2_CONTRACT) fail('E_MMJ_COMMISSION_GENERATED_STAGE_INVALID', 'Aggregate public release manifest v2 is required.')
  if (!plain(release.commissionGuide)) fail('E_MMJ_COMMISSION_GENERATED_STAGE_INVALID', 'Commission release identity is missing.')
  const expectedRelease = {
    snapshotDigest,
    contentDigest: receipt.contentDigest,
    handoffReceiptDigest,
    buildInputLockDigest: lockDigest,
    publicationVersionId: receipt.publicationVersionId,
    handoffReceiptId: receipt.receiptId,
    sourceWorkbookRevision: receipt.sourceWorkbookRevision,
    publicationHeadRevision: receipt.publicationHeadRevision,
  }
  if (canonicalJson(release.commissionGuide) !== canonicalJson(expectedRelease)) fail('E_MMJ_COMMISSION_GENERATED_STAGE_INVALID', 'Commission release identity mismatch.')
  const expectedAggregate = createAggregatePublicReleaseManifest({
    producerRevision: release.producerRevision,
    generatedAt: release.generatedAt,
    portfolio: release.portfolio,
    commissionGuide: expectedRelease,
  })
  if (canonicalJson(release) !== canonicalJson(expectedAggregate)) fail('E_MMJ_COMMISSION_GENERATED_STAGE_INVALID', 'Aggregate public release identity mismatch.')
  return Object.freeze({
    snapshot,
    receipt,
    lock,
    release,
    snapshotDigest,
    contentDigest: receipt.contentDigest,
    handoffReceiptDigest,
    buildInputLockDigest: lockDigest,
    producerRevision: release.producerRevision,
  })
}
