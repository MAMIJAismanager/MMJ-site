import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')

const [
  profile,
  physicalFit,
  layoutComposable,
  physicalComposable,
  page,
  grid,
  card,
  filterBar,
  layout,
  listingCss,
  queryCss,
  shellCss,
  pagination,
  cardMedia,
  legacyGate,
  packageText,
] = await Promise.all([
  read('app/works/works-layout-profile.ts'),
  read('app/works/works-physical-fit.ts'),
  read('app/composables/useWorksLayoutProfile.ts'),
  read('app/composables/useWorksPhysicalFitAdmission.ts'),
  read('app/pages/works/index.vue'),
  read('app/components/project/ProjectGrid.vue'),
  read('app/components/project/ProjectCard.vue'),
  read('app/components/works/WorksFilterBar.vue'),
  read('app/layouts/default.vue'),
  read('app/assets/css/project-listing.css'),
  read('app/assets/css/works-query.css'),
  read('app/assets/css/shell.css'),
  read('shared/query/works-pagination.ts'),
  read('app/components/project/ProjectCardMedia.vue'),
  read('scripts/mmj-ui29-works-paginated-viewport-8-responsive-composition-r1-gate.mjs'),
  read('package.json'),
])

const pkg = JSON.parse(packageText)
const release = 'MMJ-UI29-WORKS-1920X1080-REFERENCE-FLUID-COMPOSITION-AND-MOBILE-CHECKERBOARD-R2'
const physicalRelease = 'MMJ-UI29-WORKS-PHYSICAL-FIT-ADMISSION-R2'

for (const token of [
  'width: 1920',
  'height: 1080',
  'width: 1440',
  'height: 760',
  "| 'mobile-checkerboard'",
  "| 'desktop-reference'",
  "| 'desktop-wide'",
  'readonly columnCount: 1 | 2 | 3 | 4',
  'readonly viewportLocked: boolean',
  'readonly lockEligible: boolean',
  'readonly mobileQueryPlacement: boolean',
  'resolveWorksLayoutProfile',
]) {
  assert.ok(profile.includes(token), `layout profile authority missing: ${token}`)
}
for (const forbidden of ['window.', 'document.', 'matchMedia', 'ResizeObserver', 'getBoundingClientRect']) {
  assert.equal(profile.includes(forbidden), false, `pure layout resolver leaked browser authority: ${forbidden}`)
}
assert.ok(profile.includes("const viewportLocked = physicalFitPhase === 'admitted-locked'"), 'physical receipt must own viewport lock')

for (const token of [
  "| 'measuring-natural'",
  "| 'admitted-locked'",
  "| 'rejected-flow'",
  "| 'revoked-flow'",
  'resolveWorksNaturalPhysicalFit',
  'verifyWorksLockedPhysicalCommit',
]) {
  assert.ok(physicalFit.includes(token), `physical fit superseding authority missing: ${token}`)
}

for (const token of [
  'window.innerWidth',
  'window.innerHeight',
  "window.addEventListener('resize', scheduleViewportPublish",
  'window.requestAnimationFrame',
  'observerConsumers',
  'useState<WorksViewportSnapshot | null>',
  'viewportRevision',
  'candidate',
]) {
  assert.ok(layoutComposable.includes(token), `viewport observation authority missing: ${token}`)
}
for (const forbidden of ['ResizeObserver', 'getBoundingClientRect', 'visualViewport', 'matchMedia']) {
  assert.equal(layoutComposable.includes(forbidden), false, `shadow viewport observer forbidden: ${forbidden}`)
}
assert.ok(physicalComposable.includes('new ResizeObserver('), 'physical R2 ResizeObserver missing')
assert.ok(physicalComposable.includes('grid.scrollHeight'), 'physical R2 grid scroll measurement missing')

for (const token of [
  'useWorksLayoutProfile',
  'worksLayoutProfile',
  'worksLayoutReady',
  'worksLayoutStyle',
  'useWorksPhysicalFitAdmission',
  ':data-mm-works-layout-mode="worksLayoutProfile.mode"',
  ':data-mm-works-viewport-locked="worksLayoutProfile.viewportLocked ? \'true\' : \'false\'"',
  ':data-mm-works-physical-fit-phase="worksPhysicalFitReceipt.phase"',
  ':layout-mode="worksLayoutProfile.mode"',
  ':layout="worksLayoutProfile"',
]) {
  assert.ok(page.includes(token), `Works Vue projection missing: ${token}`)
}
for (const forbidden of ['MOBILE_VIEWPORT_QUERY', 'window.matchMedia', 'MediaQueryList']) {
  assert.equal(page.includes(forbidden), false, `legacy CSS/media shadow layout authority remains: ${forbidden}`)
}

