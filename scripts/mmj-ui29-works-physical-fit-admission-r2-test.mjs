import assert from 'node:assert/strict'

import {
  resolveWorksLayoutProfile,
} from '../app/works/works-layout-profile.ts'
import {
  isStableWorksPhysicalMeasurement,
  resolveWorksNaturalPhysicalFit,
  verifyWorksLockedPhysicalCommit,
} from '../app/works/works-physical-fit.ts'

const candidate = resolveWorksLayoutProfile({ width: 1920, height: 1080 })
assert.equal(candidate.mode, 'desktop-reference')
assert.equal(candidate.columnCount, 4)
assert.equal(candidate.pageRowCount, 2)
assert.equal(candidate.lockEligible, true)
assert.equal(candidate.viewportLocked, false)
assert.equal(candidate.physicalFitPhase, 'unmeasured')
assert.equal(candidate.paginationPlacement, 'in-flow')

const naturalSnapshot = Object.freeze({
  fitKey: 'viewport:1|page:1|projects:a,b,c,d,e,f,g,h',
  revision: 1,
  viewportBlockPx: 1080,
  siteHeaderBlockPx: 72,
  mainAvailableBlockPx: 1008,
  pageClientBlockPx: 920,
  pageScrollBlockPx: 920,
  headerBlockPx: 72,
  queryBlockPx: 86,
  summaryBlockPx: 22,
  gridClientBlockPx: 610,
  gridScrollBlockPx: 610,
  paginationBlockPx: 44,
  gridBottomPx: 900,
  paginationTopPx: 916,
})

assert.equal(
  isStableWorksPhysicalMeasurement(naturalSnapshot, {
    ...naturalSnapshot,
    pageScrollBlockPx: 920.4,
  }),
  true,
)
assert.equal(
  isStableWorksPhysicalMeasurement(naturalSnapshot, {
    ...naturalSnapshot,
    pageScrollBlockPx: 922,
  }),
  false,
)

const naturalReceipt = resolveWorksNaturalPhysicalFit(naturalSnapshot)
assert.equal(naturalReceipt.phase, 'admitted-locked')
assert.equal(naturalReceipt.admitted, true)
assert.equal(naturalReceipt.commitVerified, false)
assert.equal(naturalReceipt.collisionObserved, false)

const lockedProfile = resolveWorksLayoutProfile(
  { width: 1920, height: 1080 },
  naturalReceipt,
)
assert.equal(lockedProfile.viewportLocked, true)
assert.equal(lockedProfile.viewportFit.admitted, true)
assert.equal(lockedProfile.viewportFit.admission, 'reference')

const rejectedReceipt = resolveWorksNaturalPhysicalFit({
  ...naturalSnapshot,
  pageClientBlockPx: 1030,
  pageScrollBlockPx: 1030,
})
assert.equal(rejectedReceipt.phase, 'rejected-flow')
assert.equal(rejectedReceipt.admitted, false)
assert.equal(
  resolveWorksLayoutProfile(
    { width: 1920, height: 1080 },
    rejectedReceipt,
  ).viewportLocked,
  false,
)

const verifiedReceipt = verifyWorksLockedPhysicalCommit({
  ...naturalSnapshot,
  pageClientBlockPx: 1008,
  pageScrollBlockPx: 1008,
  gridClientBlockPx: 610,
  gridScrollBlockPx: 610,
  gridBottomPx: 900,
  paginationTopPx: 916,
})
assert.equal(verifiedReceipt.phase, 'admitted-locked')
assert.equal(verifiedReceipt.commitVerified, true)
assert.equal(verifiedReceipt.collisionObserved, false)

const revokedByCollision = verifyWorksLockedPhysicalCommit({
  ...naturalSnapshot,
  pageClientBlockPx: 1008,
  pageScrollBlockPx: 1008,
  gridClientBlockPx: 610,
  gridScrollBlockPx: 610,
  gridBottomPx: 922,
  paginationTopPx: 916,
})
assert.equal(revokedByCollision.phase, 'revoked-flow')
assert.equal(revokedByCollision.admitted, false)
assert.equal(revokedByCollision.collisionObserved, true)

const revokedByGridOverflow = verifyWorksLockedPhysicalCommit({
  ...naturalSnapshot,
  pageClientBlockPx: 1008,
  pageScrollBlockPx: 1008,
  gridClientBlockPx: 580,
  gridScrollBlockPx: 610,
  gridBottomPx: 900,
  paginationTopPx: 916,
})
assert.equal(revokedByGridOverflow.phase, 'revoked-flow')
assert.equal(revokedByGridOverflow.overflowObserved, true)

const chromeConstrainedCandidate = resolveWorksLayoutProfile({
  width: 1920,
  height: 900,
})
assert.equal(chromeConstrainedCandidate.mode, 'desktop-reference')
assert.equal(chromeConstrainedCandidate.columnCount, 4)
assert.equal(chromeConstrainedCandidate.cardDensity, 'compact')
assert.equal(chromeConstrainedCandidate.viewportLocked, false)
assert.equal(chromeConstrainedCandidate.lockEligible, true)

console.log('PASS_NATURAL_FLOW_FIRST_RENDER')
console.log('PASS_ACTUAL_DOM_MEASUREMENT_RECEIPT_MODEL')
console.log('PASS_STABLE_PHYSICAL_MEASUREMENT_ADMISSION')
console.log('PASS_NO_PHYSICAL_RECEIPT_NO_VIEWPORT_LOCK')
console.log('PASS_LOCKED_COLLISION_REVOKES_TO_FLOW')
console.log('PASS_GRID_SCROLL_OVERFLOW_REVOKES_TO_FLOW')
console.log('PASS_PAGINATION_IN_FLOW_PRESERVED')
console.log('PASS_MMJ_UI29_WORKS_PHYSICAL_FIT_ADMISSION_R2')
