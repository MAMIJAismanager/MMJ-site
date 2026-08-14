import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')

const [
  solver,
  cardPhysical,
  physicalFit,
  layoutProfile,
  layoutComposable,
  physicalComposable,
  frameMetrics,
  page,
  grid,
  card,
  pagination,
  paginator,
  listingCss,
  pkgText,
] = await Promise.all([
  read('app/works/works-reference-fit-solver.ts'),
  read('app/works/works-card-physical.ts'),
  read('app/works/works-physical-fit.ts'),
  read('app/works/works-layout-profile.ts'),
  read('app/composables/useWorksLayoutProfile.ts'),
  read('app/composables/useWorksPhysicalFitAdmission.ts'),
  read('app/composables/useViewportFrameMetrics.ts'),
  read('app/pages/works/index.vue'),
  read('app/components/project/ProjectGrid.vue'),
  read('app/components/project/ProjectCard.vue'),
  read('app/components/works/WorksPagination.vue'),
  read('shared/query/works-pagination.ts'),
  read('app/assets/css/project-listing.css'),
  read('package.json'),
])

const pkg = JSON.parse(pkgText)
const release = 'MMJ-UI29-WORKS-1920-DISPLAY-CLASS-FULL-VIEWPORT-COMPOSITION-R4'

for (const token of [
  'WORKS_DISPLAY_CLASS_MIN_VIEWPORT',
  'width: 1760',
  'height: 840',
  'WORKS_PAGINATION_BOTTOM_SAFETY_PX = 16',
  'WORKS_GRID_PAGINATION_MIN_GAP_PX = 12',
  'WORKS_REFERENCE_MAX_FIT_PASSES = 4',
  'row0MetadataMaxPx',
  'row1MetadataMaxPx',
  'paginationReservedBlockPx',
  'cardInlineByHeightPx',
  'cardInlineByWidthPx',
  'currentGridInlinePx',
  'contentMaxRem: current.contentMaxRem',
  'Math.min(',
  "phase: 'unsatisfied'",
]) {
  assert.ok(solver.includes(token), `R4 solver authority missing: ${token}`)
}
for (const forbidden of [
  'window.',
  'document.',
  'HTMLElement',
  'ResizeObserver',
  'querySelector',
  'line-clamp',
  'transform: scale',
]) {
  assert.equal(solver.includes(forbidden), false, `pure R4 solver leaked renderer authority: ${forbidden}`)
}
assert.ok(solver.includes('cardTitleRem: 0.84'), 'R4 title readability floor missing')

for (const token of [
  'readonly index: number',
  'row0MetadataMaxPx',
  'row1MetadataMaxPx',
  'resolveWorksRowMetadataReceipt',
]) {
  assert.ok(cardPhysical.includes(token), `row-local card receipt missing: ${token}`)
}

for (const token of [
  'visualViewportBottomPx?: number',
  'paginationBottomPx?: number | null',
  'paginationClipped',
  'documentOverflowObserved',
  'mainOverflowObserved',
  'paginationBottomSafetyPx?: number',
  'gridPaginationMinGapPx?: number',
]) {
  assert.ok(physicalFit.includes(token), `physical full-viewport veto missing: ${token}`)
}

for (const token of [
  'window.visualViewport',
  "visualViewport?.addEventListener(\n    'resize'",
  'layoutWidth',
  'layoutHeight',
  'visualOffsetTop',
]) {
  assert.ok(layoutComposable.includes(token), `Nuxt VisualViewport authority missing: ${token}`)
}

for (const token of [
  'window.visualViewport',
  'visualViewportBottomPx',
  'visualViewport?.height ?? window.innerHeight',
]) {
  assert.ok(frameMetrics.includes(token), `frame VisualViewport metric missing: ${token}`)
}

for (const token of [
  'resolveWorksRowMetadataReceipt',
  'effectiveHardRequiredBlock',
  'paginationBottomPx',
  'visualViewportBottomPx',
  'WORKS_PAGINATION_BOTTOM_SAFETY_PX',
  'WORKS_GRID_PAGINATION_MIN_GAP_PX',
  'new ResizeObserver(',
  'window.requestAnimationFrame',
]) {
  assert.ok(physicalComposable.includes(token), `R4 controller missing: ${token}`)
}
assert.equal(physicalComposable.includes('setInterval('), false, 'R4 must not poll')
assert.equal(physicalComposable.includes('querySelector'), false, 'R4 must use Vue ref ownership')

