import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')

function fail(code, message, details = undefined) {
  const error = new Error(message)
  error.name = code
  error.code = code
  error.details = details
  throw error
}

const [
  worksPage,
  aboutPage,
  contactPage,
  siteInformation,
  workHeader,
  workAssetFrame,
  workDetailPage,
  workDetailCss,
  packageText,
] = await Promise.all([
  read('app/pages/works/index.vue'),
  read('app/pages/about.vue'),
  read('app/pages/contact.vue'),
  read('app/content/site-information.ts'),
  read('app/components/work/WorkDetailHeader.vue'),
  read('app/components/work/WorkAssetFrame.vue'),
  read('app/pages/works/[slug].vue'),
  read('app/assets/css/work-detail.css'),
  read('package.json'),
])

const pkg = JSON.parse(packageText)

for (const [path, source, required] of [
  [
    'app/pages/works/index.vue',
    worksPage,
    [
      'useSeoMeta({',
      'title: WORKS_SEO.title',
      'description: WORKS_SEO.description',
      "robots: 'index,follow'",
      "title: '작업 | 매미: 著'",
      'description:',
      "'매미: 著의 공개 작업과 프로젝트를 한곳에서 확인합니다.'",
    ],
  ],
  [
    'app/pages/about.vue',
    aboutPage,
    [
      'useSeoMeta({',
      'title: commissionGuide.seoTitle',
      'description: commissionGuide.seoDescription',
      "robots: 'index,follow'",
    ],
  ],
  [
    'app/pages/contact.vue',
    contactPage,
    [
      'useSeoMeta({',
      'title: contact.seoTitle',
      'description: contact.seoDescription',
      "robots: 'index,follow'",
    ],
  ],
]) {
  for (const signature of required) {
    if (!source.includes(signature)) {
      fail(
        'E_MMJ_PUBLIC_ROUTE_SEO_BINDING_MISSING',
        'Three-route SEO binding is incomplete.',
        { path, signature },
      )
    }
  }
}

const worksSeoBlock = worksPage.match(/useSeoMeta\(\{[\s\S]*?\}\)/)?.[0] ?? ''
for (const signature of ['route.query', 'activeGatewayCategory', 'evaluation.resultCount', 'state.value']) {
  if (worksSeoBlock.includes(signature)) {
    fail(
      'E_MMJ_WORKS_SEO_QUERY_COUPLING',
      'Works SEO is coupled to client query state.',
      { signature },
    )
  }
}

for (const signature of [
  'readonly seoTitle: string',
  'readonly seoDescription: string',
  "seoTitle: '프로젝트 문의 | 매미: 著'",
  "seoDescription:",
  "'협업과 프로젝트 문의를 위한 안내 및 외부 문의 양식을 확인합니다.'",
]) {
  if (!siteInformation.includes(signature)) {
    fail(
      'E_MMJ_CONTACT_SEO_SSOT_BYPASS',
      'Contact SEO SSOT is incomplete.',
      { signature },
    )
  }
}

for (const signature of [
  'project.summary',
  'project.tags',
  'data-mm-work-tags',
  'mm-work-detail-header__summary',
  'mm-work-detail-header__tags',
  'aria-label="태그"',
]) {
  if (workHeader.includes(signature)) {
    fail(
      'E_MMJ_WORK_DETAIL_HEADER_AUXILIARY_RESIDUE',
      'Retired work-detail summary or tag projection remains.',
      { signature },
    )
  }
}

for (const signature of [
  'data-mm-work-detail-header',
  'project.category.label',
  'project.title',
]) {
  if (!workHeader.includes(signature)) {
    fail(
      'E_MMJ_WORK_DETAIL_HEADER_AUTHORITY_REGRESSION',
      'Required work-detail title authority is missing.',
      { signature },
    )
  }
}

for (const signature of [
  "captionMode?: 'full' | 'none'",
  "captionMode: 'full'",
  'v-if="captionMode === \'full\'"',
  'asset.label',
  'asset.caption',
  'asset.credit',
  'contextLabel',
  'kindLabel',
]) {
  if (!workAssetFrame.includes(signature)) {
    fail(
      'E_MMJ_WORK_ASSET_CAPTION_AUTHORITY_REMOVED',
      'Generic work-asset caption authority is incomplete.',
      { signature },
    )
  }
}

for (const signature of [
  'context-label="주요 미디어"',
  'caption-mode="none"',
  'video-runtime="primary-detail"',
  'audio-runtime="primary-detail"',
  'data-mm-work-description',
  'project.description',
]) {
  if (!workDetailPage.includes(signature)) {
    fail(
      'E_MMJ_WORK_PRIMARY_CAPTION_SUPPRESSION_MISSING',
      'Primary media suppression or description preservation is incomplete.',
      { signature },
    )
  }
}

for (const signature of [
  '.mm-work-detail-header__summary',
  '.mm-work-detail-header__tags',
]) {
  if (workDetailCss.includes(signature)) {
    fail(
      'E_MMJ_WORK_DETAIL_LEAN_CSS_RESIDUE',
      'Retired work-detail header CSS remains.',
      { signature },
    )
  }
}

if (!workDetailCss.includes('.mm-work-asset-frame__caption')) {
  fail(
    'E_MMJ_GALLERY_CAPTION_CSS_REMOVED',
    'Generic gallery caption CSS was removed.',
  )
}

if (
  pkg.scripts?.['verify:three-route-seo-lean-work-detail']
  !== 'node scripts/mmj-ui29-three-route-seo-lean-work-detail-gate.mjs'
) {
  fail(
    'E_MMJ_THREE_ROUTE_SEO_GATE_SCRIPT_MISSING',
    'Package gate script is missing.',
  )
}

if (
  !String(pkg.scripts?.['gate:mmj-ui29-a'] ?? '')
    .includes('verify:three-route-seo-lean-work-detail')
) {
  fail(
    'E_MMJ_THREE_ROUTE_SEO_AGGREGATE_GATE_MISSING',
    'Aggregate gate does not include the new source gate.',
  )
}

if (
  pkg.mmjThreeRouteSeoLeanWorkDetailRelease
  !== 'MMJ-PUBLIC-THREE-ROUTE-SEO-LEAN-WORK-DETAIL-R1'
) {
  fail(
    'E_MMJ_THREE_ROUTE_SEO_RELEASE_IDENTITY_MISSING',
    'Release identity is missing.',
  )
}

console.log(JSON.stringify({
  event: 'PASS_MMJ_PUBLIC_THREE_ROUTE_SEO_LEAN_WORK_DETAIL_R1',
  seoRoutes: ['/works', '/about', '/contact'],
  seoTitleBindings: 'closed',
  seoDescriptionBindings: 'closed',
  seoRobotsBindings: 'closed',
  workHeaderSummary: 'absent',
  workHeaderTags: 'absent',
  primaryMediaCaption: 'absent',
  galleryCaptionAuthority: 'preserved',
  projectDescription: 'preserved',
  cmsMetadataAuthority: 'preserved',
  cssResidue: 0,
}))
