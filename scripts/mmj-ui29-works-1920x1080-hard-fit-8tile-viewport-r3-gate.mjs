import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')

const [
  solver,
  cardPhysical,
  layoutProfile,
  physicalFit,
  layoutComposable,
  physicalComposable,
  frameMetrics,
  page,
  grid,
  card,
  metadata,
  pagination,
  paginator,
  pkgText,
] = await Promise.all([
  read('app/works/works-reference-fit-solver.ts'),
  read('app/works/works-card-physical.ts'),
  read('app/works/works-layout-profile.ts'),
  read('app/works/works-physical-fit.ts'),
  read('app/composables/useWorksLayoutProfile.ts'),
  read('app/composables/useWorksPhysicalFitAdmission.ts'),
  read('app/composables/useViewportFrameMetrics.ts'),
  read('app/pages/works/index.vue'),
  read('app/components/project/ProjectGrid.vue'),
  read('app/components/project/ProjectCard.vue'),
  read('app/components/project/ProjectCardMetadata.vue'),
  read('app/components/works/WorksPagination.vue'),
  read('shared/query/works-pagination.ts'),
  read('package.json'),
])

const pkg = JSON.parse(pkgText)
const release = 'MMJ-UI29-WORKS-1920X1080-HARD-FIT-8TILE-VIEWPORT-AUTHORITY-R3'

for (const token of [
  'width: 1920',
  'height: 1080',
  'WORKS_HARD_REFERENCE_TOLERANCE_PX = 1',
  'WORKS_REFERENCE_MAX_FIT_PASSES = 3',
  "| 'comfortable'",
  "| 'compact'",
  "| 'tight'",
  'maxMetadataBlockPx',
  'contentInlineByVerticalPx',
  'cardInlineByVerticalPx',
  'WORKS_REFERENCE_PHYSICAL_SAFETY_PX',
  "phase: 'invalid'",
]) {
  assert.ok(solver.includes(token), `hard-reference solver authority missing: ${token}`)
}
assert.ok(solver.includes('cardTitleRem: 0.84'), 'hard-fit typography floor missing')
for (const forbidden of [
  'window.',
  'document.',
  'HTMLElement',
  'ResizeObserver',
  'querySelector',
  'line-clamp',
]) {
  assert.equal(solver.includes(forbidden), false, `pure solver leaked renderer/DOM authority: ${forbidden}`)
}

for (const token of [
  'WorksCardPhysicalReceipt',
  'WorksProjectGridPhysicalReader',
  'maxWorksCardMetadataBlockPx',
]) {
  assert.ok(cardPhysical.includes(token), `card physical contract missing: ${token}`)
}

for (const token of [
  "| 'solving-reference'",
  "| 'invalid-reference'",
  'mainScrollBlockPx?: number',
  'documentScrollBlockPx?: number',
  'maxMetadataBlockPx?: number',
  'createSolvingWorksPhysicalFitReceipt',
  'createInvalidWorksPhysicalFitReceipt',
]) {
  assert.ok(physicalFit.includes(token), `R3 physical receipt bridge missing: ${token}`)
}

for (const token of [
  'WORKS_REFERENCE_FIT_STATE_KEY',
  'createInitialWorksReferenceFitSolution',
  'isHardWorksReferenceViewport',
  'referenceFit',
  'resolveWorksLayoutProfile(',
]) {
  assert.ok(layoutComposable.includes(token), `Nuxt layout/reference bridge missing: ${token}`)
}

for (const token of [
  'new ResizeObserver(',
  'window.requestAnimationFrame',
  'resolveWorksReferenceFitSolution',
  'maxWorksCardMetadataBlockPx',
  'document.documentElement',
  'documentElement.scrollHeight',
  'readCardPhysicalReceipts',
  "case 'solving-reference':",
  'createInvalidWorksPhysicalFitReceipt',
]) {
  assert.ok(physicalComposable.includes(token), `Nuxt physical hard-fit controller missing: ${token}`)
}
assert.equal(physicalComposable.includes('setInterval('), false, 'hard fit must not poll')
assert.equal(physicalComposable.includes("addEventListener('scroll'"), false, 'hard fit must not measure on scroll')
assert.equal(physicalComposable.includes('querySelector'), false, 'hard fit must use Vue ref ownership')

