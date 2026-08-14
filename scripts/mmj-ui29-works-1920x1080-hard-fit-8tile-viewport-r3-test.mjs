import assert from 'node:assert/strict'

import {
  WORKS_HARD_REFERENCE_VIEWPORT,
  WORKS_REFERENCE_MAX_FIT_PASSES,
  createInitialWorksReferenceFitSolution,
  isHardWorksReferenceViewport,
  resolveWorksReferenceFitSolution,
} from '../app/works/works-reference-fit-solver.ts'
import {
  maxWorksCardMetadataBlockPx,
} from '../app/works/works-card-physical.ts'

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

assert.deepEqual(WORKS_HARD_REFERENCE_VIEWPORT, { width: 1920, height: 1080 })
assert.equal(isHardWorksReferenceViewport({ width: 1920, height: 1080 }), true)
assert.equal(isHardWorksReferenceViewport({ width: 1919, height: 1079 }), true)
assert.equal(isHardWorksReferenceViewport({ width: 1920, height: 920 }), true)
assert.equal(isHardWorksReferenceViewport({ width: 1366, height: 768 }), false)
assert.equal(WORKS_REFERENCE_MAX_FIT_PASSES, 4)

const initial = createInitialWorksReferenceFitSolution(7, 'fit-a', true)
assert.equal(initial.phase, 'measure')
assert.equal(initial.hardReference, true)

const admitted = resolveWorksReferenceFitSolution({
  revision: 7,
  fitKey: 'fit-a',
  viewport: { width: 1920, height: 1080 },
  rootFontPx: 16,
  mainAvailableBlockPx: 1008,
  pageRequiredBlockPx: 900,
  gridRequiredBlockPx: 600,
  headerBlockPx: 60,
  queryBlockPx: 84,
  summaryBlockPx: 20,
  paginationBlockPx: 44,
  row0MetadataMaxPx: 72,
  row1MetadataMaxPx: 80,
  currentTokens: baseTokens,
  currentContentInlinePx: 1216,
  currentGridInlinePx: 1216,
  previousPass: 0,
})
assert.equal(admitted.phase, 'committed')
assert.equal(admitted.admitted, true)

const unsatisfied = resolveWorksReferenceFitSolution({
  revision: 7,
  fitKey: 'fit-a',
  viewport: { width: 1920, height: 1080 },
  rootFontPx: 16,
  mainAvailableBlockPx: 500,
  pageRequiredBlockPx: 1200,
  gridRequiredBlockPx: 900,
  headerBlockPx: 80,
  queryBlockPx: 100,
  summaryBlockPx: 30,
  paginationBlockPx: 44,
  row0MetadataMaxPx: 180,
  row1MetadataMaxPx: 180,
  currentTokens: baseTokens,
  currentContentInlinePx: 1216,
  currentGridInlinePx: 1216,
  previousPass: WORKS_REFERENCE_MAX_FIT_PASSES,
})
assert.equal(unsatisfied.phase, 'unsatisfied')
assert.equal(unsatisfied.admitted, false)

assert.equal(maxWorksCardMetadataBlockPx([
  { projectId: 'a', index: 0, cardInlinePx: 280, cardBlockPx: 300, metadataBlockPx: 76 },
  { projectId: 'b', index: 1, cardInlinePx: 280, cardBlockPx: 330, metadataBlockPx: 112 },
  { projectId: 'c', index: 4, cardInlinePx: 280, cardBlockPx: 320, metadataBlockPx: 89 },
]), 112)

console.log('PASS_1920X1080_REFERENCE_TARGET_PRESERVED')
console.log('PASS_R4_DISPLAY_CLASS_SUPERSEDES_EXACT_CSS_VIEWPORT_ONLY_RULE')
console.log('PASS_REFERENCE_PAGINATION_RESERVED_FIT')
console.log('PASS_REFERENCE_BOUNDED_SOLVER')
console.log('PASS_REFERENCE_UNSATISFIED_DOES_NOT_SILENTLY_ADMIT')
console.log('PASS_WORST_VISIBLE_CARD_METADATA_AUTHORITY')
console.log('PASS_MMJ_UI29_WORKS_1920X1080_HARD_FIT_8TILE_VIEWPORT_AUTHORITY_R3')
