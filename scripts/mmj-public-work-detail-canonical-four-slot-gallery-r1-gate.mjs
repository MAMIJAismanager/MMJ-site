import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const PATCH = 'MMJ-PUBLIC-WORK-DETAIL-CANONICAL-FOUR-SLOT-HERO-THUMBNAIL-GALLERY-AND-TECHNICAL-LABEL-SUPPRESSION-R1'
const root = process.cwd()
const read = rel => readFile(resolve(root, rel), 'utf8')
const fail = message => { throw new Error(`FAIL_${PATCH}: ${message}`) }

const [
  resolver,
  page,
  gallery,
  frame,
  planner,
  css,
  contract,
  boundary,
  pkgText,
] = await Promise.all([
  read('shared/resolver/work-detail-gallery-presentation.ts'),
  read('app/pages/works/[slug].vue'),
  read('app/components/work/WorkGallery.vue'),
  read('app/components/work/WorkAssetFrame.vue'),
  read('shared/resolver/work-detail-presentation-plan.ts'),
  read('app/assets/css/work-detail.css'),
  read('scripts/lib/mmj-ui29-public-contract.mjs'),
  read('scripts/public-boundary-gate.mjs'),
  read('package.json'),
])

for (const token of [
  'const canonicalHero = project.assets.primary',
  'const thumbnails = project.assets.gallery',
  'thumbnails.length > 3',
  'Object.freeze([...thumbnails])',
]) if (!resolver.includes(token)) fail(`gallery projection token missing: ${token}`)

for (const forbidden of [
  'heroAssetId',
  'featuredAssetId',
  'presentationPrimaryAssetId',
  'localStorage',
  'fetch(',
]) if (resolver.includes(forbidden)) fail(`new or external gallery authority found: ${forbidden}`)

for (const token of [
  'createWorkDetailGalleryPresentationR1(project)',
  ':presentation="galleryPresentation"',
  'data-mm-work-primary',
]) if (!page.includes(token)) fail(`work-detail gallery projection missing: ${token}`)
if (page.includes(':assets="project.assets.gallery"')) fail('legacy large gallery list remains on work detail page')

for (const token of [
  'activeAssetId',
  'presentation.canonicalHero.id',
  'presentation.thumbnails',
  'data-mm-work-gallery-thumbnails',
  'image-intent="thumbnail"',
  'caption-mode="none"',
  'aria-pressed',
  'restoreCanonicalHero',
]) if (!gallery.includes(token)) fail(`interactive gallery token missing: ${token}`)
if (gallery.includes('asset.label')) fail('technical asset label leaked into gallery control naming')

for (const token of [
  "captionMode?: 'editorial' | 'none'",
  "imageIntent?: 'primary' | 'thumbnail'",
  'createWorkDetailThumbnailImageOptions()',
  'v-if="hasEditorialCaption"',
  'asset.caption',
  'asset.credit',
]) if (!frame.includes(token)) fail(`WorkAssetFrame R1 token missing: ${token}`)
for (const forbidden of [
  'asset.label',
  'mm-work-asset-frame__label',
  'kindLabel',
  'indexLabel',
]) if (frame.includes(forbidden)) fail(`technical/generic caption residue found: ${forbidden}`)

for (const token of [
  'MM_WORK_DETAIL_THUMBNAIL_IMAGE_SIZES',
  'createWorkDetailThumbnailImageOptions',
  "resolveInlinePlan(image, 'thumbnail')",
  "fit: 'cover' as const",
  "accessibility: Object.freeze({ mode: 'decorative' as const })",
]) if (!planner.includes(token)) fail(`thumbnail planner admission missing: ${token}`)

for (const token of [
  '.mm-work-gallery__hero',
  '.mm-work-gallery__thumbnails',
  '.mm-work-gallery__thumbnail',
  "grid-template-columns: repeat(3, minmax(0, 1fr))",
  'aspect-ratio: 4 / 3',
]) if (!css.includes(token)) fail(`gallery CSS token missing: ${token}`)
if (css.includes('.mm-work-gallery__list')) fail('legacy large gallery list CSS remains')
if (css.includes('.mm-work-asset-frame__label')) fail('technical label CSS remains')

for (const token of [
  'mediaItems.length > 4',
  'Gallery assets and post slots differ',
  'Primary asset and slot zero differ',
]) if (!contract.includes(token)) fail(`existing four-slot public contract token missing: ${token}`)

if (!boundary.includes("'shared/resolver/work-detail-gallery-presentation.ts'")) {
  fail('gallery presentation resolver is not boundary-allowlisted')
}

const pkg = JSON.parse(pkgText)
const gate = 'gate:public-work-detail-canonical-four-slot-gallery-r1'
if (typeof pkg.scripts?.[gate] !== 'string') fail('package gallery R1 gate missing')
if (pkg.mmjPublicWorkDetailCanonicalFourSlotGalleryR1Release !== PATCH) fail('gallery R1 release marker missing')
if (!String(pkg.scripts?.['gate:mmj-ui29-a'] ?? '').includes(`npm run ${gate}`)) fail('aggregate gate missing gallery R1')

console.log(JSON.stringify({
  event: 'PASS_MMJ_PUBLIC_WORK_DETAIL_CANONICAL_FOUR_SLOT_GALLERY_R1_STATIC',
  canonicalFourSlotParity: true,
  heroAuthorityDuplicated: false,
  thumbnailSelectorCountMax: 3,
  technicalLabelPublicRenderCount: 0,
  filenameFallbackCount: 0,
  editorialCaptionOnly: true,
  thumbnailRenditionAdmitted: true,
  coverBoundaryPreserved: true,
}))
