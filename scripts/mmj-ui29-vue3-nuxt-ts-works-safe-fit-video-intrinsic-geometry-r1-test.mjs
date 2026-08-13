import assert from 'node:assert/strict'

import {
  resolveWorksLayoutProfile,
} from '../app/works/works-layout-profile.ts'
import {
  resolveWorksNaturalPhysicalFit,
} from '../app/works/works-physical-fit.ts'
import {
  resolveVideoGeometryProfile,
} from '../app/video/video-geometry-profile.ts'

const referenceCandidate = resolveWorksLayoutProfile({ width: 1920, height: 1080 })
assert.equal(referenceCandidate.mode, 'desktop-reference')
assert.equal(referenceCandidate.columnCount, 4)
assert.equal(referenceCandidate.pageRowCount, 2)
assert.equal(referenceCandidate.viewportLocked, false)
assert.equal(referenceCandidate.lockEligible, true)
assert.equal(referenceCandidate.paginationPlacement, 'in-flow')
assert.equal(referenceCandidate.viewportFit.admitted, false)

const physicalReceipt = resolveWorksNaturalPhysicalFit({
  fitKey: 'r1-compat-reference',
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
const physicallyAdmittedReference = resolveWorksLayoutProfile(
  { width: 1920, height: 1080 },
  physicalReceipt,
)
assert.equal(physicallyAdmittedReference.viewportLocked, true)
assert.equal(physicallyAdmittedReference.viewportFit.admitted, true)
assert.equal(physicallyAdmittedReference.viewportFit.admission, 'reference')

const browserChromeConstrained = resolveWorksLayoutProfile({ width: 1920, height: 900 })
assert.equal(browserChromeConstrained.mode, 'desktop-reference')
assert.equal(browserChromeConstrained.columnCount, 4)
assert.equal(browserChromeConstrained.pageRowCount, 2)
assert.equal(browserChromeConstrained.viewportLocked, false)
assert.equal(browserChromeConstrained.lockEligible, true)
assert.equal(browserChromeConstrained.cardDensity, 'compact')
assert.equal(browserChromeConstrained.paginationPlacement, 'in-flow')

const insufficientHeight = resolveWorksLayoutProfile({ width: 1440, height: 700 })
assert.equal(insufficientHeight.mode, 'desktop-flow')
assert.equal(insufficientHeight.viewportLocked, false)
assert.equal(insufficientHeight.lockEligible, false)
assert.equal(insufficientHeight.paginationPlacement, 'in-flow')

const wideCandidate = resolveWorksLayoutProfile({ width: 2560, height: 1080 })
assert.equal(wideCandidate.mode, 'desktop-wide')
assert.equal(wideCandidate.viewportLocked, false)
assert.equal(wideCandidate.lockEligible, true)
assert.equal(wideCandidate.paginationPlacement, 'in-flow')

const video169 = resolveVideoGeometryProfile({
  intrinsicWidth: 1920,
  intrinsicHeight: 1080,
  constraint: { maxInlinePx: 920, maxBlockPx: 680 },
  fullscreen: false,
})
assert.equal(video169.fit, 'contain')
assert.equal(video169.allowCrop, false)
assert.equal(video169.allowStretch, false)
assert.equal(video169.allowUpscale, false)
assert.equal(video169.renderedInlinePx, 920)
assert.equal(video169.renderedBlockPx, 517.5)
assert.equal(video169.renderedInlinePx / video169.renderedBlockPx, 16 / 9)

const video43 = resolveVideoGeometryProfile({
  intrinsicWidth: 1440,
  intrinsicHeight: 1080,
  constraint: { maxInlinePx: 920, maxBlockPx: 680 },
  fullscreen: false,
})
assert.equal(video43.mode, 'downscaled-block')
assert.equal(video43.renderedBlockPx, 680)
assert.ok(Math.abs((video43.renderedInlinePx / video43.renderedBlockPx) - (4 / 3)) < 0.001)

const portrait = resolveVideoGeometryProfile({
  intrinsicWidth: 1080,
  intrinsicHeight: 1920,
  constraint: { maxInlinePx: 920, maxBlockPx: 680 },
  fullscreen: false,
})
assert.equal(portrait.renderedBlockPx, 680)
assert.equal(portrait.renderedInlinePx, 382.5)
assert.ok(Math.abs((portrait.renderedInlinePx / portrait.renderedBlockPx) - (9 / 16)) < 0.001)

const noUpscale = resolveVideoGeometryProfile({
  intrinsicWidth: 640,
  intrinsicHeight: 360,
  constraint: { maxInlinePx: 1200, maxBlockPx: 900 },
  fullscreen: false,
})
assert.equal(noUpscale.mode, 'intrinsic')
assert.equal(noUpscale.renderedInlinePx, 640)
assert.equal(noUpscale.renderedBlockPx, 360)

const fullscreen = resolveVideoGeometryProfile({
  intrinsicWidth: 640,
  intrinsicHeight: 360,
  constraint: { maxInlinePx: 1200, maxBlockPx: 900 },
  fullscreen: true,
})
assert.equal(fullscreen.mode, 'fullscreen-contain')
assert.equal(fullscreen.renderedInlinePx, 640)
assert.equal(fullscreen.renderedBlockPx, 360)
assert.equal(fullscreen.allowUpscale, false)

assert.throws(
  () => resolveVideoGeometryProfile({
    intrinsicWidth: 0,
    intrinsicHeight: 1080,
    constraint: null,
    fullscreen: false,
  }),
  /E_MMJ_VIDEO_GEOMETRY_INVALID_INTRINSIC_WIDTH/,
)

console.log('PASS_WORKS_REFERENCE_CANDIDATE_BUDGET')
console.log('PASS_WORKS_PHYSICAL_RECEIPT_LOCK_ADMISSION')
console.log('PASS_WORKS_NATURAL_FLOW_FALLBACK')
console.log('PASS_PAGINATION_IN_FLOW_RESERVATION')
console.log('PASS_VIDEO_INTRINSIC_ASPECT_PRESERVATION')
console.log('PASS_VIDEO_NO_CROP_NO_STRETCH_NO_UPSCALE')
console.log('PASS_FULLSCREEN_INTRINSIC_CONTAIN_MODE')
console.log('PASS_MMJ_UI29_VUE3_NUXT_TS_WORKS_SAFE_FIT_AND_VIDEO_INTRINSIC_GEOMETRY_R1')
