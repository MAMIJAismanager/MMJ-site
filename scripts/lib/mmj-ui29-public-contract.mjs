import { createHash } from 'node:crypto'
import { readdir, readFile, stat } from 'node:fs/promises'
import { relative, resolve, sep } from 'node:path'

import {
  hasExactPrimaryRendition,
} from '../../shared/resolver/media-renderability.ts'
import {
  importMmjSharedTypeScriptModule,
} from './mmj-ui29-shared-typescript-loader.mjs'

export const UI29_RELEASE = 'MMJ-UI29-A'
export const PRODUCER_RELEASE = '0.7.9-mmj-portfolio-empty-closure-r1'
export const SNAPSHOT_CONTRACT = 'mmj-public-portfolio-collection-v1'
export const HANDOFF_CONTRACT = 'mmj-static-build-handoff-receipt-v1'
export const BUILD_INPUT_LOCK_CONTRACT = 'mmj-ui29-build-input-lock-v1'
export const ROUTE_MANIFEST_CONTRACT = 'mmj-ui29-generated-route-manifest-v1'
export const PUBLIC_RELEASE_MANIFEST_CONTRACT = 'mmj-ui29-public-release-manifest-v1'

export const SHA256 = /^[a-f0-9]{64}$/
export const PROJECT_ID = /^prj_[a-z0-9]{8,32}$/
export const ASSET_ID = /^ast_[a-z0-9]{8,32}$/
export const COLLECTION_ID = /^pcol_[a-f0-9]{26}$/
export const RECEIPT_ID = /^phnd_[a-f0-9]{26}$/
export const RELEASE_ID = /^rel_[a-f0-9]{26}$/
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const ROUTE = /^\/works\/[a-z0-9]+(?:-[a-z0-9]+)*$/
export const OBJECT_KEY = /^assets\/(image|video|audio)\/ast_[a-z0-9]{8,32}\/[a-z0-9][a-z0-9._-]*$/u

const PROJECT_CATEGORIES = new Set(['choreography', 'composition', 'video', 'direction', 'producing'])
const GATEWAY_CATEGORIES = new Set([
  'choreography',
  'lyrics-composition',
  'costume-design-production',
  'video-production',
  'project-planning',
  'audio-mixing-mastering',
  'voice-synthesis-engine-assistant',
])
const IMAGE_MEDIA_TYPES = new Set(['image/avif', 'image/webp', 'image/jpeg', 'image/png'])
const VIDEO_MEDIA_TYPES = new Set(['video/webm', 'video/mp4'])
const AUDIO_MEDIA_TYPES = new Set(['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/flac'])
const PURPOSES = {
  image: new Set(['primary', 'thumbnail', 'download']),
  video: new Set(['primary', 'preview', 'download']),
  audio: new Set(['primary', 'preview', 'download']),
}

const SOURCE_TREE_ROOT_FILES = new Set([
  'nuxt.config.ts',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
])
const SOURCE_TREE_ROOT_DIRS = new Set(['app', 'shared', 'scripts'])
const SOURCE_TREE_EXCLUDED_DIRS = new Set(['generated', 'node_modules', '.nuxt', '.output', '.git'])

export class Ui29Error extends Error {
  constructor(code, message, details = {}) {
    super(`${code}: ${message}`)
    this.name = 'Ui29Error'
    this.code = code
    this.details = Object.freeze({ ...details })
  }
}

export function fail(code, message, details = {}) {
  throw new Ui29Error(code, message, details)
}

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function canonicalNormalize(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(canonicalNormalize)
  if (plain(value)) {
    const output = {}
    for (const key of Object.keys(value).sort()) output[key] = canonicalNormalize(value[key])
    return output
  }
  fail('E_MMJ_UI29_GENERATED_STAGE_INVALID', 'Unsupported canonical JSON value.')
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalNormalize(value))
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
  if (actual.join('\0') !== expected.join('\0')) {
    fail(code, `Unexpected object keys at ${pointer}.`, { actual, expected })
  }
}

function string(value, pointer, code, options = {}) {
  if (typeof value !== 'string') fail(code, `Expected string at ${pointer}.`)
  if (options.nonEmpty && value.length === 0) fail(code, `Expected non-empty string at ${pointer}.`)
  if (options.max !== undefined && Array.from(value).length > options.max) fail(code, `String is too long at ${pointer}.`)
  if (options.pattern && !options.pattern.test(value)) fail(code, `String format is invalid at ${pointer}.`, { value })
  return value
}

function nullableString(value, pointer, code, options = {}) {
  if (value === null) return null
  return string(value, pointer, code, options)
}

function boolean(value, pointer, code) {
  if (typeof value !== 'boolean') fail(code, `Expected boolean at ${pointer}.`)
  return value
}

function integer(value, pointer, code, minimum = Number.MIN_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < minimum) fail(code, `Expected safe integer >= ${minimum} at ${pointer}.`, { value })
  return value
}

function iso(value, pointer, code) {
  string(value, pointer, code, { nonEmpty: true })
  if (!Number.isFinite(Date.parse(value))) fail(code, `Expected ISO-8601 timestamp at ${pointer}.`, { value })
  return value
}

function dateOnlyOrNull(value, pointer, code) {
  if (value === null) return null
  string(value, pointer, code, { pattern: /^\d{4}-\d{2}-\d{2}$/ })
  if (!Number.isFinite(Date.parse(`${value}T00:00:00Z`))) fail(code, `Expected valid date at ${pointer}.`, { value })
  return value
}

function array(value, pointer, code) {
  if (!Array.isArray(value)) fail(code, `Expected array at ${pointer}.`)
  return value
}

function assertUnique(values, pointer, code) {
  const seen = new Set()
  for (const value of values) {
    if (seen.has(value)) fail(code, `Duplicate value at ${pointer}.`, { value })
    seen.add(value)
  }
}

function equalJson(a, b) {
  return canonicalJson(a) === canonicalJson(b)
}