for (const token of [
  'readonly layout: WorksLayoutProfile',
  ':data-mm-project-grid-columns="layout.columnCount"',
  ':data-mm-project-grid-mode="layout.mode"',
  'gridTemplateColumns:',
  ':density="layout.cardDensity"',
]) {
  assert.ok(grid.includes(token), `ProjectGrid Vue geometry projection missing: ${token}`)
}
assert.ok(card.includes('readonly density: WorksCardDensity'), 'ProjectCard density ownership missing')
assert.ok(card.includes(':data-mm-project-card-density="density"'), 'ProjectCard density projection missing')
assert.ok(filterBar.includes('readonly layoutMode: WorksLayoutMode'), 'WorksFilterBar layout mode input missing')
assert.ok(filterBar.includes(':data-mm-works-layout-mode="layoutMode"'), 'WorksFilterBar layout mode projection missing')

for (const token of [
  'useWorksLayoutProfile',
  'worksLayoutProfile',
  "viewportComposition.value === 'works'",
  ':data-mm-works-viewport-lock=',
  ':data-mm-works-layout-mode=',
]) {
  assert.ok(layout.includes(token), `default layout profile projection missing: ${token}`)
}

assert.equal(listingCss.includes('@media (min-width:'), false, 'Project listing width breakpoint authority must be retired')
assert.equal(listingCss.includes('@media (max-width:'), false, 'Project listing width breakpoint authority must be retired')
assert.equal(listingCss.includes('grid-template-columns:'), false, 'Project grid columns must be projected by Vue inline style')
assert.ok(listingCss.includes('var(--mm-works-title-size)'), 'TS-owned title token is not rendered')
assert.ok(listingCss.includes("data-mm-works-viewport-locked='true'"), 'viewport-locked rendering state missing')
assert.ok(listingCss.includes("data-mm-project-card-density='compact'"), 'compact card density renderer missing')

assert.equal(queryCss.includes('@media (min-width:'), false, 'Works query width breakpoint authority must be retired')
assert.equal(queryCss.includes('@media (max-width:'), false, 'Works query width breakpoint authority must be retired')
assert.ok(queryCss.includes("data-mm-works-layout-mode='desktop-reference'"), 'desktop-reference query renderer missing')
assert.ok(queryCss.includes("data-mm-works-layout-mode='tablet-flow'"), 'tablet query renderer missing')
assert.ok(queryCss.includes("data-placement='mobile-menu'"), 'mobile menu query renderer missing')

assert.ok(shellCss.includes(".mm-layout--viewport-works[data-mm-works-viewport-lock='true']"), 'Works shell locked renderer missing')
assert.ok(shellCss.includes(".mm-layout--viewport-works[data-mm-works-viewport-lock='false']"), 'Works shell flow renderer missing')
assert.equal(shellCss.includes('@media (min-width: 112rem) and (min-height: 60rem) {\n  .mm-layout--viewport-works'), false, 'legacy Works shell stage breakpoint remains')

assert.ok(pagination.includes('WORKS_PAGE_SIZE = 8 as const'), 'eight-item pagination authority drifted')
assert.ok(cardMedia.includes(':frame-ratio="{ width: 4, height: 3 }"'), 'project card 4:3 media contract drifted')
assert.ok(legacyGate.includes('mmjUi29Works1920x1080ReferenceFluidCompositionAndMobileCheckerboardR2Release'), 'R1 gate does not recognize R2 superseding layout authority')

assert.equal(
  pkg.mmjUi29Works1920x1080ReferenceFluidCompositionAndMobileCheckerboardR2Release,
  release,
  'R2 release marker drift',
)
assert.equal(
  pkg.mmjUi29WorksPhysicalFitAdmissionR2Release,
  physicalRelease,
  'physical R2 superseding release marker drift',
)
assert.equal(
  pkg.scripts?.['gate:works-1920x1080-reference-fluid-composition-r2'],
  'node --experimental-strip-types scripts/mmj-ui29-works-1920x1080-reference-fluid-composition-r2-test.mjs && node scripts/mmj-ui29-works-1920x1080-reference-fluid-composition-r2-gate.mjs',
  'R2 package gate binding drift',
)
assert.ok(
  String(pkg.scripts?.['gate:mmj-ui29-a'] || '')
    .includes('gate:works-1920x1080-reference-fluid-composition-r2'),
  'R2 gate is missing from aggregate UI29 gate',
)

console.log('PASS_TYPESCRIPT_WORKS_LAYOUT_CANDIDATE_AUTHORITY')
console.log('PASS_VUE3_WORKS_LAYOUT_STATE_PROJECTION')
console.log('PASS_NO_CSS_LAYOUT_PROMOTION_AUTHORITY')
console.log('PASS_1920X1080_REFERENCE_FOUR_BY_TWO_CANDIDATE')
console.log('PASS_PHYSICAL_LOCK_DEFERRED_TO_DOM_RECEIPT')
console.log('PASS_MOBILE_TWO_BY_FOUR_CHECKERBOARD')
console.log('PASS_WORKS_QUERY_FILTER_PAGE_STATE_ISOLATION')
console.log('PASS_MMJ_UI29_WORKS_1920X1080_REFERENCE_FLUID_COMPOSITION_AND_MOBILE_CHECKERBOARD_R2')
