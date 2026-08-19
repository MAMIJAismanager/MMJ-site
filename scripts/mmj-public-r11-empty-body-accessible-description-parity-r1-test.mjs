import {
  importMmjSharedTypeScriptModule,
} from './lib/mmj-ui29-shared-typescript-loader.mjs'
import {
  validateAccessibleDescriptionResolutionAdmission,
} from './lib/mmj-ui29-public-contract.mjs'

const PATCH = 'MMJ-PUBLIC-R11-EMPTY-BODY-AND-ACCESSIBLE-DESCRIPTION-PARITY-R1'
const clone = value => structuredClone(value)
const assert = (condition, message) => { if (!condition) throw new Error(`FAIL_${PATCH}: ${message}`) }
let passCount = 0
function pass(name, callback) {
  callback()
  passCount += 1
  process.stdout.write(`${name}: PASS\n`)
}
async function passAsync(name, callback) {
  await callback()
  passCount += 1
  process.stdout.write(`${name}: PASS\n`)
}

const imageAsset = {
  schemaVersion: 1,
  id: 'ast_r11access001',
  kind: 'image',
  label: 'Meaningful label must never become public alt text',
  caption: null,
  credit: null,
  defaultRenditionId: 'primary-webp',
  renditions: [{
    id: 'primary-webp',
    purpose: 'primary',
    objectKey: 'assets/image/ast_r11access001/meaningful-filename.webp',
    mediaType: 'image/webp',
    byteSize: 128,
    sha256: '1'.repeat(64),
    metadata: { width: 1200, height: 900 },
  }],
  altText: null,
}

const baseProject = {
  schemaVersion: 1,
  id: 'prj_r11access001',
  slug: 'r11-empty-body-accessibility',
  title: 'Meaningful project title must never become public alt text',
  category: 'video',
  gatewayCategoryIds: ['video-production'],
  roles: [],
  tags: [{ token: 'accessibility', label: 'Accessibility' }],
  timing: { year: 2026, releaseDate: '2026-08-19' },
  client: null,
  summary: '',
  description: '',
  post: {
    comment: '',
    mediaItems: [{ position: 0, assetId: imageAsset.id }],
    tags: [{ token: 'accessibility', label: 'Accessibility' }],
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
    title: 'R11 accessibility | MMJ',
    description: '',
    ogAssetId: imageAsset.id,
    indexable: true,
  },
}

function snapshot(asset = imageAsset, project = baseProject) {
  return {
    assets: [clone(asset)],
    projects: [clone(project)],
    publicationCutoff: '2026-08-19T00:00:00.000Z',
    schemaVersion: 1,
    sourceDigest: 'a'.repeat(64),
  }
}

const authority = await importMmjSharedTypeScriptModule(
  process.cwd(),
  'shared/resolver/accessible-description-resolution.ts',
)
const queryModule = await importMmjSharedTypeScriptModule(
  process.cwd(),
  'shared/query/portfolio-snapshot-query.ts',
)
const viewModule = await importMmjSharedTypeScriptModule(
  process.cwd(),
  'shared/resolver/portfolio-project-view-resolver.ts',
)

function resolveView(value) {
  const queries = queryModule.createPortfolioSnapshotQueryAuthority(value)
  const views = viewModule.createPortfolioProjectViewResolver(value, queries)
  const project = views.findWorkDetailById(value.projects[0].id)
  assert(project !== null, 'fixture Work Detail view missing')
  const asset = project.assets.primary
  assert(asset !== null && asset.kind === 'image', 'fixture primary image missing')
  return { project, asset }
}

pass('canonical R11 empty body resolves description absence', () => {
  const value = snapshot()
  const { project, asset } = resolveView(value)
  const resolved = authority.resolveWorkDetailAccessibleDescription(project, asset, 'primary-image')
  assert(resolved === null, 'empty-body source absence did not resolve null')
})

pass('canonical R11 empty body becomes decorative accessibility', () => {
  const value = snapshot()
  const { project, asset } = resolveView(value)
  const accessibility = authority.resolveWorkDetailImageAccessibility(project, asset, 'primary-image')
  assert(accessibility.mode === 'decorative', 'empty-body image did not become decorative')
})

pass('explicit alt remains highest-priority override', () => {
  const assetSource = clone(imageAsset)
  assetSource.altText = 'Explicit image description'
  assetSource.caption = 'Caption must not override explicit alt.'
  const projectSource = clone(baseProject)
  projectSource.description = 'Project body must not override explicit alt.'
  projectSource.summary = 'Summary must not override explicit alt.'
  const value = snapshot(assetSource, projectSource)
  const { project, asset } = resolveView(value)
  const resolved = authority.resolveWorkDetailAccessibleDescription(project, asset, 'primary-image')
  assert(resolved?.text === 'Explicit image description', 'explicit alt precedence drifted')
  assert(resolved?.provenance === 'explicit-alt', 'explicit alt provenance drifted')
  assert(resolved?.derived === false, 'explicit alt marked derived')
})

pass('media caption remains first derived fallback', () => {
  const assetSource = clone(imageAsset)
  assetSource.caption = 'Media caption description.'
  const projectSource = clone(baseProject)
  projectSource.description = 'Project body description.'
  projectSource.summary = 'Project summary description.'
  const value = snapshot(assetSource, projectSource)
  const { project, asset } = resolveView(value)
  const resolved = authority.resolveWorkDetailAccessibleDescription(project, asset, 'primary-image')
  assert(resolved?.text === 'Media caption description.', 'caption fallback drifted')
  assert(resolved?.provenance === 'media-caption', 'caption provenance drifted')
})