function publicBoundaryInspect(value, pointer, code) {
  const forbiddenKey = /(?:spreadsheet|sheet_?id|script_?id|service_?account|operator_?email|actor_?sub|secret|hmac|private_?key|bucket_?name|cloudflare_?account|retention|tombstone|deletion_?receipt|raw_?diagnostic|authorization|session_?cookie)/i
  const forbiddenValue = /(?:sheets\.googleapis\.com|script\.google\.com|\.r2\.cloudflarestorage\.com|\/admin\/bootstrap|\/api\/v1\/(?:mutations|portfolio-collection\/rebuild|commission-guide\/save))/i
  if (Array.isArray(value)) {
    value.forEach((item, index) => publicBoundaryInspect(item, `${pointer}[${index}]`, code))
    return
  }
  if (!plain(value)) {
    if (typeof value === 'string' && forbiddenValue.test(value)) fail(code, `Forbidden control-plane value at ${pointer}.`)
    return
  }
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKey.test(key)) fail(code, `Forbidden control-plane key at ${pointer}.${key}.`, { key })
    publicBoundaryInspect(child, `${pointer}.${key}`, code)
  }
}

export function validateHead(value) {
  const code = 'E_MMJ_UI29_HEAD_INVALID'
  exactKeys(value, [
    'schemaVersion', 'collectionVersionId', 'snapshotObjectKey', 'snapshotDigest',
    'sourceHeadSetDigest', 'sourceDigest', 'publicationCutoff', 'projectCount',
    'assetCount', 'routeCount', 'generation', 'previousCollectionVersionId',
    'previousSnapshotDigest', 'handoffReceiptId', 'promotedAt', 'producerRelease',
  ], '$head', code)
  if (value.schemaVersion !== 1) fail(code, 'Head schemaVersion must equal 1.')
  string(value.collectionVersionId, '$head.collectionVersionId', code, { pattern: COLLECTION_ID })
  string(value.snapshotObjectKey, '$head.snapshotObjectKey', code, { pattern: /^portfolio-collections\/v1\/snapshots\/pcol_[a-f0-9]{26}\.json$/ })
  string(value.snapshotDigest, '$head.snapshotDigest', code, { pattern: SHA256 })
  string(value.sourceHeadSetDigest, '$head.sourceHeadSetDigest', code, { pattern: SHA256 })
  string(value.sourceDigest, '$head.sourceDigest', code, { pattern: SHA256 })
  iso(value.publicationCutoff, '$head.publicationCutoff', code)
  integer(value.projectCount, '$head.projectCount', code, 0)
  integer(value.assetCount, '$head.assetCount', code, 0)
  integer(value.routeCount, '$head.routeCount', code, 0)
  integer(value.generation, '$head.generation', code, 1)
  if (value.previousCollectionVersionId !== null) string(value.previousCollectionVersionId, '$head.previousCollectionVersionId', code, { pattern: COLLECTION_ID })
  if (value.previousSnapshotDigest !== null) string(value.previousSnapshotDigest, '$head.previousSnapshotDigest', code, { pattern: SHA256 })
  string(value.handoffReceiptId, '$head.handoffReceiptId', code, { pattern: RECEIPT_ID })
  iso(value.promotedAt, '$head.promotedAt', code)
  if (value.producerRelease !== PRODUCER_RELEASE) fail(code, 'Head producer release is not admitted.', { actual: value.producerRelease })
  if (value.sourceDigest !== value.sourceHeadSetDigest) fail(code, 'Head source digest parity failed.')
  if (value.routeCount !== value.projectCount) fail(code, 'Head route count must equal project count.')
  if (value.snapshotObjectKey !== `portfolio-collections/v1/snapshots/${value.collectionVersionId}.json`) fail(code, 'Head snapshot object identity drifted.')
  publicBoundaryInspect(value, '$head', code)
  return value
}

export function validateReceipt(value, expectedHead = null) {
  const code = 'E_MMJ_UI29_RECEIPT_INVALID'
  exactKeys(value, [
    'schemaVersion', 'receiptId', 'collectionVersionId', 'collectionHeadGeneration',
    'snapshotObjectKey', 'snapshotDigest', 'sourceHeadSetDigest', 'sourceDigest',
    'publicationCutoff', 'projectCount', 'assetCount', 'routeCount', 'routesDigest',
    'routeSlugs', 'activePublicationEvidence', 'producerRelease', 'createdAt',
  ], '$receipt', code)
  if (value.schemaVersion !== 1) fail(code, 'Receipt schemaVersion must equal 1.')
  string(value.receiptId, '$receipt.receiptId', code, { pattern: RECEIPT_ID })
  string(value.collectionVersionId, '$receipt.collectionVersionId', code, { pattern: COLLECTION_ID })
  integer(value.collectionHeadGeneration, '$receipt.collectionHeadGeneration', code, 1)
  string(value.snapshotObjectKey, '$receipt.snapshotObjectKey', code, { pattern: /^portfolio-collections\/v1\/snapshots\/pcol_[a-f0-9]{26}\.json$/ })
  string(value.snapshotDigest, '$receipt.snapshotDigest', code, { pattern: SHA256 })
  string(value.sourceHeadSetDigest, '$receipt.sourceHeadSetDigest', code, { pattern: SHA256 })
  string(value.sourceDigest, '$receipt.sourceDigest', code, { pattern: SHA256 })
  iso(value.publicationCutoff, '$receipt.publicationCutoff', code)
  integer(value.projectCount, '$receipt.projectCount', code, 0)
  integer(value.assetCount, '$receipt.assetCount', code, 0)
  integer(value.routeCount, '$receipt.routeCount', code, 0)
  string(value.routesDigest, '$receipt.routesDigest', code, { pattern: SHA256 })
  const routeSlugs = array(value.routeSlugs, '$receipt.routeSlugs', code)
  routeSlugs.forEach((slug, index) => string(slug, `$receipt.routeSlugs[${index}]`, code, { pattern: SLUG }))
  assertUnique(routeSlugs, '$receipt.routeSlugs', code)
  if (routeSlugs.length !== value.routeCount) fail(code, 'Receipt route count mismatch.')
  if (canonicalDigest(routeSlugs) !== value.routesDigest) fail('E_MMJ_UI29_ROUTE_DIGEST_MISMATCH', 'Receipt route slug array digest mismatch.')
  const evidence = array(value.activePublicationEvidence, '$receipt.activePublicationEvidence', code)
  evidence.forEach((entry, index) => {
    exactKeys(entry, ['projectId', 'publicationVersionId', 'versionSnapshotDigest', 'publicationDigest'], `$receipt.activePublicationEvidence[${index}]`, code)
    string(entry.projectId, `$receipt.activePublicationEvidence[${index}].projectId`, code, { pattern: PROJECT_ID })
    string(entry.publicationVersionId, `$receipt.activePublicationEvidence[${index}].publicationVersionId`, code, { nonEmpty: true, max: 160 })
    string(entry.versionSnapshotDigest, `$receipt.activePublicationEvidence[${index}].versionSnapshotDigest`, code, { pattern: SHA256 })
    string(entry.publicationDigest, `$receipt.activePublicationEvidence[${index}].publicationDigest`, code, { pattern: SHA256 })
  })
  if (evidence.length !== value.projectCount) fail(code, 'Receipt publication evidence count mismatch.')
  assertUnique(evidence.map(entry => entry.projectId), '$receipt.activePublicationEvidence.projectId', code)
  if (value.producerRelease !== PRODUCER_RELEASE) fail(code, 'Receipt producer release is not admitted.')
  iso(value.createdAt, '$receipt.createdAt', code)
  if (value.sourceDigest !== value.sourceHeadSetDigest) fail(code, 'Receipt source digest parity failed.')
  if (value.routeCount !== value.projectCount) fail(code, 'Receipt route count must equal project count.')
  if (value.snapshotObjectKey !== `portfolio-collections/v1/snapshots/${value.collectionVersionId}.json`) fail(code, 'Receipt snapshot object identity drifted.')
  if (expectedHead) {
    const pairs = [
      ['collectionVersionId', 'collectionVersionId'],
      ['collectionHeadGeneration', 'generation'],
      ['snapshotObjectKey', 'snapshotObjectKey'],
      ['snapshotDigest', 'snapshotDigest'],
      ['sourceHeadSetDigest', 'sourceHeadSetDigest'],
      ['sourceDigest', 'sourceDigest'],
      ['publicationCutoff', 'publicationCutoff'],
      ['projectCount', 'projectCount'],
      ['assetCount', 'assetCount'],
      ['routeCount', 'routeCount'],
      ['receiptId', 'handoffReceiptId'],
      ['producerRelease', 'producerRelease'],
    ]
    for (const [receiptKey, headKey] of pairs) {
      if (value[receiptKey] !== expectedHead[headKey]) {
        fail('E_MMJ_UI29_HEAD_RECEIPT_MISMATCH', `Head and receipt differ at ${receiptKey}.`, {
          receipt: value[receiptKey],
          head: expectedHead[headKey],
        })
      }
    }
  }
  publicBoundaryInspect(value, '$receipt', code)
  return value
}

