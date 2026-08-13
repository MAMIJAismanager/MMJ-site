import assert from 'node:assert/strict'

import {
  WORKS_PAGE_SIZE,
  parseWorksPageNumber,
  resolveWorksPageWindow,
} from '../shared/query/works-pagination.ts'

assert.equal(WORKS_PAGE_SIZE, 8)

for (const [raw, expected] of [
  ['1', 1],
  ['2', 2],
  ['999', 999],
  ['0', null],
  ['01', null],
  ['-1', null],
  ['1.5', null],
  ['abc', null],
  ['', null],
]) {
  assert.equal(parseWorksPageNumber(raw), expected, `page parse drift: ${raw}`)
}

const nineteen = [
  resolveWorksPageWindow(19, 1),
  resolveWorksPageWindow(19, 2),
  resolveWorksPageWindow(19, 3),
]
assert.deepEqual(
  nineteen.map(window => [
    window.currentPage,
    window.startIndex,
    window.endIndexExclusive,
    window.pageResultCount,
  ]),
  [
    [1, 0, 8, 8],
    [2, 8, 16, 8],
    [3, 16, 19, 3],
  ],
)
assert.ok(nineteen.every(window => window.pageCount === 3))

const thirtyFive = Array.from(
  { length: 5 },
  (_, index) => resolveWorksPageWindow(35, index + 1),
)
assert.deepEqual(
  thirtyFive.map(window => window.pageResultCount),
  [8, 8, 8, 8, 3],
)
assert.ok(thirtyFive.every(window => window.pageCount === 5))

const outOfRange = resolveWorksPageWindow(19, 9)
assert.equal(outOfRange.outOfRange, true)
assert.equal(outOfRange.currentPage, 1)
assert.equal(outOfRange.startIndex, 0)
assert.equal(outOfRange.endIndexExclusive, 8)

const empty = resolveWorksPageWindow(0, 1)
assert.equal(empty.pageCount, 0)
assert.equal(empty.currentPage, 1)
assert.equal(empty.pageResultCount, 0)
assert.equal(empty.outOfRange, false)

const emptyOutOfRange = resolveWorksPageWindow(0, 2)
assert.equal(emptyOutOfRange.pageCount, 0)
assert.equal(emptyOutOfRange.currentPage, 1)
assert.equal(emptyOutOfRange.outOfRange, true)

console.log(JSON.stringify({
  event: 'PASS_MMJ_UI29_WORKS_PAGINATED_VIEWPORT_8_RESPONSIVE_COMPOSITION_R1_TEST',
  pageSize: WORKS_PAGE_SIZE,
  nineteenDistribution: nineteen.map(window => window.pageResultCount),
  thirtyFiveDistribution: thirtyFive.map(window => window.pageResultCount),
  outOfRangeRepairsToPageOne: true,
}))
