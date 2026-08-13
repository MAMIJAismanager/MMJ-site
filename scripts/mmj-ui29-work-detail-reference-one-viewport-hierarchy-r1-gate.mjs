import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')
const fail = message => { throw new Error(`E_MMJ_UI29_WORK_DETAIL_REFERENCE_ONE_VIEWPORT_HIERARCHY_R1: ${message}`) }

const [
  page,
  header,
  description,
  inlineAuthority,
  layoutAuthority,
  layoutComposable,
  css,
  pkgText,
] = await Promise.all([
  read('app/pages/works/[slug].vue'),
  read('app/components/work/WorkDetailHeader.vue'),
  read('app/components/work/WorkDescription.vue'),
  read('app/utils/work-description-inline.ts'),
  read('app/work-detail/work-detail-layout-profile.ts'),
  read('app/composables/useWorkDetailLayoutProfile.ts'),
  read('app/assets/css/work-detail.css'),
  read('package.json'),
])

const pkg = JSON.parse(pkgText)

for (const token of [
  'useWorkDetailLayoutProfile',
  'WorkDescription',
  'data-mm-work-detail-core',
  ':data-mm-work-detail-layout="layoutProfile.mode"',
  ':data-mm-work-detail-core-fit="layoutProfile.coreViewportFit',
  ':style="layoutStyle"',
  'class="mm-work-detail-core__copy"',
  'class="mm-work-section mm-work-primary"',
  'data-mm-work-detail-extended',
]) if (!page.includes(token)) fail(`work detail core projection missing: ${token}`)

const headerIndex = page.indexOf('<WorkDetailHeader')
const descriptionIndex = page.indexOf('<WorkDescription')
const primaryIndex = page.indexOf('data-mm-work-primary')
if (!(headerIndex >= 0 && headerIndex < descriptionIndex && descriptionIndex < primaryIndex)) {
  fail('core hierarchy order must be header -> description -> primary')
}

if (page.includes('{{ project.description }}')) fail('raw description interpolation remains in page')
if (page.includes('v-html')) fail('v-html is forbidden in work detail')
if (header.includes('mm-page-title')) fail('global page-title authority still owns Work Detail h1')
if (!header.includes('class="mm-work-detail-header__title"')) fail('local Work Detail title authority missing')

for (const token of [
  'segmentWorkDescriptionInline',
  "segment.kind === 'external-link'",
  'target="_blank"',
  'rel="noopener noreferrer"',
  'mm-work-description__link',
]) if (!description.includes(token)) fail(`inline description link projection missing: ${token}`)
if (description.includes('v-html')) fail('description renderer must not parse HTML')

for (const token of [
  "kind: 'text'",
  "kind: 'external-link'",
  'http:',
  'https:',
  'reconstructWorkDescriptionInline',
]) if (!inlineAuthority.includes(token)) fail(`inline URL authority missing: ${token}`)
for (const forbidden of ['javascript:', 'data:', 'blob:', 'DOMParser', 'innerHTML']) {
  if (inlineAuthority.includes(forbidden)) fail(`forbidden inline-link authority signature: ${forbidden}`)
}

for (const token of [
  'WORK_DETAIL_REFERENCE_VIEWPORT',
  'width: 1920',
  'height: 1080',
  "'reference-split'",
  "'wide-split'",
  "'mobile-stack'",
  'titlePx',
  'mediaMaxInlinePx',
  'coreViewportFit',
]) if (!layoutAuthority.includes(token)) fail(`layout SSOT token missing: ${token}`)
for (const forbidden of ['window.', 'document.', 'ResizeObserver', 'getBoundingClientRect']) {
  if (layoutAuthority.includes(forbidden)) fail(`pure layout resolver accessed browser authority: ${forbidden}`)
}

for (const token of [
  "window.addEventListener('resize'",
  'window.requestAnimationFrame',
  'resolveWorkDetailLayoutProfile',
  "'--mm-work-detail-title-size'",
  "'--mm-work-detail-media-max-inline'",
]) if (!layoutComposable.includes(token)) fail(`Nuxt layout projection missing: ${token}`)

for (const token of [
  ".mm-work-detail-core[data-mm-work-detail-core-layout='reference-split']",
  ".mm-work-detail-core[data-mm-work-detail-core-layout='wide-split']",
  'var(--mm-work-detail-title-size)',
  'var(--mm-work-detail-section-title-size)',
  'var(--mm-work-detail-media-max-inline)',
  '.mm-work-description__link',
]) if (!css.includes(token)) fail(`Work Detail renderer token missing: ${token}`)
if (css.includes('.mm-work-detail-header__title {\n  font-size: var(--mm-font-size-page-title)')) {
  fail('global page title size leaked into Work Detail')
}
const coreMediaQuery = /@media[^\{]*\{[\s\S]*?mm-work-detail-core[\s\S]*?\}/g
if (coreMediaQuery.test(css)) fail('CSS media query must not promote Work Detail core layout')

const gateName = 'gate:work-detail-reference-one-viewport-hierarchy-inline-link-r1'
const gateCommand = 'node --experimental-strip-types scripts/mmj-ui29-work-detail-reference-one-viewport-hierarchy-r1-test.mjs && node scripts/mmj-ui29-work-detail-reference-one-viewport-hierarchy-r1-gate.mjs && node scripts/public-boundary-gate.mjs'
if (pkg.scripts?.[gateName] !== gateCommand) fail('package gate command drifted')
if (!String(pkg.scripts?.['gate:mmj-ui29-a'] ?? '').includes(`npm run ${gateName}`)) fail('aggregate UI gate missing Work Detail R1')
if (pkg.mmjUi29WorkDetailReferenceOneViewportHierarchyInlineLinkRelease !== 'MMJ-UI29-WORK-DETAIL-REFERENCE-ONE-VIEWPORT-HIERARCHY-AND-INLINE-LINK-AUTHORITY-R1') {
  fail('release marker drifted')
}

console.log(JSON.stringify({
  event: 'PASS_MMJ_UI29_WORK_DETAIL_REFERENCE_ONE_VIEWPORT_HIERARCHY_AND_INLINE_LINK_AUTHORITY_R1_GATE',
}))