function validateTag(value, pointer, code) {
  exactKeys(value, ['token', 'label'], pointer, code)
  string(value.token, `${pointer}.token`, code, { nonEmpty: true, max: 80 })
  string(value.label, `${pointer}.label`, code, { nonEmpty: true, max: 120 })
}

function validateRendition(value, kind, pointer, code, objectKeys) {
  exactKeys(value, ['id', 'purpose', 'objectKey', 'mediaType', 'byteSize', 'sha256', 'metadata'], pointer, code)
  string(value.id, `${pointer}.id`, code, { pattern: /^[a-z0-9][a-z0-9._-]{0,95}$/ })
  string(value.purpose, `${pointer}.purpose`, code)
  if (!PURPOSES[kind].has(value.purpose)) fail(code, `Invalid rendition purpose at ${pointer}.purpose.`, { value: value.purpose })
  string(value.objectKey, `${pointer}.objectKey`, code, { pattern: OBJECT_KEY })
  const pathKind = value.objectKey.split('/')[1]
  if (pathKind !== kind) fail('E_MMJ_UI29_MEDIA_OBJECT_KEY_DRIFT', `Object key kind mismatch at ${pointer}.objectKey.`)
  if (objectKeys.has(value.objectKey)) fail(code, `Duplicate rendition objectKey at ${pointer}.objectKey.`, { objectKey: value.objectKey })
  objectKeys.add(value.objectKey)
  string(value.mediaType, `${pointer}.mediaType`, code)
  const allowedTypes = kind === 'image' ? IMAGE_MEDIA_TYPES : kind === 'video' ? VIDEO_MEDIA_TYPES : AUDIO_MEDIA_TYPES
  if (!allowedTypes.has(value.mediaType)) fail(code, `Invalid media type at ${pointer}.mediaType.`, { value: value.mediaType })
  integer(value.byteSize, `${pointer}.byteSize`, code, 1)
  string(value.sha256, `${pointer}.sha256`, code, { pattern: SHA256 })
  if (kind === 'image') {
    exactKeys(value.metadata, ['width', 'height'], `${pointer}.metadata`, code)
    integer(value.metadata.width, `${pointer}.metadata.width`, code, 1)
    integer(value.metadata.height, `${pointer}.metadata.height`, code, 1)
  } else if (kind === 'video') {
    exactKeys(value.metadata, ['width', 'height', 'durationMs', 'hasAudio'], `${pointer}.metadata`, code)
    integer(value.metadata.width, `${pointer}.metadata.width`, code, 1)
    integer(value.metadata.height, `${pointer}.metadata.height`, code, 1)
    integer(value.metadata.durationMs, `${pointer}.metadata.durationMs`, code, 1)
    boolean(value.metadata.hasAudio, `${pointer}.metadata.hasAudio`, code)
  } else {
    exactKeys(value.metadata, ['durationMs'], `${pointer}.metadata`, code)
    integer(value.metadata.durationMs, `${pointer}.metadata.durationMs`, code, 1)
  }
}

