import {
  canonicalDigest,
  createBuildInputLock,
  PRODUCER_RELEASE,
  validateHead,
  validateHeadStability,
  validateReceipt,
  validateSnapshot,
} from './lib/mmj-ui29-public-contract.mjs'

const clone = value => structuredClone(value)
const EXPECTED_PORTFOLIO_PRODUCER_RELEASE = '0.7.21-mmj-immediate-publication-fast-lane-r14c'
const LEGACY_PORTFOLIO_PRODUCER_RELEASE = '0.7.1-mmj-cms-worker-07-b'
const sourceDigest = '1'.repeat(64)
const snapshotDigest = '2'.repeat(64)
const collectionVersionId = `pcol_${snapshotDigest.slice(0, 26)}`
const receiptId = `phnd_${'3'.repeat(26)}`
const routeSlugs = ['contract-sample']

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
  producerRelease: EXPECTED_PORTFOLIO_PRODUCER_RELEASE,
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
  producerRelease: EXPECTED_PORTFOLIO_PRODUCER_RELEASE,
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
// MMJ-PUBLIC-TAG-TOKEN-UNICODE-AUTHORITY-LEGACY-SLUG-RETIREMENT-R1: BEGIN
pass('unicode tag token admitted', () => {
  const value = clone(snapshot)
  value.projects[0].tags = [{ token: '1인', label: '1인' }]
  value.projects[0].post.tags = [{ token: '1인', label: '1인' }]
  validateSnapshot(value, receipt)
})
reject('empty tag token remains denied', 'E_MMJ_UI29_SNAPSHOT_INVALID', () => {
  const value = clone(snapshot)
  value.projects[0].tags = [{ token: '', label: 'Empty' }]
  value.projects[0].post.tags = [{ token: '', label: 'Empty' }]
  validateSnapshot(value, receipt)
})
reject('unicode project and post tag identity mismatch denied', 'E_MMJ_UI29_SNAPSHOT_INVALID', () => {
  const value = clone(snapshot)
  value.projects[0].tags = [{ token: '1인', label: '1인' }]
  value.projects[0].post.tags = [{ token: '1-in', label: '1인' }]
  validateSnapshot(value, receipt)
})
// MMJ-PUBLIC-TAG-TOKEN-UNICODE-AUTHORITY-LEGACY-SLUG-RETIREMENT-R1: END
pass('current portfolio producer release authority', () => {
  if (PRODUCER_RELEASE !== EXPECTED_PORTFOLIO_PRODUCER_RELEASE) {
    throw new Error(`portfolio producer release drifted: ${PRODUCER_RELEASE}`)
  }
})
pass('build input lock carries current producer identity', () => {
  const lock = createBuildInputLock({
    upstreamOrigin: 'https://cms.mamajing.work',
    head,
    receipt,
    handoffReceiptDigest: '7'.repeat(64),
  })
  if (lock.producerRelease !== EXPECTED_PORTFOLIO_PRODUCER_RELEASE) {
    throw new Error('build input lock producer release drifted')
  }
})
pass('canonical empty collection admitted', () => {
  const emptySnapshot = {
    assets: [],
    projects: [],
    publicationCutoff: snapshot.publicationCutoff,
    schemaVersion: 1,
    sourceDigest,
  }
  const emptySnapshotDigest = canonicalDigest(emptySnapshot)
  const emptyCollectionVersionId = `pcol_${emptySnapshotDigest.slice(0, 26)}`
  const emptyReceiptId = `phnd_${'8'.repeat(26)}`
  const emptyHead = {
    ...clone(head),
    collectionVersionId: emptyCollectionVersionId,
    snapshotObjectKey: `portfolio-collections/v1/snapshots/${emptyCollectionVersionId}.json`,
    snapshotDigest: emptySnapshotDigest,
    projectCount: 0,
    assetCount: 0,
    routeCount: 0,
    handoffReceiptId: emptyReceiptId,
  }
  const emptyReceipt = {
    ...clone(receipt),
    receiptId: emptyReceiptId,
    collectionVersionId: emptyCollectionVersionId,
    snapshotObjectKey: emptyHead.snapshotObjectKey,
    snapshotDigest: emptySnapshotDigest,
    projectCount: 0,
    assetCount: 0,
    routeCount: 0,
    routesDigest: canonicalDigest([]),
    routeSlugs: [],
    activePublicationEvidence: [],
  }
  validateHead(emptyHead)
  validateReceipt(emptyReceipt, emptyHead)
  const result = validateSnapshot(emptySnapshot, emptyReceipt)
  if (result.routes.length !== 0) throw new Error('empty collection projected unexpected routes')
})
reject('legacy 0.7.1 head producer release denied', 'E_MMJ_UI29_HEAD_INVALID', () => {
  validateHead({ ...clone(head), producerRelease: LEGACY_PORTFOLIO_PRODUCER_RELEASE })
})
reject('legacy 0.7.1 receipt producer release denied', 'E_MMJ_UI29_RECEIPT_INVALID', () => {
  validateReceipt({ ...clone(receipt), producerRelease: LEGACY_PORTFOLIO_PRODUCER_RELEASE }, head)
})
reject('unknown future producer release denied', 'E_MMJ_UI29_HEAD_INVALID', () => {
  validateHead({ ...clone(head), producerRelease: '0.7.22-mmj-portfolio-future' })
})
pass('numeric route slug admitted while manifest route stays canonical', () => {
  const numericProject = { ...clone(project), slug: '231312' }
  const numericSnapshot = { ...clone(snapshot), projects: [numericProject] }
  const numericRouteSlugs = ['231312']
  const numericReceipt = {
    ...clone(receipt),
    routesDigest: canonicalDigest(numericRouteSlugs),
    routeSlugs: numericRouteSlugs,
  }
  validateReceipt(numericReceipt, head)
  const result = validateSnapshot(numericSnapshot, numericReceipt)
  if (result.routes[0] !== '/works/231312') throw new Error('numeric slug route manifest projection drifted')
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
  validateSnapshot(snapshot, { ...receipt, routeSlugs: ['different'] })
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
