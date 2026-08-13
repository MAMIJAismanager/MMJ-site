import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')

const [
  state,
  pagination,
  query,
  composable,
  page,
  paginator,
  summary,
  listingCss,
  queryCss,
  shellCss,
  pkgText,
] = await Promise.all([
  read('shared/query/works-query-state.ts'),
  read('shared/query/works-pagination.ts'),
  read('shared/query/works-project-query.ts'),
  read('app/composables/useWorksQueryState.ts'),
  read('app/pages/works/index.vue'),
  read('app/components/works/WorksPagination.vue'),
  read('app/components/works/WorksResultSummary.vue'),
  read('app/assets/css/project-listing.css'),
  read('app/assets/css/works-query.css'),
  read('app/assets/css/shell.css'),
  read('package.json'),
])

const pkg = JSON.parse(pkgText)
const release = 'MMJ-UI29-WORKS-PAGINATED-VIEWPORT-8-RESPONSIVE-COMPOSITION-R1'

assert.ok(state.includes("'page',\n  'project',"), 'page is not an official Works query key')
assert.ok(state.includes('readonly page: number'), 'Works query page state missing')
assert.ok(state.includes('page: 1,'), 'Works default page must be one')
assert.ok(state.includes("| 'invalid-page'"), 'invalid-page issue missing')
assert.ok(state.includes("| 'page-out-of-range'"), 'page-out-of-range issue missing')

assert.ok(pagination.includes('WORKS_PAGE_SIZE = 8 as const'), 'fixed eight-item page authority missing')
assert.ok(pagination.includes("!/^[1-9][0-9]*$/.test(value)"), 'canonical positive page parser missing')
assert.ok(pagination.includes('Math.ceil(resultCount / WORKS_PAGE_SIZE)'), 'page-count authority drift')
assert.ok(pagination.includes('currentPage = outOfRange'), 'deterministic out-of-range repair missing')

assert.ok(query.includes('parseWorksPageNumber'), 'query authority does not parse page')
assert.ok(query.includes('resolveWorksPageWindow'), 'query authority does not resolve page window')
assert.ok(query.includes('readonly pageProjects:'), 'page projection surface missing')
assert.ok(query.includes('frozenProjects.slice('), 'pagination must occur after filtered/sorted result materialization')
assert.ok(query.includes("output.page = String(state.page)"), 'page serialization missing')
assert.ok(query.includes("if (state.page > 1)"), 'page-one query elision missing')
assert.ok(query.includes("'project-not-in-page'"), 'page-bound project focus guard missing')

assert.ok(composable.includes('WORKS_FILTER_STATE_KEYS'), 'central filter reset authority missing')
assert.ok(composable.includes("Object.hasOwn(patch, 'page')"), 'page mutation ownership missing')
assert.ok(composable.includes('pageProjects: computed(() => evaluation.value.pageProjects)'), 'page projection not exposed')

assert.ok(page.includes('projects: pageProjects'), 'navigation memory must observe only current page projects')
assert.ok(page.includes(':projects="pageProjects"'), 'ProjectGrid is not bound to pageProjects')
assert.ok(page.includes('@change-page="changePage"'), 'pagination event binding missing')
assert.ok(page.includes(':data-mm-page-size="evaluation.pageSize"'), 'page-size observability missing')
assert.ok(page.includes(':data-mm-page-count="evaluation.pageCount"'), 'page-count observability missing')

assert.ok(paginator.includes('aria-label="작업 페이지"'), 'pagination nav accessible label missing')
assert.ok(paginator.includes("'page' : undefined"), 'aria-current page binding missing')
assert.ok(queryCss.includes('min-width: 2.75rem'), 'pagination minimum hit target width missing')
assert.ok(queryCss.includes('min-height: 2.75rem'), 'pagination minimum hit target height missing')
assert.ok(summary.includes('pageEndIndexExclusive'), 'visible page range summary missing')

assert.ok(listingCss.includes('@media (min-width: 112rem) and (min-height: 60rem)'), 'stage-capable 1920-class media authority missing')
assert.ok(listingCss.includes('grid-template-columns: repeat(4, minmax(0, 1fr));'), 'canonical desktop four-column projection missing')
assert.ok(listingCss.includes('92rem'), 'canonical stage width bound missing')
assert.ok(shellCss.includes('.mm-layout--viewport-works'), 'Works viewport-specific layout authority missing')
assert.ok(shellCss.includes('overflow: visible;'), 'non-stage Works document-flow fallback missing')
assert.ok(shellCss.includes('@media (min-width: 112rem) and (min-height: 60rem)'), 'Works stage lock threshold missing')

const runtimeGeometrySources = [state, pagination, query, composable, page, paginator]
for (const source of runtimeGeometrySources) {
  for (const forbidden of [
    'ResizeObserver',
    'getBoundingClientRect',
    'window.innerWidth',
    'window.innerHeight',
    "addEventListener('resize'",
    'addEventListener("resize"',
  ]) {
    assert.equal(source.includes(forbidden), false, `runtime geometry loop forbidden: ${forbidden}`)
  }
}

assert.equal(
  pkg.mmjUi29WorksPaginatedViewport8ResponsiveCompositionRelease,
  release,
  'release marker drift',
)
assert.ok(
  String(pkg.scripts?.['gate:works-paginated-viewport-8-responsive-composition-r1'] || '')
    .includes('mmj-ui29-works-paginated-viewport-8-responsive-composition-r1-test.mjs'),
  'runtime pagination test is not wired to package gate',
)
assert.ok(
  String(pkg.scripts?.['gate:works-paginated-viewport-8-responsive-composition-r1'] || '')
    .includes('mmj-ui29-works-paginated-viewport-8-responsive-composition-r1-gate.mjs'),
  'static gate is not wired to package gate',
)

console.log('PASS_FILTER_SORT_THEN_PAGINATION')
console.log('PASS_FIXED_EIGHT_ITEM_PAGE_WINDOW')
console.log('PASS_PAGE_ONE_CANONICAL_QUERY_ELISION')
console.log('PASS_FILTER_CHANGE_PAGE_RESET')
console.log('PASS_PAGE_BOUND_PROJECT_FOCUS')
console.log('PASS_1920_CLASS_FOUR_BY_TWO_COMPOSITION_AUTHORITY')
console.log('PASS_RESPONSIVE_DOCUMENT_FLOW_FALLBACK')
console.log('PASS_NO_RUNTIME_VIEWPORT_GEOMETRY_LOOP')
console.log('PASS_MMJ_UI29_WORKS_PAGINATED_VIEWPORT_8_RESPONSIVE_COMPOSITION_R1')