function validateAsset(value, index, objectKeys) {
  const code = 'E_MMJ_UI29_SNAPSHOT_INVALID'
  const pointer = `$snapshot.assets[${index}]`
  if (!plain(value)) fail(code, `Expected asset object at ${pointer}.`)
  const kind = value.kind
  if (!['image', 'video', 'audio'].includes(kind)) fail(code, `Invalid asset kind at ${pointer}.kind.`)
  const keys = kind === 'image'
    ? ['schemaVersion', 'id', 'kind', 'label', 'caption', 'credit', 'defaultRenditionId', 'renditions', 'altText']
    : kind === 'video'
      ? ['schemaVersion', 'id', 'kind', 'label', 'caption', 'credit', 'defaultRenditionId', 'renditions', 'posterAssetId']
      : ['schemaVersion', 'id', 'kind', 'label', 'caption', 'credit', 'defaultRenditionId', 'renditions', 'artworkAssetId']
  exactKeys(value, keys, pointer, code)
  if (value.schemaVersion !== 1) fail(code, `Asset schemaVersion must equal 1 at ${pointer}.`)
  string(value.id, `${pointer}.id`, code, { pattern: ASSET_ID })
  string(value.label, `${pointer}.label`, code, { nonEmpty: true, max: 240 })
  nullableString(value.caption, `${pointer}.caption`, code, { max: 2000 })
  nullableString(value.credit, `${pointer}.credit`, code, { max: 240 })
  string(value.defaultRenditionId, `${pointer}.defaultRenditionId`, code, { nonEmpty: true, max: 96 })
  const renditions = array(value.renditions, `${pointer}.renditions`, code)
  if (renditions.length === 0) fail(code, `Asset has no renditions at ${pointer}.renditions.`)
  const renditionIds = []
  renditions.forEach((rendition, renditionIndex) => {
    validateRendition(rendition, kind, `${pointer}.renditions[${renditionIndex}]`, code, objectKeys)
    renditionIds.push(rendition.id)
  })
  assertUnique(renditionIds, `${pointer}.renditions.id`, code)
  if (!renditionIds.includes(value.defaultRenditionId)) fail(code, `Default rendition is missing at ${pointer}.defaultRenditionId.`)
  if (kind === 'image') nullableString(value.altText, `${pointer}.altText`, code, { max: 500 })
  if (kind === 'video') string(value.posterAssetId, `${pointer}.posterAssetId`, code, { pattern: ASSET_ID })
  if (kind === 'audio') string(value.artworkAssetId, `${pointer}.artworkAssetId`, code, { pattern: ASSET_ID })
}

function validateProject(value, index) {
  const code = 'E_MMJ_UI29_SNAPSHOT_INVALID'
  const pointer = `$snapshot.projects[${index}]`
  exactKeys(value, [
    'schemaVersion', 'id', 'slug', 'title', 'category', 'gatewayCategoryIds', 'roles',
    'tags', 'timing', 'client', 'summary', 'description', 'post', 'credits',
    'externalLinks', 'relatedProjectIds', 'assets', 'featured', 'order', 'seo',
  ], pointer, code)
  if (value.schemaVersion !== 1) fail(code, `Project schemaVersion must equal 1 at ${pointer}.`)
  string(value.id, `${pointer}.id`, code, { pattern: PROJECT_ID })
  string(value.slug, `${pointer}.slug`, code, { pattern: SLUG })
  string(value.title, `${pointer}.title`, code, { nonEmpty: true, max: 240 })
  string(value.category, `${pointer}.category`, code)
  if (!PROJECT_CATEGORIES.has(value.category)) fail(code, `Unknown project category at ${pointer}.category.`)
  const gateways = array(value.gatewayCategoryIds, `${pointer}.gatewayCategoryIds`, code)
  gateways.forEach((gateway, gatewayIndex) => {
    string(gateway, `${pointer}.gatewayCategoryIds[${gatewayIndex}]`, code)
    if (!GATEWAY_CATEGORIES.has(gateway)) fail(code, `Unknown gateway category at ${pointer}.gatewayCategoryIds[${gatewayIndex}].`)
  })
  assertUnique(gateways, `${pointer}.gatewayCategoryIds`, code)
  if (array(value.roles, `${pointer}.roles`, code).length !== 0) fail(code, `Public relation roles must be empty at ${pointer}.roles.`)
  const tags = array(value.tags, `${pointer}.tags`, code)
  tags.forEach((tag, tagIndex) => validateTag(tag, `${pointer}.tags[${tagIndex}]`, code))
  assertUnique(tags.map(tag => tag.token), `${pointer}.tags.token`, code)
  exactKeys(value.timing, ['year', 'releaseDate'], `${pointer}.timing`, code)
  if (value.timing.year !== null) integer(value.timing.year, `${pointer}.timing.year`, code, 1900)
  dateOnlyOrNull(value.timing.releaseDate, `${pointer}.timing.releaseDate`, code)
  nullableString(value.client, `${pointer}.client`, code, { max: 240 })
  string(value.summary, `${pointer}.summary`, code, { nonEmpty: true, max: 2000 })
  string(value.description, `${pointer}.description`, code, { nonEmpty: true, max: 12000 })
  exactKeys(value.post, ['comment', 'mediaItems', 'tags'], `${pointer}.post`, code)
  string(value.post.comment, `${pointer}.post.comment`, code, { nonEmpty: true, max: 12000 })
  const mediaItems = array(value.post.mediaItems, `${pointer}.post.mediaItems`, code)
  if (mediaItems.length < 1 || mediaItems.length > 4) fail(code, `Post media item count is invalid at ${pointer}.post.mediaItems.`)
  const positions = []
  const mediaAssetIds = []
  mediaItems.forEach((item, itemIndex) => {
    exactKeys(item, ['position', 'assetId'], `${pointer}.post.mediaItems[${itemIndex}]`, code)
    integer(item.position, `${pointer}.post.mediaItems[${itemIndex}].position`, code, 0)
    if (item.position > 3) fail(code, `Post media position is invalid at ${pointer}.post.mediaItems[${itemIndex}].position.`)
    string(item.assetId, `${pointer}.post.mediaItems[${itemIndex}].assetId`, code, { pattern: ASSET_ID })
    positions.push(item.position)
    mediaAssetIds.push(item.assetId)
  })
  assertUnique(positions, `${pointer}.post.mediaItems.position`, code)
  assertUnique(mediaAssetIds, `${pointer}.post.mediaItems.assetId`, code)
  if (positions[0] !== 0 || positions.some((position, positionIndex) => position !== positionIndex)) {
    fail(code, `Post media positions must be contiguous and ordered from zero at ${pointer}.post.mediaItems.`)
  }
  const postTags = array(value.post.tags, `${pointer}.post.tags`, code)
  postTags.forEach((tag, tagIndex) => validateTag(tag, `${pointer}.post.tags[${tagIndex}]`, code))
  if (!equalJson(value.tags, value.post.tags)) fail(code, `Project tags and post tags differ at ${pointer}.`)
  if (array(value.credits, `${pointer}.credits`, code).length !== 0) fail(code, `Public credits must be empty at ${pointer}.credits.`)
  if (array(value.externalLinks, `${pointer}.externalLinks`, code).length !== 0) fail(code, `Public external links must be empty at ${pointer}.externalLinks.`)
  if (array(value.relatedProjectIds, `${pointer}.relatedProjectIds`, code).length !== 0) fail(code, `Public related projects must be empty at ${pointer}.relatedProjectIds.`)
  exactKeys(value.assets, ['coverAssetId', 'backdropAssetId', 'primaryAssetId', 'galleryAssetIds'], `${pointer}.assets`, code)
  string(value.assets.coverAssetId, `${pointer}.assets.coverAssetId`, code, { pattern: ASSET_ID })
  if (value.assets.backdropAssetId !== null) fail(code, `Public backdrop must be null at ${pointer}.assets.backdropAssetId.`)
  string(value.assets.primaryAssetId, `${pointer}.assets.primaryAssetId`, code, { pattern: ASSET_ID })
  const gallery = array(value.assets.galleryAssetIds, `${pointer}.assets.galleryAssetIds`, code)
  gallery.forEach((assetId, galleryIndex) => string(assetId, `${pointer}.assets.galleryAssetIds[${galleryIndex}]`, code, { pattern: ASSET_ID }))
  assertUnique(gallery, `${pointer}.assets.galleryAssetIds`, code)
  if (value.assets.primaryAssetId !== mediaItems[0].assetId) fail(code, `Primary asset and slot zero differ at ${pointer}.assets.primaryAssetId.`)
  if (!equalJson(gallery, mediaItems.slice(1).map(item => item.assetId))) fail(code, `Gallery assets and post slots differ at ${pointer}.assets.galleryAssetIds.`)
  boolean(value.featured, `${pointer}.featured`, code)
  integer(value.order, `${pointer}.order`, code, 0)
  exactKeys(value.seo, ['title', 'description', 'ogAssetId', 'indexable'], `${pointer}.seo`, code)
  string(value.seo.title, `${pointer}.seo.title`, code, { nonEmpty: true, max: 300 })
  string(value.seo.description, `${pointer}.seo.description`, code, { nonEmpty: true, max: 600 })
  string(value.seo.ogAssetId, `${pointer}.seo.ogAssetId`, code, { pattern: ASSET_ID })
  boolean(value.seo.indexable, `${pointer}.seo.indexable`, code)
}

