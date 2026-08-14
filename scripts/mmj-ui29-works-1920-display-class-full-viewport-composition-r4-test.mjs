import assert from 'node:assert/strict'

import {
  WORKS_DISPLAY_CLASS_MIN_VIEWPORT,
  WORKS_GRID_PAGINATION_MIN_GAP_PX,
  WORKS_PAGINATION_BOTTOM_SAFETY_PX,
  WORKS_REFERENCE_MAX_FIT_PASSES,
  isHardWorksReferenceViewport,
  resolveWorksReferenceFitSolution,
} from '../app/works/works-reference-fit-solver.ts'
import {
  resolveWorksRowMetadataReceipt,
} from '../app/works/works-card-physical.ts'
import {
  verifyWorksLockedPhysicalCommit,
} from '../app/works/works-physical-fit.ts'

const baseTokens = Object.freeze({
  contentMaxRem: 76,
  pagePaddingBlockRem: 0.5,
  pageGapRem: 0.45,
  headerGapRem: 0.26,
  titleRem: 2.2,
  queryGapRem: 0.5,
  queryPaddingRem: 0.44,
  queryControlHeightRem: 2.25,
  gridGapRem: 0.52,
  cardPaddingRem: 0.47,
  cardTitleRem: 0.9,
})

assert.deepEqual(WORKS_DISPLAY_CLASS_MIN_VIEWPORT, {
  width: 1760,
  height: 840,
})
for (const viewport of [
  { width: 1915, height: 901 },
  { width: 1900, height: 900 },
  { width: 1920, height: 900 },
  { width: 1920, height: 920 },
  { width: 1920, height: 1080 },
]) {
  assert.equal(isHardWorksReferenceViewport(viewport), true)
}
assert.equal(isHardWorksReferenceViewport({ width: 1366, height: 768 }), false)

const rowReceipt = resolveWorksRowMetadataReceipt([
  { projectId: 'a', index: 0, cardInlinePx: 280, cardBlockPx: 280, metadataBlockPx: 62 },
  { projectId: 'b', index: 1, cardInlinePx: 280, cardBlockPx: 294, metadataBlockPx: 76 },
  { projectId: 'c', index: 2, cardInlinePx: 280, cardBlockPx: 286, metadataBlockPx: 68 },
  { projectId: 'd', index: 3, cardInlinePx: 280, cardBlockPx: 289, metadataBlockPx: 71 },
  { projectId: 'e', index: 4, cardInlinePx: 280, cardBlockPx: 292, metadataBlockPx: 74 },
  { projectId: 'f', index: 5, cardInlinePx: 280, cardBlockPx: 300, metadataBlockPx: 82 },
  { projectId: 'g', index: 6, cardInlinePx: 280, cardBlockPx: 296, metadataBlockPx: 78 },
  { projectId: 'h', index: 7, cardInlinePx: 280, cardBlockPx: 314, metadataBlockPx: 96 },
])
assert.equal(rowReceipt.visibleCardCount, 8)
assert.equal(rowReceipt.row0MetadataMaxPx, 76)
assert.equal(rowReceipt.row1MetadataMaxPx, 96)

const first = resolveWorksReferenceFitSolution({
  revision: 1,
  fitKey: '1915x901-page1',
  viewport: { width: 1915, height: 901 },
  rootFontPx: 16,
  mainAvailableBlockPx: 829,
  pageRequiredBlockPx: 906,
  gridRequiredBlockPx: 606,
  headerBlockPx: 56,
  queryBlockPx: 88,
  summaryBlockPx: 20,
  paginationBlockPx: 44,
  row0MetadataMaxPx: 76,
  row1MetadataMaxPx: 96,
  currentTokens: baseTokens,
  currentContentInlinePx: 1216,
  currentGridInlinePx: 1216,
  previousPass: 0,
})
assert.ok(['solving', 'stabilizing'].includes(first.phase))
assert.equal(first.hardReference, true)
assert.equal(first.pass, 1)
assert.ok(first.tokens)
assert.ok(first.contentInlinePx < 1216)
assert.equal(first.tokens.contentMaxRem, baseTokens.contentMaxRem)
assert.ok(first.paginationReservedBlockPx >= (
  44 + WORKS_GRID_PAGINATION_MIN_GAP_PX + WORKS_PAGINATION_BOTTOM_SAFETY_PX
))
assert.ok(first.tokens.cardTitleRem >= 0.84)

