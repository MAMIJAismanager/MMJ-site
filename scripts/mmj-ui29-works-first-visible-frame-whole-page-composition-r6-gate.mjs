import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')
const fail = message => {
  throw new Error(`E_MMJ_UI29_WORKS_R6_GATE: ${message}`)
}

const [
  page,
  viewport,
  transaction,
  solver,
  composition,
  probe,
  grid,
  filter,
  listingCss,
  queryCss,
  nuxt,
  pkgText,
] = await Promise.all([
  read('app/pages/works/index.vue'),
  read('app/composables/useWorksViewportSnapshot.ts'),
  read('app/composables/useWorksPageCompositionTransaction.ts'),
  read('app/works/works-page-composition-solver.ts'),
  read('app/works/works-page-composition.ts'),
  read('app/components/project/WorksPageCompositionProbe.vue'),
  read('app/components/project/ProjectGrid.vue'),
  read('app/components/works/WorksFilterBar.vue'),
  read('app/assets/css/project-listing.css'),
  read('app/assets/css/works-query.css'),
  read('nuxt.config.ts'),
  read('package.json'),
])

const pkg = JSON.parse(pkgText)

for (const forbidden of [
  'useWorksLayoutProfile',
  'useWorksCompositionTransaction',
  'useWorksMobileCompositionTransaction',
  'WorksCompositionProbe',
  'WorksMobileCompositionProbe',
  'worksLayoutStyle',
  'WORKS_REFERENCE_FIT_STATE_KEY',
  'WORKS_PHYSICAL_FIT_STATE_KEY',
]) {
  if (page.includes(forbidden)) fail(`retired active authority remains in Works page: ${forbidden}`)
}

for (const token of [
  'useWorksViewportSnapshot',
  'useWorksPageCompositionTransaction',
  'WorksPageCompositionProbe',
  ':data-mm-works-publication="worksPublication"',
  ':style="worksPageStyle"',
  'worksPageCommitStyle',
  'data-mm-works-visible-commit-count',
]) {
  if (!page.includes(token)) fail(`R6 page projection missing: ${token}`)
}

for (const token of [
  'window.visualViewport',
  'inlineRevision',
  'blockRevision',
]) {
  if (!viewport.includes(token)) fail(`viewport authority missing: ${token}`)
}
if (viewport.includes("'--mm-works-")) fail('viewport observer must not project CSS geometry')

for (const token of [
  'document.fonts.ready',
  'readStableReceipt',
  'beginWorksPageSolve',
  'advanceWorksPageSolve',
  "phase.value = 'ready-to-commit'",
  'visibleCommitCount.value += 1',
]) {
  if (!transaction.includes(token)) fail(`transaction closure missing: ${token}`)
}
for (const forbidden of [
  'useWorksLayoutProfile',
  'WorksReferenceFitSolution',
  'WorksPhysicalFitReceipt',
]) {
  if (transaction.includes(forbidden)) fail(`R6 transaction imported retired authority: ${forbidden}`)
}

for (const token of [
  "presetId: 'display-reference'",
  "presetId: 'display-compact'",
  "presetId: 'display-tight'",
  'railCapPx: referenceRail',
  'queryRowCount <= 1',
  'receipt.gridInlinePx - candidate.railInlinePx',
  'WORKS_R6_BOTTOM_SAFETY_PX',
]) {
  if (!solver.includes(token)) fail(`whole-page solver token missing: ${token}`)
}
for (const forbidden of [
  'window.',
  'document.',
  'HTMLElement',
  'ResizeObserver',
  'getBoundingClientRect',
]) {
  if (solver.includes(forbidden)) fail(`pure solver accessed DOM authority: ${forbidden}`)
}

for (const token of [
  'WorksFilterBar',
  'WorksResultSummary',
  'ProjectCardMetadata',
  'WorksPagination',
  'totalPageBlockPx',
  'queryRowCount',
  'latinTokenFragmentedCount',
  'singleGraphemeCollapseCount',
  'id-prefix="mm-works-r6-probe"',
]) {
  if (!probe.includes(token)) fail(`full-page probe surface missing: ${token}`)
}

if (!filter.includes('readonly idPrefix?: string')) fail('filter probe-safe id namespace missing')
if (!filter.includes("idPrefix: 'mm-works'")) fail('production filter id namespace default drifted')
if (filter.includes("from '~/works/works-layout-profile'")) fail('filter still imports retired layout profile type')

for (const token of [
  'WorksPageGridComposition',
  "width: '100%'",
  'repeat(${props.composition.columnCount}',
]) {
  if (!grid.includes(token)) fail(`grid renderer closure missing: ${token}`)
}
for (const forbidden of [
  'composition.inlinePx',
  'justifySelf',
  'marginInline',
  'mobile-committed',
]) {
  if (grid.includes(forbidden)) fail(`independent grid width authority remains: ${forbidden}`)
}

for (const token of [
  "html[data-mm-js='true']",
  "data-mm-works-publication='pending'",
  'visibility: hidden',
  'var(--mm-works-rail-inline, 84rem)',
]) {
  if (!listingCss.includes(token)) fail(`pre-publication CSS gate missing: ${token}`)
}
if (listingCss.includes('--mm-works-content-max')) fail('legacy independent content max remains active')
for (const forbidden of ['transform: scale', 'zoom:', 'width var(', 'height var(']) {
  if (listingCss.includes(forbidden)) fail(`forbidden Works geometry patch: ${forbidden}`)
}
if (!queryCss.includes('width: 100%')) fail('pagination rail must occupy committed page rail')

for (const token of [
  "const worksFirstFrameBootstrapSource = \"document.documentElement.dataset.mmJs='true'\"",
  "id: 'mmj-works-first-frame-bootstrap'",
]) {
  if (!nuxt.includes(token)) fail(`head pre-publication marker missing: ${token}`)
}

if (!composition.includes('WorksPageCompositionCommit')) fail('R6 immutable page commit contract missing')
if (!composition.includes('worksPageCommitStyle')) fail('single commit style projection missing')
if (!composition.includes("kind: 'page-committed'")) fail('single grid projection contract missing')

const gateName = 'gate:works-first-visible-frame-whole-page-composition-r6'
const gateCommand = 'node --experimental-strip-types scripts/mmj-ui29-works-first-visible-frame-whole-page-composition-r6-test.mjs && node scripts/mmj-ui29-works-first-visible-frame-whole-page-composition-r6-gate.mjs'
if (pkg.scripts?.[gateName] !== gateCommand) fail('package R6 gate command drifted')
const aggregate = String(pkg.scripts?.['gate:mmj-ui29-a'] ?? '')
if (!aggregate.includes(`npm run ${gateName}`)) fail('aggregate UI gate missing R6')
if (aggregate.includes('npm run gate:works-measure-solve-atomic-commit-authority-r5')) fail('aggregate still executes superseded R5 authority')
if (aggregate.includes('npm run gate:works-mobile-measure-admit-atomic-flow-commit-r5-m1')) fail('aggregate still executes superseded R5-M1 authority')
if (pkg.mmjUi29WorksFirstVisibleFrameWholePageCompositionAuthorityR6Release !== 'MMJ-UI29-WORKS-FIRST-VISIBLE-FRAME-WHOLE-PAGE-COMPOSITION-AUTHORITY-R6') {
  fail('R6 release marker drifted')
}

console.log(JSON.stringify({
  event: 'PASS_MMJ_UI29_WORKS_FIRST_VISIBLE_FRAME_WHOLE_PAGE_COMPOSITION_AUTHORITY_R6_GATE',
}))