export function validateSnapshot(value, expected = null) {
  const code = 'E_MMJ_UI29_SNAPSHOT_INVALID'
  exactKeys(value, ['assets', 'projects', 'publicationCutoff', 'schemaVersion', 'sourceDigest'], '$snapshot', code)
  if (value.schemaVersion !== 1) fail(code, 'Snapshot schemaVersion must equal 1.')
  string(value.sourceDigest, '$snapshot.sourceDigest', code, { pattern: SHA256 })
  iso(value.publicationCutoff, '$snapshot.publicationCutoff', code)
  const projects = array(value.projects, '$snapshot.projects', code)
  const assets = array(value.assets, '$snapshot.assets', code)
  projects.forEach(validateProject)
  const objectKeys = new Set()
  assets.forEach((asset, index) => validateAsset(asset, index, objectKeys))
  assertUnique(projects.map(project => project.id), '$snapshot.projects.id', code)
  assertUnique(projects.map(project => project.slug), '$snapshot.projects.slug', code)
  assertUnique(projects.map(project => project.order), '$snapshot.projects.order', code)
  assertUnique(assets.map(asset => asset.id), '$snapshot.assets.id', code)
  const assetById = new Map(assets.map(asset => [asset.id, asset]))
  const reachable = new Set()
  const visit = (assetId, path, expectedKind = null, context = null) => {
    const asset = assetById.get(assetId)
    if (!asset) fail(code, `Referenced asset is missing at ${path}.`, { assetId })
    if (expectedKind && asset.kind !== expectedKind) fail(code, `Referenced asset kind mismatch at ${path}.`, { assetId, expectedKind, actualKind: asset.kind })
    if (context?.requirePrimary === true && !hasExactPrimaryRendition(asset.renditions)) {
      fail(
        'E_MMJ_PUBLIC_WORK_MEDIA_PRIMARY_SOURCE_MISSING',
        'Work Detail media is not renderable: exact primary rendition is missing.',
        {
          projectId: context.projectId,
          route: context.route,
          assetId: asset.id,
          assetKind: asset.kind,
          intent: context.intent,
          path,
          reason: 'missing-primary-source',
        },
      )
    }
    if (reachable.has(assetId)) return
    reachable.add(assetId)
    if (asset.kind === 'video') {
      visit(
        asset.posterAssetId,
        `asset(${assetId}).posterAssetId`,
        'image',
        context === null ? null : { ...context, intent: 'video-poster', requirePrimary: true },
      )
    }
    if (asset.kind === 'audio') {
      visit(
        asset.artworkAssetId,
        `asset(${assetId}).artworkAssetId`,
        'image',
        context === null ? null : { ...context, intent: 'audio-artwork', requirePrimary: true },
      )
    }
  }
  projects.forEach((project, projectIndex) => {
    const route = `/works/${project.slug}`
    const context = (intent, requirePrimary) => ({ projectId: project.id, route, intent, requirePrimary })
    visit(project.assets.coverAssetId, `$snapshot.projects[${projectIndex}].assets.coverAssetId`, 'image', context('cover', true))
    visit(project.assets.primaryAssetId, `$snapshot.projects[${projectIndex}].assets.primaryAssetId`, null, context('primary', true))
    project.assets.galleryAssetIds.forEach((assetId, galleryIndex) => visit(
      assetId,
      `$snapshot.projects[${projectIndex}].assets.galleryAssetIds[${galleryIndex}]`,
      null,
      context('gallery', assetById.get(assetId)?.kind === 'image'),
    ))
    visit(project.seo.ogAssetId, `$snapshot.projects[${projectIndex}].seo.ogAssetId`, 'image', context('seo-og', false))
    project.post.mediaItems.forEach((item, itemIndex) => visit(
      item.assetId,
      `$snapshot.projects[${projectIndex}].post.mediaItems[${itemIndex}].assetId`,
      null,
      context(
        itemIndex === 0 ? 'post-primary' : 'post-gallery',
        itemIndex === 0 || assetById.get(item.assetId)?.kind === 'image',
      ),
    ))
  })
  if (reachable.size !== assets.length) {
    const unreachable = assets.map(asset => asset.id).filter(id => !reachable.has(id))
    fail(code, 'Snapshot contains unreachable assets.', { unreachable })
  }
  const routeSlugs = projects.map(project => project.slug)
  const routes = routeSlugs.map(slug => `/works/${slug}`)
  if (expected) {
    if (value.sourceDigest !== expected.sourceDigest) fail('E_MMJ_UI29_RECEIPT_SNAPSHOT_MISMATCH', 'Snapshot source digest mismatch.')
    if (value.publicationCutoff !== expected.publicationCutoff) fail('E_MMJ_UI29_RECEIPT_SNAPSHOT_MISMATCH', 'Snapshot publication cutoff mismatch.')
    if (projects.length !== expected.projectCount) fail('E_MMJ_UI29_RECEIPT_SNAPSHOT_MISMATCH', 'Snapshot project count mismatch.')
    if (assets.length !== expected.assetCount) fail('E_MMJ_UI29_RECEIPT_SNAPSHOT_MISMATCH', 'Snapshot asset count mismatch.')
    if (!equalJson(routeSlugs, expected.routeSlugs)) fail('E_MMJ_UI29_ROUTE_PARITY_MISMATCH', 'Snapshot route slugs and receipt route slugs differ.', { routeSlugs, receiptRouteSlugs: expected.routeSlugs })
  }
  publicBoundaryInspect(value, '$snapshot', code)
  return { snapshot: value, routes }
}

