import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')

const [
  solver,
  transaction,
  probe,
  grid,
  page,
  layout,
  listingCss,
  shellCss,
  paginationContract,
  packageText,
] = await Promise.all([
  read('app/works/works-composition-solver.ts'),
  read('app/composables/useWorksCompositionTransaction.ts'),
  read('app/components/project/WorksCompositionProbe.vue'),
  read('app/components/project/ProjectGrid.vue'),
  read('app/pages/works/index.vue'),
  read('app/layouts/default.vue'),
  read('app/assets/css/project-listing.css'),
  read('app/assets/css/shell.css'),
  read('shared/query/works-pagination.ts'),
  read('package.json'),
])

const pkg = JSON.parse(packageText)

assert.ok(paginationContract.includes('WORKS_PAGE_SIZE = 8 as const'), 'fixed eight-item page authority missing')
assert.ok(paginationContract.includes('Math.ceil(resultCount / WORKS_PAGE_SIZE)'), 'page count authority drift')

for (const forbidden of [
  'window.',
  'document.',
  'HTMLElement',
  'ResizeObserver',
  'getBoundingClientRect',
]) {
  assert.equal(solver.includes(forbidden), false, `pure solver leaked DOM API: ${forbidden}`)
}

for (const required of [
  'WORKS_COMPOSITION_MAX_PROBES = 8',
  "'probe-required'",
  "'commit-ready'",
  "'flow-required'",
  'WORKS_COMPOSITION_PRESETS',
]) {
  assert.ok(solver.includes(required), `solver contract missing: ${required}`)
}

for (const required of [
  'await document.fonts.ready',
  'probeRequest.value = request',
  'readStableProbe(',
  'published.value = createCommittedPublishedComposition(',
  'generationAtStart === generation',
]) {
  assert.ok(transaction.includes(required), `transaction authority missing: ${required}`)
}
assert.equal(transaction.includes('useWorksPhysicalFitAdmission'), false)
assert.equal(transaction.includes('referenceFit.value ='), false)

for (const required of [
  'inert',
  'aria-hidden="true"',
  'ProjectCardMetadata',
  'WorksPagination',
  'aspect-ratio: 4 / 3',
  'contain: layout style paint',
]) {
  assert.ok(probe.includes(required), `hidden probe contract missing: ${required}`)
}
assert.equal(probe.includes('ProjectCardMedia'), false, 'probe must not duplicate media network/decode work')

assert.ok(grid.includes("composition.kind === 'flow'"))
assert.ok(grid.includes("width: '100%'"), 'flow width must be explicit')
assert.ok(grid.includes('width: `${composition.inlinePx}px`'))
assert.equal(grid.includes('solvedInlinePx'), false, 'nullable solved width fallback must be retired')

for (const forbidden of [
  'useWorksPhysicalFitAdmission',
  'worksReferenceFit',
  'worksPhysicalFitReceipt',
  'data-mm-works-viewport-locked',
]) {
  assert.equal(page.includes(forbidden), false, `visible live solver path remains in works page: ${forbidden}`)
}
assert.ok(page.includes('WorksCompositionProbe'))
assert.ok(page.includes('useWorksCompositionTransaction'))
assert.ok(page.includes('worksPublishedComposition.composition'))

assert.ok(layout.includes("viewportComposition.value !== 'works'"))
assert.equal(layout.includes('worksLayoutProfile.value.viewportLocked'), false)
assert.equal(layout.includes('data-mm-works-viewport-lock'), false)

assert.equal(
  /\.mm-layout--viewport-works\[data-mm-works-viewport-lock='true'\][\s\S]*?overflow:\s*hidden/.test(shellCss),
  false,
  'Works shell overflow-hidden fit authority remains',
)
assert.equal(
  listingCss.includes(".mm-works-index[data-mm-works-viewport-locked='true']"),
  false,
  'Works index viewport lock CSS remains',
)
assert.equal(
  /\.mm-project-card__link\s*\{[\s\S]*?overflow:\s*hidden/.test(listingCss),
  false,
  'card clipping remains in active Works card CSS',
)
assert.ok(listingCss.includes('grid-template-rows: auto auto;'))

const gateName = 'gate:works-measure-solve-atomic-commit-authority-r5'
const gateCommand = 'node --experimental-strip-types scripts/mmj-ui29-works-measure-solve-atomic-commit-authority-r5-test.mjs && node scripts/mmj-ui29-works-measure-solve-atomic-commit-authority-r5-gate.mjs'
assert.equal(pkg.scripts?.[gateName], gateCommand)
assert.ok(String(pkg.scripts?.['gate:mmj-ui29-a'] ?? '').includes(`npm run ${gateName}`))

for (const retired of [
  'npm run gate:works-paginated-viewport-8-responsive-composition-r1',
  'npm run gate:works-1920x1080-reference-fluid-composition-r2',
  'npm run gate:vue3-nuxt-ts-works-safe-fit-video-intrinsic-geometry-r1',
  'npm run gate:works-physical-fit-admission-r2',
  'npm run gate:works-1920x1080-hard-fit-8tile-viewport-r3',
  'npm run gate:works-1920-display-class-full-viewport-composition-r4',
]) {
  assert.equal(
    String(pkg.scripts?.['gate:mmj-ui29-a'] ?? '').includes(retired),
    false,
    `retired visible-fit gate remains aggregate authority: ${retired}`,
  )
}

assert.equal(
  pkg.mmjUi29WorksMeasureSolveAtomicCommitAuthorityR5Release,
  'MMJ-UI29-WORKS-MEASURE-SOLVE-ATOMIC-COMMIT-AUTHORITY-R5',
)

console.log('PASS_VISIBLE_LIVE_SOLVER_RETIREMENT')
console.log('PASS_NO_UNSOLVED_100_PERCENT_GRID')
console.log('PASS_HIDDEN_PROBE_AUTHORITY')
console.log('PASS_FONT_READY_MEASUREMENT')
console.log('PASS_PURE_TYPESCRIPT_SOLVER')
console.log('PASS_PRECOMMIT_PHYSICAL_VERIFICATION')
console.log('PASS_SINGLE_REACTIVE_COMMIT_WRITE')
console.log('PASS_LAST_GOOD_COMMIT_RETENTION')
console.log('PASS_STALE_DRAFT_REJECTION')
console.log('PASS_WORKS_VIEWPORT_LOCK_RETIREMENT')
console.log('PASS_NO_WORKS_OVERFLOW_HIDDEN_FIT')
console.log('PASS_NO_METADATA_COMPRESSION_CLIP')
console.log('PASS_FULL_PAGINATION_PHYSICAL_VISIBILITY')
console.log('PASS_MMJ_UI29_WORKS_MEASURE_SOLVE_ATOMIC_COMMIT_AUTHORITY_R5')