const secondRequired = (
  235
  + first.gridBlockPx
  + 44
)
const second = resolveWorksReferenceFitSolution({
  revision: 1,
  fitKey: '1915x901-page1',
  viewport: { width: 1915, height: 901 },
  rootFontPx: 16,
  mainAvailableBlockPx: 829,
  pageRequiredBlockPx: secondRequired,
  gridRequiredBlockPx: first.gridBlockPx,
  headerBlockPx: 52,
  queryBlockPx: 82,
  summaryBlockPx: 20,
  paginationBlockPx: 44,
  row0MetadataMaxPx: 78,
  row1MetadataMaxPx: 100,
  currentTokens: first.tokens,
  currentContentInlinePx: 1216,
  currentGridInlinePx: first.contentInlinePx,
  previousPass: first.pass,
})
assert.ok(second.contentInlinePx <= first.contentInlinePx + 0.001)
assert.ok(second.pass <= WORKS_REFERENCE_MAX_FIT_PASSES)

const validCommit = verifyWorksLockedPhysicalCommit({
  fitKey: '1915x901-page1',
  revision: 1,
  viewportBlockPx: 901,
  visualViewportTopPx: 0,
  visualViewportBottomPx: 901,
  siteHeaderBlockPx: 72,
  mainAvailableBlockPx: 829,
  mainClientBlockPx: 829,
  mainScrollBlockPx: 829,
  documentClientBlockPx: 901,
  documentScrollBlockPx: 901,
  pageClientBlockPx: 829,
  pageScrollBlockPx: 829,
  headerBlockPx: 52,
  queryBlockPx: 82,
  summaryBlockPx: 20,
  gridClientBlockPx: 530,
  gridScrollBlockPx: 530,
  paginationBlockPx: 44,
  paginationBottomPx: 880,
  paginationBottomSafetyPx: WORKS_PAGINATION_BOTTOM_SAFETY_PX,
  gridPaginationMinGapPx: WORKS_GRID_PAGINATION_MIN_GAP_PX,
  row0MetadataMaxPx: 78,
  row1MetadataMaxPx: 100,
  visibleCardCount: 8,
  gridBottomPx: 817,
  paginationTopPx: 831,
})
assert.equal(validCommit.phase, 'admitted-locked')
assert.equal(validCommit.paginationClipped, false)
assert.equal(validCommit.collisionObserved, false)
assert.equal(validCommit.overflowObserved, false)

const clippedCommit = verifyWorksLockedPhysicalCommit({
  fitKey: '1915x901-page1',
  revision: 1,
  viewportBlockPx: 901,
  visualViewportTopPx: 0,
  visualViewportBottomPx: 901,
  siteHeaderBlockPx: 72,
  mainAvailableBlockPx: 829,
  mainClientBlockPx: 829,
  mainScrollBlockPx: 829,
  documentClientBlockPx: 901,
  documentScrollBlockPx: 901,
  pageClientBlockPx: 829,
  pageScrollBlockPx: 829,
  headerBlockPx: 52,
  queryBlockPx: 82,
  summaryBlockPx: 20,
  gridClientBlockPx: 530,
  gridScrollBlockPx: 530,
  paginationBlockPx: 44,
  paginationBottomPx: 892,
  paginationBottomSafetyPx: WORKS_PAGINATION_BOTTOM_SAFETY_PX,
  gridPaginationMinGapPx: WORKS_GRID_PAGINATION_MIN_GAP_PX,
  row0MetadataMaxPx: 78,
  row1MetadataMaxPx: 100,
  visibleCardCount: 8,
  gridBottomPx: 817,
  paginationTopPx: 831,
})
assert.equal(clippedCommit.phase, 'revoked-flow')
assert.equal(clippedCommit.paginationClipped, true)

console.log('PASS_1915X901_DISPLAY_CLASS_HARD_TARGET')
console.log('PASS_VISUAL_VIEWPORT_CLASSIFICATION')
console.log('PASS_ROW_LOCAL_METADATA_MAX_AUTHORITY')
console.log('PASS_PAGINATION_RAIL_RESERVED_BEFORE_GRID')
console.log('PASS_HEIGHT_BOUND_CARD_WIDTH_MONOTONIC_SOLVER')
console.log('PASS_FULL_PAGINATION_BOTTOM_SAFETY')
console.log('PASS_CLIPPED_PAGINATION_PHYSICAL_VETO')
console.log('PASS_MMJ_UI29_WORKS_1920_DISPLAY_CLASS_FULL_VIEWPORT_COMPOSITION_R4')