export function validateHeadStability(headA, headB) {
  const fields = ['collectionVersionId', 'snapshotDigest', 'handoffReceiptId', 'generation']
  for (const field of fields) {
    if (headA[field] !== headB[field]) {
      fail('E_MMJ_UI29_PORTFOLIO_HEAD_UNSTABLE', `Portfolio collection head changed at ${field}.`, {
        before: headA[field],
        after: headB[field],
      })
    }
  }
}

export function createRouteManifest(routes, snapshotDigest) {
  return Object.freeze({ routes: Object.freeze([...routes]), schemaVersion: 1, snapshotDigest })
}

export async function computeProducerRevision(root) {
  const records = []
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true })
    entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))
    for (const entry of entries) {
      if (SOURCE_TREE_EXCLUDED_DIRS.has(entry.name)) continue
      const absolute = resolve(dir, entry.name)
      const rel = relative(root, absolute).split(sep).join('/')
      if (entry.isDirectory()) {
        const rootPart = rel.split('/')[0]
        if (dir === root && !SOURCE_TREE_ROOT_DIRS.has(rootPart)) continue
        await walk(absolute)
      } else if (entry.isFile()) {
        const rootPart = rel.split('/')[0]
        if (!SOURCE_TREE_ROOT_DIRS.has(rootPart) && !SOURCE_TREE_ROOT_FILES.has(rel)) continue
        const bytes = await readFile(absolute)
        records.push(`${rel}\0${sha256(bytes)}\n`)
      }
    }
  }
  await walk(root)
  records.sort((a, b) => a.localeCompare(b, 'en'))
  return sha256(Buffer.from(records.join(''), 'utf8'))
}

export function createBuildInputLock(input) {
  return Object.freeze({
    schemaVersion: 1,
    contract: BUILD_INPUT_LOCK_CONTRACT,
    upstreamOrigin: input.upstreamOrigin,
    collectionVersionId: input.head.collectionVersionId,
    collectionHeadGeneration: input.head.generation,
    snapshotDigest: input.head.snapshotDigest,
    sourceDigest: input.head.sourceDigest,
    sourceHeadSetDigest: input.head.sourceHeadSetDigest,
    handoffReceiptId: input.receipt.receiptId,
    handoffReceiptDigest: input.handoffReceiptDigest,
    publicationCutoff: input.head.publicationCutoff,
    projectCount: input.head.projectCount,
    assetCount: input.head.assetCount,
    routeCount: input.head.routeCount,
    routeArrayDigest: input.receipt.routesDigest,
    producerRelease: PRODUCER_RELEASE,
    adoptedAt: input.receipt.createdAt,
  })
}

export function createPublicReleaseManifest(input) {
  const releaseInputDigest = sha256(Buffer.from([
    input.snapshotDigest,
    input.routesFileDigest,
    input.producerRevision,
    input.handoffReceiptDigest,
  ].join('\n'), 'utf8'))
  return Object.freeze({
    schemaVersion: 1,
    releaseId: `rel_${releaseInputDigest.slice(0, 26)}`,
    snapshotDigest: input.snapshotDigest,
    routesDigest: input.routesFileDigest,
    projectCount: input.projectCount,
    assetCount: input.assetCount,
    publicationCutoff: input.publicationCutoff,
    producerRevision: input.producerRevision,
    generatedAt: input.generatedAt,
    portfolioCollectionVersionId: input.collectionVersionId,
    portfolioHandoffReceiptId: input.handoffReceiptId,
    portfolioHandoffReceiptDigest: input.handoffReceiptDigest,
    portfolioSourceDigest: input.sourceDigest,
    portfolioBuildInputLockDigest: input.buildInputLockDigest,
  })
}

function validateRouteManifest(value, expectedSnapshotDigest, expectedRoutes) {
  const code = 'E_MMJ_UI29_GENERATED_STAGE_INVALID'
  exactKeys(value, ['routes', 'schemaVersion', 'snapshotDigest'], '$routes', code)
  if (value.schemaVersion !== 1) fail(code, 'Route manifest schemaVersion must equal 1.')
  string(value.snapshotDigest, '$routes.snapshotDigest', code, { pattern: SHA256 })
  if (value.snapshotDigest !== expectedSnapshotDigest) fail(code, 'Route manifest snapshot digest mismatch.')
  const routes = array(value.routes, '$routes.routes', code)
  routes.forEach((route, index) => string(route, `$routes.routes[${index}]`, code, { pattern: ROUTE }))
  assertUnique(routes, '$routes.routes', code)
  if (!equalJson(routes, expectedRoutes)) fail('E_MMJ_UI29_ROUTE_PARITY_MISMATCH', 'Generated routes differ from snapshot routes.')
}

function validateBuildInputLock(value, input) {
  const code = 'E_MMJ_UI29_GENERATED_STAGE_INVALID'
  exactKeys(value, [
    'schemaVersion', 'contract', 'upstreamOrigin', 'collectionVersionId',
    'collectionHeadGeneration', 'snapshotDigest', 'sourceDigest', 'sourceHeadSetDigest',
    'handoffReceiptId', 'handoffReceiptDigest', 'publicationCutoff', 'projectCount',
    'assetCount', 'routeCount', 'routeArrayDigest', 'producerRelease', 'adoptedAt',
  ], '$buildInputLock', code)
  if (value.schemaVersion !== 1 || value.contract !== BUILD_INPUT_LOCK_CONTRACT) fail(code, 'Build input lock contract mismatch.')
  const expected = createBuildInputLock(input)
  if (!equalJson(value, expected)) fail(code, 'Build input lock identity mismatch.')
}

