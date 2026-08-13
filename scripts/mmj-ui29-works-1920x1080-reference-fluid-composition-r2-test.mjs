import assert from 'node:assert/strict'

import {
  WORKS_PENDING_LAYOUT_PROFILE,
  WORKS_REFERENCE_MIN_VIEWPORT,
  WORKS_REFERENCE_VIEWPORT,
  resolveWorksLayoutProfile,
} from '../app/works/works-layout-profile.ts'

assert.deepEqual(WORKS_REFERENCE_VIEWPORT, {
  width: 1920,
  height: 1080,
})
assert.deepEqual(WORKS_REFERENCE_MIN_VIEWPORT, {
  width: 1440,
  height: 760,
})
assert.equal(WORKS_PENDING_LAYOUT_PROFILE.viewportLocked, false)

const reference = resolveWorksLayoutProfile({ width: 1920, height: 1080 })
assert.equal(reference.mode, 'desktop-reference')
assert.equal(reference.columnCount, 4)
assert.equal(reference.pageRowCount, 2)
assert.equal(reference.viewportLocked, true)
assert.equal(reference.mobileQueryPlacement, false)
assert.equal(reference.referenceScale, 1)
assert.equal(reference.verticalScale, 1)
assert.equal(reference.cardDensity, 'reference')
assert.ok(reference.tokens.titleRem <= 3.15)
assert.ok(reference.tokens.contentMaxRem <= 108)

const scaledReference = resolveWorksLayoutProfile({ width: 1536, height: 864 })
assert.equal(scaledReference.mode, 'desktop-reference')
assert.equal(scaledReference.columnCount, 4)
assert.equal(scaledReference.pageRowCount, 2)
assert.equal(scaledReference.viewportLocked, true)
assert.equal(scaledReference.referenceScale, 0.8)
assert.ok(scaledReference.tokens.titleRem < reference.tokens.titleRem)
assert.ok(scaledReference.tokens.contentMaxRem < reference.tokens.contentMaxRem)

const wide = resolveWorksLayoutProfile({ width: 2560, height: 1080 })
assert.equal(wide.mode, 'desktop-wide')
assert.equal(wide.columnCount, 4)
assert.equal(wide.pageRowCount, 2)
assert.equal(wide.viewportLocked, true)
assert.equal(wide.referenceScale, 1)
assert.equal(wide.tokens.contentMaxRem, reference.tokens.contentMaxRem)

const largeWide = resolveWorksLayoutProfile({ width: 3440, height: 1440 })
assert.equal(largeWide.mode, 'desktop-wide')
assert.equal(largeWide.referenceScale, 1.18)
assert.equal(largeWide.cardDensity, 'relaxed')
assert.ok(largeWide.tokens.contentMaxRem > reference.tokens.contentMaxRem)

const mobile = resolveWorksLayoutProfile({ width: 390, height: 844 })
assert.equal(mobile.mode, 'mobile-checkerboard')
assert.equal(mobile.columnCount, 2)
assert.equal(mobile.pageRowCount, 4)
assert.equal(mobile.viewportLocked, false)
assert.equal(mobile.mobileQueryPlacement, true)
assert.equal(mobile.cardDensity, 'compact')

const narrowMobile = resolveWorksLayoutProfile({ width: 320, height: 640 })
assert.equal(narrowMobile.mode, 'mobile-single')
assert.equal(narrowMobile.columnCount, 1)
assert.equal(narrowMobile.pageRowCount, 8)
assert.equal(narrowMobile.mobileQueryPlacement, true)

const tablet = resolveWorksLayoutProfile({ width: 1024, height: 768 })
assert.equal(tablet.mode, 'tablet-flow')
assert.equal(tablet.columnCount, 2)
assert.equal(tablet.viewportLocked, false)

const desktopFlow = resolveWorksLayoutProfile({ width: 1366, height: 768 })
assert.equal(desktopFlow.mode, 'desktop-flow')
assert.equal(desktopFlow.columnCount, 3)
assert.equal(desktopFlow.viewportLocked, false)

const threshold = resolveWorksLayoutProfile({ width: 1440, height: 760 })
assert.equal(threshold.mode, 'desktop-reference')
assert.equal(threshold.columnCount, 4)
assert.equal(threshold.viewportLocked, true)

assert.deepEqual(
  resolveWorksLayoutProfile({ width: 1920, height: 1080 }),
  resolveWorksLayoutProfile({ width: 1920, height: 1080 }),
)

console.log('PASS_1920X1080_REFERENCE_PROFILE')
console.log('PASS_SCALED_REFERENCE_PROFILE')
console.log('PASS_ULTRAWIDE_CONTINUOUS_PROFILE')
console.log('PASS_MOBILE_TWO_BY_FOUR_CHECKERBOARD_PROFILE')
console.log('PASS_EXTREME_NARROW_MOBILE_SINGLE_COLUMN_SAFETY')
console.log('PASS_DETERMINISTIC_WORKS_LAYOUT_PROFILE')
console.log('PASS_MMJ_UI29_WORKS_1920X1080_REFERENCE_FLUID_COMPOSITION_AND_MOBILE_CHECKERBOARD_R2')