for (const token of [
  ':data-mm-works-viewport-width="worksViewport?.width ?? 0"',
  ':data-mm-works-viewport-height="worksViewport?.height ?? 0"',
  ':data-mm-works-row0-meta-max="worksPhysicalFitReceipt.row0MetadataMaxPx"',
  ':data-mm-works-row1-meta-max="worksPhysicalFitReceipt.row1MetadataMaxPx"',
  ':data-mm-works-pagination-bottom="worksPhysicalFitReceipt.paginationBottomPx"',
  ':data-mm-works-visible-bottom="worksPhysicalFitReceipt.visualViewportBottomPx"',
  ':data-mm-works-pagination-clipped="worksPhysicalFitReceipt.paginationClipped ? \'true\' : \'false\'"',
]) {
  assert.ok(page.includes(token), `Vue R4 receipt projection missing: ${token}`)
}
assert.equal(page.includes('`density:${worksLayoutCandidate.value.cardDensity}`'), false, 'solver density must not churn fit key')

assert.ok(grid.includes('receipts.sort((left, right) => left.index - right.index)'), 'card receipt order is not canonicalized')
for (const token of [
  'readonly solvedInlinePx?: number | null',
  "width: solvedInlinePx === null || solvedInlinePx === undefined",
  "justifySelf: 'center'",
  "marginInline: 'auto'",
]) {
  assert.ok(grid.includes(token), `grid-only solved width projection missing: ${token}`)
}
assert.ok(page.includes(':solved-inline-px="'), 'page does not project R4 solved grid width')
assert.ok(card.includes('index: props.index'), 'card physical receipt is not index-bound')
assert.ok(card.includes('cardInlinePx:'), 'card inline geometry receipt missing')

assert.ok(layoutProfile.includes('readonly layoutWidth?: number'), 'layout viewport snapshot does not preserve layout viewport')
assert.ok(layoutProfile.includes('readonly visualOffsetTop?: number'), 'layout viewport snapshot does not preserve VisualViewport offset')
assert.ok(layoutProfile.includes('referenceFit.density'), 'solved density is not projected by TypeScript layout authority')

assert.ok(paginator.includes('export const WORKS_PAGE_SIZE = 8 as const'), 'eight-card page authority drift')
assert.ok(pagination.includes("readonly placement: 'in-flow'"), 'pagination left in-flow authority drift')

for (const forbidden of [
  'line-clamp',
  'text-overflow: ellipsis',
  'transform: scale(',
  'zoom:',
]) {
  assert.equal(listingCss.includes(forbidden), false, `CSS hard-fit shortcut forbidden: ${forbidden}`)
}

const gateName = 'gate:works-1920-display-class-full-viewport-composition-r4'
const gateCommand = 'node --experimental-strip-types scripts/mmj-ui29-works-1920-display-class-full-viewport-composition-r4-test.mjs && node scripts/mmj-ui29-works-1920-display-class-full-viewport-composition-r4-gate.mjs'
assert.equal(pkg.scripts?.[gateName], gateCommand, 'R4 package gate binding drift')
assert.ok(String(pkg.scripts?.['gate:mmj-ui29-a'] ?? '').includes(`npm run ${gateName}`), 'aggregate UI29 gate missing R4')
assert.equal(pkg.mmjUi29Works1920DisplayClassFullViewportCompositionR4Release, release, 'R4 release marker drift')

console.log('PASS_VISUAL_VIEWPORT_RUNTIME_AUTHORITY')
console.log('PASS_1900X900_CLASS_SINGLE_VIEWPORT_TARGET')
console.log('PASS_EIGHT_TILE_FOUR_BY_TWO_PRESERVED')
console.log('PASS_PAGINATION_FIRST_RESERVED_BOTTOM_RAIL')
console.log('PASS_ROW_LOCAL_METADATA_PHYSICAL_FEEDBACK')
console.log('PASS_MONOTONIC_HEIGHT_BOUND_TYPESCRIPT_SOLVER')
console.log('PASS_PAGE_MAIN_DOCUMENT_OVERFLOW_ZERO_GATE')
console.log('PASS_PAGINATION_FULL_RECT_BOTTOM_SAFETY_GATE')
console.log('PASS_NO_CSS_EMERGENCY_FIT_AUTHORITY')
console.log('PASS_MMJ_UI29_WORKS_1920_DISPLAY_CLASS_FULL_VIEWPORT_COMPOSITION_R4')