function validatePublicReleaseManifest(value, input) {
  const code = 'E_MMJ_UI29_GENERATED_STAGE_INVALID'
  if (value?.schemaVersion === 2) {
    exactKeys(value, [
      'schemaVersion', 'contract', 'releaseId', 'producerRevision',
      'generatedAt', 'portfolio', 'commissionGuide',
    ], '$publicReleaseManifest', code)
    if (value.contract !== 'mmj-ui29-public-release-manifest-v2') fail(code, 'Public release manifest v2 contract mismatch.')
    string(value.releaseId, '$publicReleaseManifest.releaseId', code, { pattern: RELEASE_ID })
    if (value.producerRevision !== input.producerRevision) fail(code, 'Public release manifest producer revision mismatch.')
    exactKeys(value.portfolio, [
      'snapshotDigest', 'routesDigest', 'handoffReceiptDigest',
      'buildInputLockDigest', 'collectionVersionId', 'handoffReceiptId',
      'sourceDigest', 'projectCount', 'assetCount',
    ], '$publicReleaseManifest.portfolio', code)
    const expectedPortfolio = {
      snapshotDigest: input.snapshotDigest,
      routesDigest: input.routesFileDigest,
      handoffReceiptDigest: input.handoffReceiptDigest,
      buildInputLockDigest: input.buildInputLockDigest,
      collectionVersionId: input.collectionVersionId,
      handoffReceiptId: input.handoffReceiptId,
      sourceDigest: input.sourceDigest,
      projectCount: input.projectCount,
      assetCount: input.assetCount,
    }
    if (!equalJson(value.portfolio, expectedPortfolio)) fail(code, 'Public release manifest portfolio identity mismatch.')
    exactKeys(value.commissionGuide, [
      'snapshotDigest', 'contentDigest', 'handoffReceiptDigest',
      'buildInputLockDigest', 'publicationVersionId', 'handoffReceiptId',
      'sourceWorkbookRevision', 'publicationHeadRevision',
    ], '$publicReleaseManifest.commissionGuide', code)
    for (const field of ['snapshotDigest', 'contentDigest', 'handoffReceiptDigest', 'buildInputLockDigest']) {
      string(value.commissionGuide[field], `$publicReleaseManifest.commissionGuide.${field}`, code, { pattern: SHA256 })
    }
    return
  }
  exactKeys(value, [
    'schemaVersion', 'releaseId', 'snapshotDigest', 'routesDigest', 'projectCount',
    'assetCount', 'publicationCutoff', 'producerRevision', 'generatedAt',
    'portfolioCollectionVersionId', 'portfolioHandoffReceiptId',
    'portfolioHandoffReceiptDigest', 'portfolioSourceDigest',
    'portfolioBuildInputLockDigest',
  ], '$publicReleaseManifest', code)
  if (value.schemaVersion !== 1) fail(code, 'Public release manifest schemaVersion must equal 1 or 2.')
  string(value.releaseId, '$publicReleaseManifest.releaseId', code, { pattern: RELEASE_ID })
  const expected = createPublicReleaseManifest(input)
  if (!equalJson(value, expected)) fail(code, 'Public release manifest identity mismatch.')
}

export async function validateAccessibleDescriptionResolutionAdmission(snapshot, options = {}) {
  const sourceRoot = resolve(options.sourceRoot ?? process.cwd())
  let authority
  try {
    authority = await importMmjSharedTypeScriptModule(
      sourceRoot,
      'shared/resolver/accessible-description-resolution.ts',
    )
  } catch (error) {
    fail(
      'E_MMJ_PUBLIC_ACCESSIBLE_DESCRIPTION_AUTHORITY_LOAD_FAILED',
      'Accessible description resolution authority could not be loaded.',
      {
        underlyingErrorName: error instanceof Error ? error.name : typeof error,
        underlyingErrorMessage: error instanceof Error ? error.message : String(error),
      },
    )
  }

  try {
    return authority.admitPortfolioAccessibleDescriptions(snapshot)
  } catch (error) {
    const detail = key => (
      plain(error) && typeof error[key] === 'string'
        ? error[key]
        : null
    )
    const name = error instanceof Error ? error.name : typeof error
    if (name === 'WorkDetailAccessibleDescriptionAdmissionError') {
      const underlyingErrorCode = detail('underlyingErrorCode')
      fail(
        underlyingErrorCode === 'invalid-explicit-image-alt'
          ? 'E_MMJ_PUBLIC_EXPLICIT_IMAGE_ALT_TEXT_INVALID'
          : 'E_MMJ_PUBLIC_INFORMATIVE_IMAGE_DESCRIPTION_UNRESOLVABLE',
        underlyingErrorCode === 'invalid-explicit-image-alt'
          ? 'Explicit image alt text is invalid.'
          : 'Public informative image has no usable accessible description source.',
        {
          projectId: detail('projectId'),
          route: detail('route'),
          assetId: detail('assetId'),
          ownerAssetId: detail('ownerAssetId'),
          context: detail('context'),
          relationPath: detail('relationPath'),
          accessibilityMode: detail('accessibilityMode'),
          reason: detail('reason'),
          underlyingErrorName: detail('underlyingErrorName'),
          underlyingErrorCode,
          underlyingErrorPath: detail('underlyingErrorPath'),
        },
      )
    }
    fail(
      'E_MMJ_PUBLIC_ACCESSIBLE_DESCRIPTION_AUTHORITY_FAILED',
      'Accessible description authority failed outside its admission contract.',
      {
        underlyingErrorName: name,
        underlyingErrorCode: detail('code'),
        underlyingErrorPath: detail('path'),
      },
    )
  }
}

