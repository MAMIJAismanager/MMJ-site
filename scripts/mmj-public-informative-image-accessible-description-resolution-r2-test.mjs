import {
  importMmjSharedTypeScriptModule,
} from './lib/mmj-ui29-shared-typescript-loader.mjs'
import {
  validateAccessibleDescriptionResolutionAdmission,
} from './lib/mmj-ui29-public-contract.mjs'

const clone = value => structuredClone(value)
const assert = (condition, message) => { if (!condition) throw new Error(message) }
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
  id: 'ast_descrimg1',
  kind: 'image',
  label: 'Main image',
  caption: null,
  credit: null,
  defaultRenditionId: 'primary-webp',
  renditions: [{
    id: 'primary-webp',
    purpose: 'primary',
    objectKey: 'assets/image/ast_descrimg1/primary.webp',
    mediaType: 'image/webp',
    byteSize: 128,
    sha256: '1'.repeat(64),
    metadata: { width: 1200, height: 900 },
  }],
  altText: null,
}

const baseProject = {
  schemaVersion: 1,
  id: 'prj_descr001',
  slug: 'description-one',
  title: 'Description one',
  category: 'video',
  gatewayCategoryIds: ['video-production'],
  roles: [],
  tags: [{ token: 'description', label: 'Description' }],
  timing: { year: 2026, releaseDate: '2026-08-11' },
  client: null,
  summary: 'Summary fallback sentence.',
  description: 'Project body first sentence. Project body second sentence.',
  post: {
    comment: 'Project body first sentence. Project body second sentence.',
    mediaItems: [{ position: 0, assetId: imageAsset.id }],
    tags: [{ token: 'description', label: 'Description' }],
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
    title: 'Description one | MMJ',
    description: 'Description SEO',
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
  if (project === null) throw new Error('fixture project view missing')
  const asset = project.assets.primary
  if (asset === null || asset.kind !== 'image') throw new Error('fixture primary image missing')
  return { project, asset }
}

pass('explicit alt override wins', () => {
  const asset = clone(imageAsset)
  asset.altText = 'Explicit accessible description'
  asset.caption = 'Caption should not win'
  const value = snapshot([asset], [{ ...clone(baseProject), assets: { ...clone(baseProject.assets), coverAssetId: asset.id, primaryAssetId: asset.id }, post: { ...clone(baseProject.post), mediaItems: [{ position: 0, assetId: asset.id }] }, seo: { ...clone(baseProject.seo), ogAssetId: asset.id } }])
  const { project, asset: viewAsset } = resolveView(value)
  const result = authority.resolveWorkDetailAccessibleDescription(project, viewAsset, 'primary-image')
  assert(result?.text === 'Explicit accessible description', 'explicit text drifted')
  assert(result?.provenance === 'explicit-alt', 'explicit provenance drifted')
  assert(result?.derived === false, 'explicit description marked derived')
})

pass('caption fallback is deterministic', () => {
  const asset = clone(imageAsset)
  asset.caption = 'Caption accessible description.'
  const value = snapshot([asset], [clone(baseProject)])
  const { project, asset: viewAsset } = resolveView(value)
  const result = authority.resolveWorkDetailAccessibleDescription(project, viewAsset, 'primary-image')
  assert(result?.text === 'Caption accessible description.', 'caption text drifted')
  assert(result?.provenance === 'media-caption', 'caption provenance drifted')
})

pass('project body fallback retires duplicate authoring requirement', () => {
  const value = snapshot([clone(imageAsset)], [clone(baseProject)])
  const { project, asset } = resolveView(value)
  const first = authority.resolveWorkDetailAccessibleDescription(project, asset, 'primary-image')
  const second = authority.resolveWorkDetailAccessibleDescription(project, asset, 'primary-image')
  assert(first?.text === 'Project body first sentence.', 'project body sentence selection drifted')
  assert(first?.provenance === 'project-description', 'project body provenance drifted')
  assert(JSON.stringify(first) === JSON.stringify(second), 'resolution is not deterministic')
})

pass('summary fallback follows unusable body', () => {
  const projectSource = clone(baseProject)
  projectSource.description = '이미지'
  projectSource.post.comment = '이미지'
  const value = snapshot([clone(imageAsset)], [projectSource])
  const { project, asset } = resolveView(value)
  const result = authority.resolveWorkDetailAccessibleDescription(project, asset, 'primary-image')
  assert(result?.text === 'Summary fallback sentence.', 'summary fallback text drifted')
  assert(result?.provenance === 'project-summary', 'summary fallback provenance drifted')
})

pass('invalid explicit override is not silently replaced', () => {
  const assetSource = clone(imageAsset)
  assetSource.altText = '   '
  const value = snapshot([assetSource], [clone(baseProject)])
  const { project, asset } = resolveView(value)
  let caught = null
  try {
    authority.resolveWorkDetailAccessibleDescription(project, asset, 'primary-image')
  } catch (error) {
    caught = error
  }
  assert(caught?.name === 'AccessibleDescriptionResolutionError', 'wrong explicit error class')
  assert(caught?.code === 'invalid-explicit-image-alt', 'invalid explicit error code drifted')
})

pass('decorative primary video poster skips description resolution', () => {
  const assetSource = clone(imageAsset)
  const value = snapshot([assetSource], [clone(baseProject)])
  const { project, asset } = resolveView(value)
  const result = authority.resolveWorkDetailAccessibleDescription(project, asset, 'primary-video-poster')
  assert(result === null, 'decorative poster unexpectedly resolved description')
  const accessibility = authority.resolveWorkDetailImageAccessibility(project, asset, 'primary-video-poster')
  assert(accessibility.mode === 'decorative', 'decorative accessibility drifted')
})

pass('fully absent informative-intent image becomes decorative without synthesis', () => {
  const assetSource = clone(imageAsset)
  const projectSource = clone(baseProject)
  projectSource.description = '이미지'
  projectSource.summary = '사진'
  projectSource.post.comment = '이미지'
  const value = snapshot([assetSource], [projectSource])
  const { project, asset } = resolveView(value)
  const resolved = authority.resolveWorkDetailAccessibleDescription(project, asset, 'primary-image')
  assert(resolved === null, 'canonical source absence did not resolve null')
  const accessibility = authority.resolveWorkDetailImageAccessibility(project, asset, 'primary-image')
  assert(accessibility.mode === 'decorative', 'canonical source absence did not become decorative')
})

pass('admission leaves canonical snapshot untouched', () => {
  const value = snapshot([clone(imageAsset)], [clone(baseProject)])
  const before = JSON.stringify(value)
  const receipts = authority.admitPortfolioAccessibleDescriptions(value)
  assert(receipts.length >= 1, 'admission emitted no receipts')
  assert(receipts[0].provenance === 'project-description', 'admission provenance drifted')
  assert(JSON.stringify(value) === before, 'admission mutated canonical snapshot')
})

await passAsync('public contract admits canonical source absence as decorative', async () => {
  const projectSource = clone(baseProject)
  projectSource.description = ''
  projectSource.summary = ''
  projectSource.post.comment = ''
  const value = snapshot([clone(imageAsset)], [projectSource])
  const before = JSON.stringify(value)
  const receipts = await validateAccessibleDescriptionResolutionAdmission(
    value,
    { sourceRoot: process.cwd() },
  )
  assert(receipts.length >= 1, 'public absence admission emitted no receipt')
  assert(receipts[0].context === 'primary-image', 'public absence context drifted')
  assert(receipts[0].accessibilityMode === 'decorative', 'public absence did not admit decorative')
  assert(receipts[0].provenance === null, 'public absence fabricated provenance')
  assert(JSON.stringify(value) === before, 'public absence admission mutated snapshot')
})

await passAsync('public contract maps invalid explicit override separately', async () => {
  const assetSource = clone(imageAsset)
  assetSource.altText = ' bad '
  let caught = null
  try {
    await validateAccessibleDescriptionResolutionAdmission(
      snapshot([assetSource], [clone(baseProject)]),
      { sourceRoot: process.cwd() },
    )
  } catch (error) {
    caught = error
  }
  assert(caught?.code === 'E_MMJ_PUBLIC_EXPLICIT_IMAGE_ALT_TEXT_INVALID', 'public explicit error mapping drifted')
})

console.log(JSON.stringify({
  event: 'PASS_MMJ_PUBLIC_INFORMATIVE_IMAGE_ACCESSIBLE_DESCRIPTION_RESOLUTION_R2_TESTS',
  testCount: passCount,
}))
