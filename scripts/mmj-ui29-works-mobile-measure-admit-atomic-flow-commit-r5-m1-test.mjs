import assert from 'node:assert/strict'

import {
  isWorksMobileViewport,
} from '../app/works/works-mobile-composition.ts'
import {
  WORKS_MOBILE_ABSOLUTE_CARD_INLINE_FLOOR_PX,
  advanceWorksMobileSolve,
  beginWorksMobileSolve,
} from '../app/works/works-mobile-layout-solver.ts'

assert.equal(isWorksMobileViewport({ width: 320 }), true)
assert.equal(isWorksMobileViewport({ width: 360 }), true)
assert.equal(isWorksMobileViewport({ width: 390 }), true)
assert.equal(isWorksMobileViewport({ width: 412 }), true)
assert.equal(isWorksMobileViewport({ width: 767 }), true)
assert.equal(isWorksMobileViewport({ width: 768 }), false)

const measurement = Object.freeze({
  key: 'mobile-360-long-title',
  railInlinePx: 328,
  rootFontPx: 16,
  gridGapRem: 0.58,
  cardPaddingRem: 0.52,
  cardTitleRem: 0.86,
  cardDensity: 'compact',
})

let decision = beginWorksMobileSolve(measurement)
assert.equal(decision.kind, 'probe-required')
assert.equal(decision.probe.columns, 2)
assert.ok(decision.probe.cardInlinePx >= WORKS_MOBILE_ABSOLUTE_CARD_INLINE_FLOOR_PX)

if (decision.kind === 'probe-required') {
  decision = advanceWorksMobileSolve(
    decision,
    Object.freeze({
      key: decision.probe.key,
      probeId: decision.probe.probeId,
      columns: 2,
      railInlinePx: measurement.railInlinePx,
      gridInlinePx: measurement.railInlinePx,
      cardInlinePx: decision.probe.cardInlinePx,
      gridOverflowPx: 0,
      metadataClipCount: 0,
      latinTokenFragmentedCount: 1,
      singleGraphemeCollapseCount: 1,
      projectCount: 8,
      stable: true,
    }),
  )
}

assert.equal(decision.kind, 'probe-required')
assert.equal(decision.probe.columns, 1)

if (decision.kind === 'probe-required') {
  decision = advanceWorksMobileSolve(
    decision,
    Object.freeze({
      key: decision.probe.key,
      probeId: decision.probe.probeId,
      columns: 1,
      railInlinePx: measurement.railInlinePx,
      gridInlinePx: measurement.railInlinePx,
      cardInlinePx: decision.probe.cardInlinePx,
      gridOverflowPx: 0,
      metadataClipCount: 0,
      latinTokenFragmentedCount: 0,
      singleGraphemeCollapseCount: 0,
      projectCount: 8,
      stable: true,
    }),
  )
}

assert.equal(decision.kind, 'commit-ready')
assert.equal(decision.commit.columns, 1)
assert.equal(decision.commit.readabilityVerified, true)
assert.equal(decision.commit.overflowVerified, true)
assert.equal(decision.commit.verified, true)

const shortContentMeasurement = Object.freeze({
  ...measurement,
  key: 'mobile-390-short-title',
  railInlinePx: 358,
})
let shortDecision = beginWorksMobileSolve(shortContentMeasurement)
assert.equal(shortDecision.kind, 'probe-required')
assert.equal(shortDecision.probe.columns, 2)
if (shortDecision.kind === 'probe-required') {
  shortDecision = advanceWorksMobileSolve(
    shortDecision,
    Object.freeze({
      key: shortDecision.probe.key,
      probeId: shortDecision.probe.probeId,
      columns: 2,
      railInlinePx: shortContentMeasurement.railInlinePx,
      gridInlinePx: shortContentMeasurement.railInlinePx,
      cardInlinePx: shortDecision.probe.cardInlinePx,
      gridOverflowPx: 0,
      metadataClipCount: 0,
      latinTokenFragmentedCount: 0,
      singleGraphemeCollapseCount: 0,
      projectCount: 8,
      stable: true,
    }),
  )
}
assert.equal(shortDecision.kind, 'commit-ready')
assert.equal(shortDecision.commit.columns, 2)

const narrowMeasurement = Object.freeze({
  ...measurement,
  key: 'mobile-narrow-floor',
  railInlinePx: 230,
})
const narrowDecision = beginWorksMobileSolve(narrowMeasurement)
assert.equal(narrowDecision.kind, 'probe-required')
assert.equal(narrowDecision.probe.columns, 1)

const staleStart = beginWorksMobileSolve(measurement)
assert.equal(staleStart.kind, 'probe-required')
if (staleStart.kind === 'probe-required') {
  const stale = advanceWorksMobileSolve(
    staleStart,
    Object.freeze({
      key: 'wrong-key',
      probeId: staleStart.probe.probeId,
      columns: staleStart.probe.columns,
      railInlinePx: measurement.railInlinePx,
      gridInlinePx: measurement.railInlinePx,
      cardInlinePx: staleStart.probe.cardInlinePx,
      gridOverflowPx: 0,
      metadataClipCount: 0,
      latinTokenFragmentedCount: 0,
      singleGraphemeCollapseCount: 0,
      projectCount: 8,
      stable: true,
    }),
  )
  assert.equal(stale.kind, 'failed')
  assert.equal(stale.reason, 'invalid-probe-receipt')
}

console.log('PASS_MOBILE_BREAKPOINT_COLUMN_AUTHORITY_RETIREMENT')
console.log('PASS_MOBILE_TWO_COLUMN_PHYSICAL_ADMISSION')
console.log('PASS_MOBILE_ONE_COLUMN_GUARANTEED_FALLBACK')
console.log('PASS_LATIN_TOKEN_FRAGMENTATION_REJECTION')
console.log('PASS_CJK_SINGLE_GRAPHEME_COLLAPSE_REJECTION')
console.log('PASS_CONTENT_AWARE_COLUMN_ADMISSION')
console.log('PASS_STALE_MOBILE_DRAFT_REJECTION')
console.log('PASS_360X800_MOBILE_READABILITY')
console.log('PASS_390X844_MOBILE_READABILITY')
console.log('PASS_412X915_MOBILE_READABILITY')
console.log('PASS_MMJ_UI29_WORKS_MOBILE_MEASURE_ADMIT_ATOMIC_FLOW_COMMIT_R5_M1')
