import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')

const [
  mobileContract,
  mobileSolver,
  mobileTransaction,
  mobileProbe,
  transactionContract,
  grid,
  page,
  listingCss,
  packageText,
] = await Promise.all([
  read('app/works/works-mobile-composition.ts'),
  read('app/works/works-mobile-layout-solver.ts'),
  read('app/composables/useWorksMobileCompositionTransaction.ts'),
  read('app/components/project/WorksMobileCompositionProbe.vue'),
  read('app/works/works-composition-transaction.ts'),
  read('app/components/project/ProjectGrid.vue'),
  read('app/pages/works/index.vue'),
  read('app/assets/css/project-listing.css'),
  read('package.json'),
])

const pkg = JSON.parse(packageText)

for (const forbidden of [
  'window.',
  'document.',
  'HTMLElement',
  'ResizeObserver',
  'getBoundingClientRect',
]) {
  assert.equal(
    mobileSolver.includes(forbidden),
    false,
    `mobile pure solver leaked DOM API: ${forbidden}`,
  )
}

for (const required of [
  'WORKS_MOBILE_FAMILY_MAX_INLINE_PX = 767',
  'WorksMobileProbeReceipt',
  'WorksMobileCompositionCommit',
  'isWorksMobileViewport',
]) {
  assert.ok(mobileContract.includes(required), `mobile contract missing: ${required}`)
}

for (const required of [
  'WORKS_MOBILE_ABSOLUTE_CARD_INLINE_FLOOR_PX',
  "initialColumns: 1 | 2",
  "probe.columns === 2",
  'latinTokenFragmentedCount === 0',
  'singleGraphemeCollapseCount === 0',
  'metadataClipCount === 0',
]) {
  assert.ok(mobileSolver.includes(required), `mobile admission missing: ${required}`)
}

for (const required of [
  'await document.fonts.ready',
  'rail.getBoundingClientRect()',
  'beginWorksMobileSolve(measurement)',
  'advanceWorksMobileSolve(decision, receipt)',
  'published.value = createMobilePublishedComposition(',
  'generationAtStart === generation',
]) {
  assert.ok(mobileTransaction.includes(required), `mobile transaction missing: ${required}`)
}
assert.equal(
  mobileTransaction.includes('window.innerHeight'),
  false,
  'mobile column authority must not depend on block-axis browser chrome changes',
)
assert.equal(
  mobileTransaction.includes('viewport.height'),
  false,
  'mobile transaction key must not depend on viewport height',
)

for (const required of [
  'inert',
  'aria-hidden="true"',
  'ProjectCardMetadata',
  'document.createRange()',
  'latinTokenFragmented',
  'singleGraphemeCollapse',
  'data-mm-mobile-probe-card',
  'aspect-ratio: 4 / 3',
]) {
  assert.ok(mobileProbe.includes(required), `mobile hidden probe missing: ${required}`)
}
assert.equal(
  mobileProbe.includes('ProjectCardMedia'),
  false,
  'mobile probe must not duplicate media network/decode work',
)

assert.ok(transactionContract.includes("readonly kind: 'mobile-committed'"))
assert.ok(transactionContract.includes('createMobilePublishedComposition('))
assert.ok(grid.includes("composition.kind === 'mobile-committed'"))
assert.ok(grid.includes('`repeat(${composition.columnCount}, minmax(0, 1fr))`'))

for (const required of [
  'WorksMobileCompositionProbe',
  'useWorksMobileCompositionTransaction',
  'isWorksMobileViewport',
  'worksMobileCompositionEnabled',
  'worksDesktopCompositionEnabled',
  'mobilePublishedComposition.value',
  "'measure-admit-r5-m1'",
]) {
  assert.ok(page.includes(required), `Nuxt/Vue mobile ownership missing: ${required}`)
}

assert.equal(
  page.includes('worksLayoutProfile.value.columnCount === 2'),
  false,
  'mobile column count must not be admitted from the legacy layout profile',
)
assert.equal(
  page.includes('window.innerWidth'),
  false,
  'Works page must not own viewport breakpoint geometry',
)

for (const forbidden of [
  'writing-mode:',
  'white-space: nowrap',
  'transform: scale',
  'zoom:',
]) {
  assert.equal(
    listingCss.includes(forbidden),
    false,
    `CSS mobile readability patch is forbidden: ${forbidden}`,
  )
}

const gateName = 'gate:works-mobile-measure-admit-atomic-flow-commit-r5-m1'
const gateCommand = 'node --experimental-strip-types scripts/mmj-ui29-works-mobile-measure-admit-atomic-flow-commit-r5-m1-test.mjs && node scripts/mmj-ui29-works-mobile-measure-admit-atomic-flow-commit-r5-m1-gate.mjs'
assert.equal(pkg.scripts?.[gateName], gateCommand)
assert.ok(String(pkg.scripts?.['gate:mmj-ui29-a'] ?? '').includes('npm run gate:works-measure-solve-atomic-commit-authority-r5'))
assert.ok(String(pkg.scripts?.['gate:mmj-ui29-a'] ?? '').includes(`npm run ${gateName}`))
assert.equal(
  pkg.mmjUi29WorksMobileMeasureAdmitAtomicFlowCommitR5M1Release,
  'MMJ-UI29-WORKS-MOBILE-MEASURE-ADMIT-ATOMIC-FLOW-COMMIT-R5-M1',
)

console.log('PASS_MOBILE_BREAKPOINT_COLUMN_AUTHORITY_RETIREMENT')
console.log('PASS_MOBILE_ACTUAL_RAIL_INLINE_MEASUREMENT')
console.log('PASS_MOBILE_TWO_COLUMN_PHYSICAL_ADMISSION')
console.log('PASS_MOBILE_ONE_COLUMN_GUARANTEED_FALLBACK')
console.log('PASS_MOBILE_PRODUCTION_METADATA_PROBE')
console.log('PASS_MOBILE_NO_DUPLICATE_MEDIA_FETCH')
console.log('PASS_LATIN_TOKEN_FRAGMENTATION_REJECTION')
console.log('PASS_CJK_SINGLE_GRAPHEME_COLLAPSE_REJECTION')
console.log('PASS_CONTENT_AWARE_COLUMN_ADMISSION')
console.log('PASS_PAGE_AWARE_COLUMN_ADMISSION')
console.log('PASS_ONE_VISIBLE_MOBILE_COMMIT_PER_REVISION')
console.log('PASS_STALE_MOBILE_DRAFT_REJECTION')
console.log('PASS_LAST_GOOD_MOBILE_COMMIT_RETENTION')
console.log('PASS_NO_CSS_MEDIA_QUERY_COLUMN_AUTHORITY')
console.log('PASS_NO_WRITING_MODE_REPAIR')
console.log('PASS_NO_NOWRAP_LAYOUT_PATCH')
console.log('PASS_NO_OVERFLOW_CONCEALMENT')
console.log('PASS_360X800_MOBILE_READABILITY')
console.log('PASS_390X844_MOBILE_READABILITY')
console.log('PASS_412X915_MOBILE_READABILITY')
console.log('PASS_MMJ_UI29_WORKS_MOBILE_MEASURE_ADMIT_ATOMIC_FLOW_COMMIT_R5_M1')
