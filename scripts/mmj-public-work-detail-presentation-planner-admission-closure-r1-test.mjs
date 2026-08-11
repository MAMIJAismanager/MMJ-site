import {
  importMmjSharedTypeScriptModule,
} from './lib/mmj-ui29-shared-typescript-loader.mjs'
import {
  validateWorkDetailPresentationAdmission,
} from './lib/mmj-ui29-public-contract.mjs'

const MEDIA_BASE_URL = 'https://media.mamajing.work'
const clone = value => structuredClone(value)
const assert = (condition, message) => { if (!condition) throw new Error(message) }

const imageAsset = {
  schemaVersion: 1,
  id: 'ast_plannerimg',
  kind: 'image',
  label: 'Planner image',
  caption: null,
  credit: null,
  defaultRenditionId: 'primary-webp',
  renditions: [{
    id: 'primary-webp',
    purpose: 'primary',
    objectKey: 'assets/image/ast_plannerimg/primary.webp',
    mediaType: 'image/webp',
    byteSize: 128,
    sha256: '1'.repeat(64),
    metadata: { width: 1200, height: 900 },
  }],
  altText: null,
}

const baseProject = {
  schemaVersion: 1,
  id: 'prj_planner01',
  slug: 'planner-one',
  title: 'Planner one',
  category: 'video',
  gatewayCategoryIds: ['video-production'],
  roles: [],
  tags: [{ token: 'planner', label: 'Planner' }],
  timing: { year: 2026, releaseDate: '2026-08-11' },
  client: null,
  summary: 'Planner summary.',
  description: 'Planner description for the primary image.',
  post: {
    comment: 'Planner description for the primary image.',
    mediaItems: [{ position: 0, assetId: imageAsset.id }],
    tags: [{ token: 'planner', label: 'Planner' }],
  },
  credits: [],
  externalLinks: [],
  relatedProjectIds: [],
  assets: {
    coverAssetId: imageAsset.id,
    backdropAssetId: null,
    primaryAssetId: imageAsset.id,
    galleryAssetIds: [],
  },
  featured: false,
  order: 1,
  seo: {
    title: 'Planner one | MMJ',
    description: 'Planner SEO',
    ogAssetId: imageAsset.id,
    indexable: true,
  },
}

function snapshot(assets, projects) {
  return {
    assets,
    projects,
    publicationCutoff: '2026-08-11T00:00:00.000Z',
    schemaVersion: 1,
    sourceDigest: 'a'.repeat(64),
  }
}

async function expectPlanningFailure(value, expectedCode) {
  const authority = await importMmjSharedTypeScriptModule(
    process.cwd(),
    'shared/resolver/work-detail-presentation-plan.ts',
  )
  let caught = null
  try {
    authority.admitPortfolioWorkDetailPresentations(value, MEDIA_BASE_URL)
  } catch (error) {
    caught = error
  }
  assert(caught?.name === 'WorkDetailPresentationPlanningError', 'expected WorkDetailPresentationPlanningError')
  assert(caught?.underlyingErrorCode === expectedCode, `expected ${expectedCode}, got ${caught?.underlyingErrorCode ?? 'none'}`)
  return caught
}

const authority = await importMmjSharedTypeScriptModule(
  process.cwd(),
  'shared/resolver/work-detail-presentation-plan.ts',
)

const valid = authority.admitPortfolioWorkDetailPresentations(
  snapshot([imageAsset], [baseProject]),
  MEDIA_BASE_URL,
)
assert(valid.length === 1, 'valid image project admission count drifted')
assert(valid[0].route === '/works/planner-one', 'valid route drifted')
assert(valid[0].plans.some(plan => plan.planner === 'responsive-image'), 'responsive image planner was not exercised')
console.log('derived primary image planner admission: PASS')

const invalidExplicitAsset = clone(imageAsset)
invalidExplicitAsset.altText = ' bad '
const invalidExplicitFailure = await expectPlanningFailure(
  snapshot([invalidExplicitAsset], [clone(baseProject)]),
  'invalid-explicit-image-alt',
)
assert(invalidExplicitFailure.projectId === baseProject.id, 'project diagnostic drifted')
assert(invalidExplicitFailure.assetId === imageAsset.id, 'asset diagnostic drifted')
console.log('accessible description error preservation: PASS')

