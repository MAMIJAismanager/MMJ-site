import {
  canonicalDigest,
  validateHead,
  validateHeadStability,
  validateReceipt,
  validateSnapshot,
} from './lib/mmj-ui29-public-contract.mjs'

const clone = value => structuredClone(value)
const sourceDigest = '1'.repeat(64)
const snapshotDigest = '2'.repeat(64)
const collectionVersionId = `pcol_${snapshotDigest.slice(0, 26)}`
const receiptId = `phnd_${'3'.repeat(26)}`
const routeSlugs = ['/works/contract-sample']

const asset = {
  schemaVersion: 1,
  id: 'ast_abcdefgh',
  kind: 'image',
  label: 'Contract sample',
  caption: null,
  credit: null,
  defaultRenditionId: 'primary-webp',
  renditions: [{
    id: 'primary-webp',
    purpose: 'primary',
    objectKey: 'assets/image/ast_abcdefgh/primary.webp',
    mediaType: 'image/webp',
    byteSize: 128,
    sha256: '4'.repeat(64),
    metadata: { width: 1200, height: 900 },
  }],
  altText: 'Contract sample',
}

const project = {
  schemaVersion: 1,
  id: 'prj_abcdefgh',
  slug: 'contract-sample',
  title: 'Contract sample',
  category: 'video',
  gatewayCategoryIds: ['video-production'],
  roles: [],
  tags: [{ token: 'sample', label: 'Sample' }],
  timing: { year: 2026, releaseDate: '2026-07-30' },
  client: null,
  summary: 'Contract sample summary',
  description: 'Contract sample description',
  post: {
    comment: 'Contract sample description',
    mediaItems: [{ position: 0, assetId: asset.id }],
    tags: [{ token: 'sample', label: 'Sample' }],
  },
  credits: [],
  externalLinks: [],
  relatedProjectIds: [],
  assets: {
    coverAssetId: asset.id,
    backdropAssetId: null,
    primaryAssetId: asset.id,
    galleryAssetIds: [],
  },
  featured: false,
  order: 10,
  seo: {
    title: 'Contract sample | MMJ',
    description: 'Contract sample SEO description',
    ogAssetId: asset.id,
    indexable: true,
  },
}

const snapshot = {
  assets: [asset],
  projects: [project],
  publicationCutoff: '2026-07-30T00:00:00.000Z',
  schemaVersion: 1,
  sourceDigest,
}

const head = {
  schemaVersion: 1,
  collectionVersionId,
  snapshotObjectKey: `portfolio-collections/v1/snapshots/${collectionVersionId}.json`,
  snapshotDigest,
  sourceHeadSetDigest: sourceDigest,
  sourceDigest,
  publicationCutoff: snapshot.publicationCutoff,
  projectCount: 1,
  assetCount: 1,
  routeCount: 1,
  generation: 1,
  previousCollectionVersionId: null,
  previousSnapshotDigest: null,
  handoffReceiptId: receiptId,
  promotedAt: snapshot.publicationCutoff,
  producerRelease: '0.7.1-mmj-cms-worker-07-b',
}

const receipt = {
  schemaVersion: 1,
  receiptId,
  collectionVersionId,
  collectionHeadGeneration: 1,
  snapshotObjectKey: head.snapshotObjectKey,
  snapshotDigest,
  sourceHeadSetDigest: sourceDigest,
  sourceDigest,
  publicationCutoff: snapshot.publicationCutoff,
  projectCount: 1,
  assetCount: 1,
  routeCount: 1,
  routesDigest: canonicalDigest(routeSlugs),
  routeSlugs,
  activePublicationEvidence: [{
    projectId: project.id,
    publicationVersionId: 'pver_contract_sample',
    versionSnapshotDigest: '5'.repeat(64),
    publicationDigest: '6'.repeat(64),
  }],
  producerRelease: '0.7.1-mmj-cms-worker-07-b',
  createdAt: snapshot.publicationCutoff,
}

let passCount = 0
function pass(name, callback) {
  callback()
  passCount += 1
  process.stdout.write(`${name}: PASS\n`)
}
function reject(name, code, callback) {
  let caught = null
  try { callback() } catch (error) { caught = error }
  if (!caught || caught.code !== code) throw new Error(`${name}: expected ${code}, received ${caught?.code ?? 'none'}`)
  passCount += 1
  process.stdout.write(`${name}: PASS\n`)
}

pass('valid sealed contract', () => {
  validateHead(head)
  validateReceipt(receipt, head)
  validateSnapshot(snapshot, receipt)
  validateHeadStability(head, clone(head))
})
reject('approval state leak', 'E_MMJ_UI29_SNAPSHOT_INVALID', () => {
  const value = clone(snapshot)
  value.assets[0].approvalState = 'approved'
  validateSnapshot(value, receipt)
})
reject('required post missing', 'E_MMJ_UI29_SNAPSHOT_INVALID', () => {
  const value = clone(snapshot)
  delete value.projects[0].post
  validateSnapshot(value, receipt)
})
reject('unreachable asset denied', 'E_MMJ_UI29_SNAPSHOT_INVALID', () => {
  const value = clone(snapshot)
  const extra = clone(asset)
  extra.id = 'ast_ijklmnop'
  extra.renditions[0].objectKey = 'assets/image/ast_ijklmnop/primary.webp'
  value.assets.push(extra)
  validateSnapshot(value, { ...receipt, assetCount: 2 })
})
reject('route parity denied', 'E_MMJ_UI29_ROUTE_PARITY_MISMATCH', () => {
  validateSnapshot(snapshot, { ...receipt, routeSlugs: ['/works/different'] })
})
reject('head drift denied', 'E_MMJ_UI29_PORTFOLIO_HEAD_UNSTABLE', () => {
  validateHeadStability(head, { ...head, generation: 2 })
})
reject('control-plane key denied', 'E_MMJ_UI29_SNAPSHOT_INVALID', () => {
  const value = clone(snapshot)
  value.projects[0].operatorEmail = 'example@example.com'
  validateSnapshot(value, receipt)
})
reject('object-key traversal denied', 'E_MMJ_UI29_SNAPSHOT_INVALID', () => {
  const value = clone(snapshot)
  value.assets[0].renditions[0].objectKey = '../secret.webp'
  validateSnapshot(value, receipt)
})

console.log(JSON.stringify({ event: 'PASS_MMJ_UI29_A_CONTRACT_TESTS', testCount: passCount }))
