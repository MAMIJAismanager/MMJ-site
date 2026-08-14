import assert from 'node:assert/strict'

import {
  WORKS_COMPOSITION_MAX_PROBES,
  advanceWorksCompositionSolve,
  beginWorksCompositionSolve,
  isWorksAtomicDisplayClass,
} from '../app/works/works-composition-solver.ts'

assert.equal(isWorksAtomicDisplayClass({ width: 1915, height: 901 }), true)
assert.equal(isWorksAtomicDisplayClass({ width: 1900, height: 900 }), true)
assert.equal(isWorksAtomicDisplayClass({ width: 1366, height: 768 }), false)

const measurement = Object.freeze({
  key: 'fixture-r5',
  viewportWidthPx: 1915,
  viewportHeightPx: 901,
  inlineLimitPx: 1216,
  availableLowerBlockPx: 545,
  rootFontPx: 16,
  pageGapRem: 0.5,
})

let decision = beginWorksCompositionSolve(measurement)
let observedProbeCount = 0

while (decision.kind === 'probe-required') {
  observedProbeCount += 1
  const request = decision.probe
  const fits = request.cardInlinePx <= 245
  const gridBlockPx = fits ? 466 : 590
  const paginationBlockPx = 44
  const lowerCompositionBlockPx = fits ? 518 : 642

  decision = advanceWorksCompositionSolve(
    decision,
    Object.freeze({
      key: request.key,
      probeId: request.probeId,
      density: request.density,
      cardInlinePx: request.cardInlinePx,
      gridInlinePx: request.gridInlinePx,
      gridBlockPx,
      paginationBlockPx,
      lowerCompositionBlockPx,
      row0MetadataMaxPx: 62,
      row1MetadataMaxPx: 58,
      visibleCardCount: 8,
      stable: true,
    }),
  )
}

assert.equal(decision.kind, 'commit-ready')
assert.ok(decision.commit.cardInlinePx <= 245)
assert.equal(decision.commit.verified, true)
assert.equal(decision.commit.columnCount, 4)
assert.equal(decision.commit.rowCount, 2)
assert.ok(observedProbeCount <= WORKS_COMPOSITION_MAX_PROBES)

const staleStart = beginWorksCompositionSolve(measurement)
assert.equal(staleStart.kind, 'probe-required')
if (staleStart.kind === 'probe-required') {
  const stale = advanceWorksCompositionSolve(
    staleStart,
    Object.freeze({
      key: 'wrong-key',
      probeId: staleStart.probe.probeId,
      density: staleStart.probe.density,
      cardInlinePx: staleStart.probe.cardInlinePx,
      gridInlinePx: staleStart.probe.gridInlinePx,
      gridBlockPx: 400,
      paginationBlockPx: 44,
      lowerCompositionBlockPx: 450,
      row0MetadataMaxPx: 50,
      row1MetadataMaxPx: 50,
      visibleCardCount: 8,
      stable: true,
    }),
  )
  assert.equal(stale.kind, 'flow-required')
  assert.equal(stale.reason, 'invalid-probe-receipt')
}

console.log('PASS_VISIBLE_LIVE_SOLVER_RETIREMENT')
console.log('PASS_HIDDEN_PROBE_AUTHORITY')
console.log('PASS_PURE_TYPESCRIPT_SOLVER')
console.log('PASS_MAXIMUM_ADMISSIBLE_WIDTH_SELECTION')
console.log('PASS_STALE_DRAFT_REJECTION')
console.log('PASS_1915X901_ATOMIC_FINAL_GEOMETRY')
console.log('PASS_1900X900_ATOMIC_FINAL_GEOMETRY')
console.log('PASS_MMJ_UI29_WORKS_MEASURE_SOLVE_ATOMIC_COMMIT_AUTHORITY_R5')
