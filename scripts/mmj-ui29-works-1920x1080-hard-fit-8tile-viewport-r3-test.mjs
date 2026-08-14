import assert from 'node:assert/strict'

import {
  WORKS_REFERENCE_MAX_FIT_PASSES,
  createInitialWorksReferenceFitSolution,
  isHardWorksReferenceViewport,
  resolveWorksReferenceFitSolution,
} from '../app/works/works-reference-fit-solver.ts'
import {
  maxWorksCardMetadataBlockPx,
} from '../app/works/works-card-physical.ts'

const baseTokens = Object.freeze({
  contentMaxRem: 92,
  pagePaddingBlockRem: 0.8,
  pageGapRem: 0.68,
  headerGapRem: 0.38,
  titleRem: 2.7,
  queryGapRem: 0.75,
  queryPaddingRem: 0.72,
  queryControlHeightRem: 2.5,
  gridGapRem: 0.78,
  cardPaddingRem: 0.72,
  cardTitleRem: 1.02,
})

assert.equal(isHardWorksReferenceViewport({ width: 1920, height: 1080 }), true)
assert.equal(isHardWorksReferenceViewport({ width: 1919, height: 1079 }), true)
assert.equal(isHardWorksReferenceViewport({ width: 1920, height: 920 }), false)

const initial = createInitialWorksReferenceFitSolution(7, 'fit-a', true)
assert.equal(initial.phase, 'measure')
assert.equal(initial.pass, 0)
assert.equal(initial.hardReference, true)

const admitted = resolveWorksReferenceFitSolution({
  revision: 7,
  fitKey: 'fit-a',
  viewport: { width: 1920, height: 1080 },
  rootFontPx: 16,
  mainAvailableBlockPx: 984,
  pageRequiredBlockPx: 950,
  gridRequiredBlockPx: 650,
  paginationBlockPx: 44,
  maxMetadataBlockPx: 94,
  currentTokens: baseTokens,
  currentContentInlinePx: 1472,
  previousPass: 0,
})
assert.equal(admitted.phase, 'committed')
assert.equal(admitted.admitted, true)

const overflow = resolveWorksReferenceFitSolution({
  revision: 7,
  fitKey: 'fit-a',
  viewport: { width: 1920, height: 1080 },
  rootFontPx: 16,
  mainAvailableBlockPx: 984,
  pageRequiredBlockPx: 1040,
  gridRequiredBlockPx: 730,
  paginationBlockPx: 44,
  maxMetadataBlockPx: 104,
  currentTokens: baseTokens,
  currentContentInlinePx: 1472,
  previousPass: 0,
})
assert.equal(overflow.phase, 'solving')
assert.equal(overflow.pass, 1)
assert.ok(overflow.tokens)
assert.ok(overflow.tokens.contentMaxRem < baseTokens.contentMaxRem)
assert.ok(overflow.tokens.gridGapRem <= baseTokens.gridGapRem)
assert.ok(overflow.tokens.cardPaddingRem <= baseTokens.cardPaddingRem)
assert.ok(overflow.tokens.cardTitleRem >= 0.84)

const second = resolveWorksReferenceFitSolution({
  revision: 7,
  fitKey: 'fit-a',
  viewport: { width: 1920, height: 1080 },
  rootFontPx: 16,
  mainAvailableBlockPx: 984,
  pageRequiredBlockPx: 1010,
  gridRequiredBlockPx: 700,
  paginationBlockPx: 44,
  maxMetadataBlockPx: 110,
  currentTokens: overflow.tokens,
  currentContentInlinePx: overflow.tokens.contentMaxRem * 16,
  previousPass: overflow.pass,
})
assert.equal(second.phase, 'solving')
assert.equal(second.pass, 2)
assert.ok(second.tokens.cardTitleRem >= 0.84)

const invalid = resolveWorksReferenceFitSolution({
  revision: 7,
  fitKey: 'fit-a',
  viewport: { width: 1920, height: 1080 },
  rootFontPx: 16,
  mainAvailableBlockPx: 500,
  pageRequiredBlockPx: 1200,
  gridRequiredBlockPx: 900,
  paginationBlockPx: 44,
  maxMetadataBlockPx: 180,
  currentTokens: second.tokens,
  currentContentInlinePx: second.tokens.contentMaxRem * 16,
  previousPass: WORKS_REFERENCE_MAX_FIT_PASSES,
})
assert.equal(invalid.phase, 'invalid')
assert.equal(invalid.admitted, false)

const derived = resolveWorksReferenceFitSolution({
  revision: 8,
  fitKey: 'fit-b',
  viewport: { width: 1920, height: 920 },
  rootFontPx: 16,
  mainAvailableBlockPx: 824,
  pageRequiredBlockPx: 900,
  gridRequiredBlockPx: 650,
  paginationBlockPx: 44,
  maxMetadataBlockPx: 104,
  currentTokens: baseTokens,
  currentContentInlinePx: 1400,
  previousPass: 0,
})
assert.equal(derived.phase, 'pending')
assert.equal(derived.hardReference, false)

assert.equal(maxWorksCardMetadataBlockPx([
  { projectId: 'a', cardBlockPx: 300, metadataBlockPx: 76 },
  { projectId: 'b', cardBlockPx: 330, metadataBlockPx: 112 },
  { projectId: 'c', cardBlockPx: 320, metadataBlockPx: 89 },
]), 112)

console.log('PASS_1920X1080_HARD_REFERENCE_DETECTION')
console.log('PASS_REFERENCE_PAGINATION_FIRST_RESERVED_FIT')
console.log('PASS_REFERENCE_BOUNDED_THREE_PASS_GEOMETRY_SOLVER')
console.log('PASS_REFERENCE_TYPOGRAPHY_MINIMUM_PRESERVATION')
console.log('PASS_REFERENCE_INVALID_DOES_NOT_SILENTLY_ADMIT')
console.log('PASS_DERIVED_VIEWPORT_NOT_PROMOTED_TO_HARD_REFERENCE')
console.log('PASS_WORST_VISIBLE_CARD_METADATA_AUTHORITY')
console.log('PASS_MMJ_UI29_WORKS_1920X1080_HARD_FIT_8TILE_VIEWPORT_AUTHORITY_R3')