const poster = {
  ...clone(imageAsset),
  id: 'ast_plnposter',
  label: 'Poster',
  defaultRenditionId: 'poster-primary',
  renditions: [{
    id: 'poster-primary',
    purpose: 'primary',
    objectKey: 'assets/image/ast_plnposter/poster.webp',
    mediaType: 'image/webp',
    byteSize: 128,
    sha256: '2'.repeat(64),
    metadata: { width: 1600, height: 900 },
  }],
  altText: null,
}
const video = {
  schemaVersion: 1,
  id: 'ast_plnvideo1',
  kind: 'video',
  label: 'Video',
  caption: null,
  credit: null,
  defaultRenditionId: 'preview-mp4',
  renditions: [
    {
      id: 'primary-mp4',
      purpose: 'primary',
      objectKey: 'assets/video/ast_plnvideo1/primary.mp4',
      mediaType: 'video/mp4',
      byteSize: 256,
      sha256: '3'.repeat(64),
      metadata: { width: 1600, height: 900, durationMs: 1200, hasAudio: true },
    },
    {
      id: 'preview-mp4',
      purpose: 'preview',
      objectKey: 'assets/video/ast_plnvideo1/preview.mp4',
      mediaType: 'video/mp4',
      byteSize: 192,
      sha256: '4'.repeat(64),
      metadata: { width: 1600, height: 900, durationMs: 1200, hasAudio: true },
    },
  ],
  posterAssetId: poster.id,
}
const videoProject = {
  ...clone(baseProject),
  id: 'prj_planner02',
  slug: 'planner-two',
  post: { ...clone(baseProject.post), mediaItems: [{ position: 0, assetId: video.id }] },
  assets: { coverAssetId: poster.id, backdropAssetId: null, primaryAssetId: video.id, galleryAssetIds: [] },
  seo: { ...clone(baseProject.seo), ogAssetId: poster.id },
}
const videoFailure = await expectPlanningFailure(
  snapshot([poster, video], [videoProject]),
  'video-player-default-source-mismatch',
)
assert(videoFailure.planner === 'video-player', 'video planner identity drifted')
console.log('video default-source planner parity: PASS')

const galleryVideo = clone(video)
galleryVideo.id = 'ast_plnvideo2'
galleryVideo.defaultRenditionId = 'preview-mp4'
galleryVideo.renditions = [{ ...galleryVideo.renditions[1], objectKey: 'assets/video/ast_plnvideo2/preview.mp4' }]
galleryVideo.posterAssetId = poster.id
const galleryProject = clone(baseProject)
galleryProject.id = 'prj_planner03'
galleryProject.slug = 'planner-three'
galleryProject.assets.galleryAssetIds = [galleryVideo.id]
galleryProject.post.mediaItems = [
  { position: 0, assetId: imageAsset.id },
  { position: 1, assetId: galleryVideo.id },
]
const galleryResult = authority.admitPortfolioWorkDetailPresentations(
  snapshot([imageAsset, poster, galleryVideo], [galleryProject]),
  MEDIA_BASE_URL,
)
assert(!galleryResult[0].plans.some(plan => plan.assetId === galleryVideo.id && plan.planner === 'video-player'), 'gallery video incorrectly invoked video player')
assert(galleryResult[0].plans.some(plan => plan.assetId === poster.id && plan.planner === 'responsive-image'), 'gallery poster image planner was not exercised')
console.log('gallery video no-overvalidation parity: PASS')

let mapped = null
try {
  await validateWorkDetailPresentationAdmission(
    snapshot([invalidExplicitAsset], [clone(baseProject)]),
    { sourceRoot: process.cwd(), mediaBaseUrl: MEDIA_BASE_URL },
  )
} catch (error) {
  mapped = error
}
assert(mapped?.code === 'E_MMJ_PUBLIC_WORK_PRESENTATION_PLANNER_FAILED', 'Ui29 planner mapping drifted')
assert(mapped?.details?.underlyingErrorCode === 'invalid-explicit-image-alt', 'Ui29 underlying accessible-description code was erased')
console.log('Ui29 planner diagnostic mapping: PASS')

console.log(JSON.stringify({
  event: 'PASS_MMJ_PUBLIC_WORK_DETAIL_PRESENTATION_PLANNER_ADMISSION_CLOSURE_R1_TESTS',
  testCount: 5,
}))