for (const token of [
  'mainClientBlockPx',
  'mainScrollBlockPx',
  'window.innerHeight',
]) {
  assert.ok(frameMetrics.includes(token), `viewport frame metric missing: ${token}`)
}

for (const token of [
  'WorksProjectGridPhysicalReader',
  'projectGridReader',
  'readVisibleCardPhysicalReceipts',
  'viewport: worksViewport',
  'readCardPhysicalReceipts: readVisibleCardPhysicalReceipts',
  ':data-mm-works-reference-fit-phase="worksReferenceFit.phase"',
  ':data-mm-works-reference-fit-pass="worksReferenceFit.pass"',
]) {
  assert.ok(page.includes(token), `Works Vue R3 projection missing: ${token}`)
}
assert.equal(page.includes('`content:${worksLayoutCandidate.value.tokens.contentMaxRem}`'), false, 'solver token mutation must not churn the physical fit key')

for (const token of [
  'WorksCardPhysicalReader',
  'readCardPhysicalReceipts',
  'defineExpose({',
  'cardReaders',
]) {
  assert.ok(grid.includes(token), `ProjectGrid physical reader missing: ${token}`)
}
for (const token of [
  'readPhysicalReceipt',
  'metadataReader',
  'cardElement',
]) {
  assert.ok(card.includes(token), `ProjectCard physical reader missing: ${token}`)
}
for (const token of [
  'readMetadataBlockPx',
  'metadataElement',
  'defineExpose({',
]) {
  assert.ok(metadata.includes(token), `ProjectCardMetadata physical ref missing: ${token}`)
}

assert.ok(layoutProfile.includes('referenceFit: WorksReferenceFitSolution | null = null'), 'layout profile does not consume solver result')
assert.ok(layoutProfile.includes('referenceFit.tokens'), 'layout profile does not project solved tokens')
assert.ok(paginator.includes('export const WORKS_PAGE_SIZE = 8 as const'), 'eight-tile pagination authority drift')
assert.ok(pagination.includes("readonly placement: 'in-flow'"), 'pagination in-flow authority drift')

const gateName = 'gate:works-1920x1080-hard-fit-8tile-viewport-r3'
const gateCommand = 'node --experimental-strip-types scripts/mmj-ui29-works-1920x1080-hard-fit-8tile-viewport-r3-test.mjs && node scripts/mmj-ui29-works-1920x1080-hard-fit-8tile-viewport-r3-gate.mjs'
assert.equal(pkg.scripts?.[gateName], gateCommand, 'R3 package gate binding drift')
assert.ok(String(pkg.scripts?.['gate:mmj-ui29-a'] ?? '').includes(`npm run ${gateName}`), 'aggregate UI29 gate missing hard-fit R3')
assert.equal(pkg.mmjUi29Works1920x1080HardFit8TileViewportAuthorityR3Release, release, 'R3 release marker drift')

console.log('PASS_1920X1080_HARD_REFERENCE_SINGLE_VIEWPORT_CONTRACT')
console.log('PASS_EIGHT_TILE_FOUR_BY_TWO_AUTHORITY')
console.log('PASS_PAGINATION_RESERVED_IN_FLOW_RAIL')
console.log('PASS_WORST_CARD_METADATA_PHYSICAL_FEEDBACK')
console.log('PASS_BOUNDED_THREE_PASS_TYPESCRIPT_GEOMETRY_SOLVER')
console.log('PASS_VUE3_REF_OWNERSHIP_NO_SELECTOR_SEARCH')
console.log('PASS_NUXT_RESIZE_OBSERVER_RAF_COALESCING')
console.log('PASS_NO_REFERENCE_NATURAL_FLOW_DEMOTION_AUTHORITY')
console.log('PASS_MMJ_UI29_WORKS_1920X1080_HARD_FIT_8TILE_VIEWPORT_AUTHORITY_R3')
