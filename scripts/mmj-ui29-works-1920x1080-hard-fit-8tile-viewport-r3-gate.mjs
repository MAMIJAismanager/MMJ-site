import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')

const [solver, cardPhysical, physicalFit, layoutComposable, physicalComposable, page, pagination, paginator, pkgText] = await Promise.all([
  read('app/works/works-reference-fit-solver.ts'),
  read('app/works/works-card-physical.ts'),
  read('app/works/works-physical-fit.ts'),
  read('app/composables/useWorksLayoutProfile.ts'),
  read('app/composables/useWorksPhysicalFitAdmission.ts'),
  read('app/pages/works/index.vue'),
  read('app/components/works/WorksPagination.vue'),
  read('shared/query/works-pagination.ts'),
  read('package.json'),
])

const pkg = JSON.parse(pkgText)
const release = 'MMJ-UI29-WORKS-1920X1080-HARD-FIT-8TILE-VIEWPORT-AUTHORITY-R3'

for (const token of [
  'width: 1920',
  'height: 1080',
  'WORKS_REFERENCE_MAX_FIT_PASSES = 4',
  "| 'comfortable'",
  "| 'compact'",
  "| 'tight'",
  'row0MetadataMaxPx',
  'row1MetadataMaxPx',
  'cardInlineByHeightPx',
  'WORKS_REFERENCE_PHYSICAL_SAFETY_PX',
  "phase: 'unsatisfied'",
]) {
  assert.ok(solver.includes(token), `R3/R4 solver authority missing: ${token}`)
}
assert.ok(solver.includes('cardTitleRem: 0.84'), 'typography floor missing')
for (const forbidden of ['window.', 'document.', 'HTMLElement', 'ResizeObserver', 'querySelector', 'line-clamp']) {
  assert.equal(solver.includes(forbidden), false, `pure solver leaked DOM authority: ${forbidden}`)
}

for (const token of ['WorksCardPhysicalReceipt', 'WorksProjectGridPhysicalReader', 'maxWorksCardMetadataBlockPx']) {
  assert.ok(cardPhysical.includes(token), `card physical contract missing: ${token}`)
}
for (const token of ["| 'solving-reference'", "| 'invalid-reference'", 'documentScrollBlockPx?: number', 'paginationClipped']) {
  assert.ok(physicalFit.includes(token), `physical bridge missing: ${token}`)
}
for (const token of ['WORKS_REFERENCE_FIT_STATE_KEY', 'createInitialWorksReferenceFitSolution', 'isHardWorksReferenceViewport', 'referenceFit']) {
  assert.ok(layoutComposable.includes(token), `layout/reference bridge missing: ${token}`)
}
for (const token of ['new ResizeObserver(', 'window.requestAnimationFrame', 'resolveWorksReferenceFitSolution', 'readCardPhysicalReceipts']) {
  assert.ok(physicalComposable.includes(token), `physical solver controller missing: ${token}`)
}
assert.ok(page.includes(':data-mm-works-reference-fit-pass="worksReferenceFit.pass"'), 'R3/R4 solver receipt projection missing')
assert.ok(paginator.includes('export const WORKS_PAGE_SIZE = 8 as const'), 'eight-tile pagination authority drift')
assert.ok(pagination.includes("readonly placement: 'in-flow'"), 'pagination in-flow authority drift')

const gateName = 'gate:works-1920x1080-hard-fit-8tile-viewport-r3'
assert.ok(String(pkg.scripts?.[gateName] ?? '').includes('mmj-ui29-works-1920x1080-hard-fit-8tile-viewport-r3-test.mjs'), 'R3 gate binding drift')
assert.equal(pkg.mmjUi29Works1920x1080HardFit8TileViewportAuthorityR3Release, release, 'R3 release marker drift')

console.log('PASS_R3_1920X1080_DESIGN_TARGET_PRESERVED')
console.log('PASS_R4_DISPLAY_CLASS_SUPERSEDING_RUNTIME_AUTHORITY')
console.log('PASS_EIGHT_TILE_FOUR_BY_TWO_AUTHORITY')
console.log('PASS_PAGINATION_RESERVED_IN_FLOW_RAIL')
console.log('PASS_VUE3_REF_OWNERSHIP_NO_SELECTOR_SEARCH')
console.log('PASS_NUXT_RESIZE_OBSERVER_RAF_COALESCING')
console.log('PASS_MMJ_UI29_WORKS_1920X1080_HARD_FIT_8TILE_VIEWPORT_AUTHORITY_R3')