export async function validateWorkDetailPresentationAdmission(snapshot, options = {}) {
  const sourceRoot = resolve(options.sourceRoot ?? process.cwd())
  const mediaBaseUrl = options.mediaBaseUrl ?? process.env.NUXT_PUBLIC_MMJ_MEDIA_BASE_URL
  let authority
  try {
    authority = await importMmjSharedTypeScriptModule(
      sourceRoot,
      'shared/resolver/work-detail-presentation-plan.ts',
    )
  } catch (error) {
    fail(
      'E_MMJ_PUBLIC_WORK_PRESENTATION_AUTHORITY_LOAD_FAILED',
      'Work Detail presentation planning authority could not be loaded.',
      {
        underlyingErrorName: error instanceof Error ? error.name : typeof error,
        underlyingErrorMessage: error instanceof Error ? error.message : String(error),
      },
    )
  }

  try {
    return authority.admitPortfolioWorkDetailPresentations(
      snapshot,
      mediaBaseUrl,
    )
  } catch (error) {
    const detail = key => (
      plain(error) && typeof error[key] === 'string'
        ? error[key]
        : null
    )
    const name = error instanceof Error ? error.name : typeof error
    if (name === 'WorkDetailPresentationConfigurationError') {
      const configurationCode = detail('code')
      fail(
        configurationCode === 'media-delivery-config-missing'
          ? 'E_MMJ_PUBLIC_MEDIA_DELIVERY_CONFIG_MISSING'
          : 'E_MMJ_PUBLIC_WORK_PRESENTATION_CONFIGURATION_INVALID',
        'Work Detail presentation planning configuration is not admitted.',
        {
          configurationCode,
          projectId: detail('projectId'),
          route: detail('route'),
          underlyingErrorName: detail('underlyingErrorName'),
          underlyingErrorCode: detail('underlyingErrorCode'),
        },
      )
    }
    if (name === 'WorkDetailPresentationPlanningError') {
      fail(
        'E_MMJ_PUBLIC_WORK_PRESENTATION_PLANNER_FAILED',
        'Work Detail presentation planner rejected the public snapshot.',
        {
          projectId: detail('projectId'),
          route: detail('route'),
          assetId: detail('assetId'),
          ownerAssetId: detail('ownerAssetId'),
          assetKind: detail('assetKind'),
          context: detail('context'),
          planner: detail('planner'),
          underlyingErrorName: detail('underlyingErrorName'),
          underlyingErrorCode: detail('underlyingErrorCode'),
          underlyingErrorPath: detail('underlyingErrorPath'),
        },
      )
    }
    fail(
      'E_MMJ_PUBLIC_WORK_PRESENTATION_AUTHORITY_FAILED',
      'Work Detail presentation planning authority failed outside the admitted planner error contract.',
      {
        underlyingErrorName: name,
        underlyingErrorCode: detail('code'),
        underlyingErrorPath: detail('path'),
      },
    )
  }
}

export async function verifyGeneratedArtifactSet(directory, sourceRoot, options = {}) {
  const snapshotBytes = await readFile(resolve(directory, 'portfolio.snapshot.json'))
  const handoffBytes = await readFile(resolve(directory, 'portfolio.handoff.json'))
  const routesBytes = await readFile(resolve(directory, 'portfolio.routes.json'))
  const lockBytes = await readFile(resolve(directory, 'portfolio.build-input-lock.json'))
  const manifestBytes = await readFile(resolve(directory, 'public-release.manifest.json'))
  const parse = (bytes, label) => {
    try { return JSON.parse(bytes.toString('utf8')) } catch { fail('E_MMJ_UI29_GENERATED_STAGE_INVALID', `${label} is not valid JSON.`) }
  }
  const snapshotValue = parse(snapshotBytes, 'portfolio.snapshot.json')
  const receiptValue = parse(handoffBytes, 'portfolio.handoff.json')
  const routeValue = parse(routesBytes, 'portfolio.routes.json')
  const lockValue = parse(lockBytes, 'portfolio.build-input-lock.json')
  const manifestValue = parse(manifestBytes, 'public-release.manifest.json')
  const snapshotDigest = sha256(snapshotBytes)
  const handoffReceiptDigest = sha256(handoffBytes)
  const routesFileDigest = sha256(routesBytes)
  const lockDigest = sha256(lockBytes)
  const receipt = validateReceipt(receiptValue)
  if (receipt.snapshotDigest !== snapshotDigest) fail('E_MMJ_UI29_SNAPSHOT_DIGEST_MISMATCH', 'Generated snapshot bytes do not match handoff receipt.')
  const { routes } = validateSnapshot(snapshotValue, receipt)
  await validateAccessibleDescriptionResolutionAdmission(snapshotValue, { sourceRoot })
  await validateWorkDetailPresentationAdmission(snapshotValue, {
    sourceRoot,
    mediaBaseUrl: options.mediaBaseUrl ?? process.env.NUXT_PUBLIC_MMJ_MEDIA_BASE_URL,
  })
  validateRouteManifest(routeValue, snapshotDigest, routes)
  const producerRevision = await computeProducerRevision(sourceRoot)
  const headLike = {
    collectionVersionId: receipt.collectionVersionId,
    generation: receipt.collectionHeadGeneration,
    snapshotDigest: receipt.snapshotDigest,
    sourceDigest: receipt.sourceDigest,
    sourceHeadSetDigest: receipt.sourceHeadSetDigest,
    handoffReceiptId: receipt.receiptId,
    publicationCutoff: receipt.publicationCutoff,
    projectCount: receipt.projectCount,
    assetCount: receipt.assetCount,
    routeCount: receipt.routeCount,
  }
  validateBuildInputLock(lockValue, {
    upstreamOrigin: lockValue.upstreamOrigin,
    head: headLike,
    receipt,
    handoffReceiptDigest,
  })
  validatePublicReleaseManifest(manifestValue, {
    snapshotDigest,
    routesFileDigest,
    producerRevision,
    handoffReceiptDigest,
    projectCount: receipt.projectCount,
    assetCount: receipt.assetCount,
    publicationCutoff: receipt.publicationCutoff,
    generatedAt: receipt.createdAt,
    collectionVersionId: receipt.collectionVersionId,
    handoffReceiptId: receipt.receiptId,
    sourceDigest: receipt.sourceDigest,
    buildInputLockDigest: lockDigest,
  })
  if (options.expectedOrigin && lockValue.upstreamOrigin !== options.expectedOrigin) fail('E_MMJ_UI29_GENERATED_STAGE_INVALID', 'Build input origin mismatch.')
  return Object.freeze({
    snapshotDigest,
    handoffReceiptDigest,
    routesFileDigest,
    buildInputLockDigest: lockDigest,
    producerRevision,
    releaseId: manifestValue.releaseId,
    projectCount: receipt.projectCount,
    assetCount: receipt.assetCount,
    routeCount: routes.length,
    routes: Object.freeze([...routes]),
    snapshot: snapshotValue,
    receipt,
    lock: lockValue,
    manifest: manifestValue,
  })
}

export async function pathExists(path) {
  try { await stat(path); return true } catch { return false }
}