pass('project body remains accessible-description authority', () => {
  const projectSource = clone(baseProject)
  projectSource.description = 'Project body accessible description. Second sentence.'
  projectSource.post.comment = projectSource.description
  projectSource.summary = 'Project summary fallback.'
  const value = snapshot(imageAsset, projectSource)
  const { project, asset } = resolveView(value)
  const resolved = authority.resolveWorkDetailAccessibleDescription(project, asset, 'primary-image')
  assert(resolved?.text === 'Project body accessible description.', 'body sentence selection drifted')
  assert(resolved?.provenance === 'project-description', 'body provenance drifted')
})

pass('project summary remains secondary body fallback', () => {
  const projectSource = clone(baseProject)
  projectSource.description = ''
  projectSource.post.comment = ''
  projectSource.summary = 'Project summary accessible description.'
  const value = snapshot(imageAsset, projectSource)
  const { project, asset } = resolveView(value)
  const resolved = authority.resolveWorkDetailAccessibleDescription(project, asset, 'primary-image')
  assert(resolved?.text === 'Project summary accessible description.', 'summary fallback drifted')
  assert(resolved?.provenance === 'project-summary', 'summary provenance drifted')
})

pass('generic-only candidates resolve to decorative absence', () => {
  const assetSource = clone(imageAsset)
  assetSource.caption = '이미지'
  const projectSource = clone(baseProject)
  projectSource.description = '사진'
  projectSource.post.comment = '사진'
  projectSource.summary = '그림'
  const value = snapshot(assetSource, projectSource)
  const { project, asset } = resolveView(value)
  assert(authority.resolveWorkDetailAccessibleDescription(project, asset, 'primary-image') === null, 'generic candidates fabricated description')
  assert(authority.resolveWorkDetailImageAccessibility(project, asset, 'primary-image').mode === 'decorative', 'generic candidates did not become decorative')
})

pass('project title asset label and filename never synthesize description', () => {
  const value = snapshot()
  const { project, asset } = resolveView(value)
  const resolved = authority.resolveWorkDetailAccessibleDescription(project, asset, 'primary-image')
  assert(resolved === null, 'title, label, or filename was used as hidden fallback')
})

pass('invalid explicit alt still fails before valid body fallback', () => {
  const assetSource = clone(imageAsset)
  assetSource.altText = ' bad '
  const projectSource = clone(baseProject)
  projectSource.description = 'This valid body must not silently replace malformed explicit alt.'
  projectSource.post.comment = projectSource.description
  let caught = null
  const value = snapshot(assetSource, projectSource)
  const { project, asset } = resolveView(value)
  try {
    authority.resolveWorkDetailAccessibleDescription(project, asset, 'primary-image')
  } catch (error) {
    caught = error
  }
  assert(caught?.code === 'invalid-explicit-image-alt', 'malformed explicit alt was silently replaced')
})

pass('admission receipt seals decorative absence without snapshot mutation', () => {
  const value = snapshot()
  const before = JSON.stringify(value)
  const receipts = authority.admitPortfolioAccessibleDescriptions(value)
  assert(receipts.length === 1, 'unexpected R11 receipt count')
  assert(receipts[0].context === 'primary-image', 'primary-image context drifted')
  assert(receipts[0].accessibilityMode === 'decorative', 'absence receipt did not seal decorative')
  assert(receipts[0].provenance === null, 'absence receipt fabricated provenance')
  assert(receipts[0].sourcePath === null, 'absence receipt fabricated source path')
  assert(JSON.stringify(value) === before, 'admission mutated canonical snapshot')
})

await passAsync('public contract admits historical-style R11 empty body', async () => {
  const value = snapshot()
  const before = JSON.stringify(value)
  const receipts = await validateAccessibleDescriptionResolutionAdmission(value, { sourceRoot: process.cwd() })
  assert(receipts.length === 1, 'public contract emitted unexpected receipt count')
  assert(receipts[0].accessibilityMode === 'decorative', 'public contract did not admit decorative absence')
  assert(JSON.stringify(value) === before, 'public contract mutated historical-style snapshot')
})

await passAsync('public contract still rejects malformed explicit alt', async () => {
  const assetSource = clone(imageAsset)
  assetSource.altText = '   '
  const projectSource = clone(baseProject)
  projectSource.description = 'Valid body cannot override malformed explicit alt.'
  projectSource.post.comment = projectSource.description
  let caught = null
  try {
    await validateAccessibleDescriptionResolutionAdmission(
      snapshot(assetSource, projectSource),
      { sourceRoot: process.cwd() },
    )
  } catch (error) {
    caught = error
  }
  assert(caught?.code === 'E_MMJ_PUBLIC_EXPLICIT_IMAGE_ALT_TEXT_INVALID', 'public invalid-alt rejection drifted')
})

console.log(JSON.stringify({
  event: 'PASS_MMJ_PUBLIC_R11_EMPTY_BODY_AND_ACCESSIBLE_DESCRIPTION_PARITY_R1_TESTS',
  release: PATCH,
  testCount: passCount,
}))
