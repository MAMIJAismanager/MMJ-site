import assert from 'node:assert/strict'

import {
  resolveWorksLayoutProfile,
} from '../app/works/works-layout-profile.ts'
import {
  resolveVideoGeometryProfile,
} from '../app/video/video-geometry-profile.ts'

const reference = resolveWorksLayoutProfile({ width: 1920, height: 1080 })
assert.equal(reference.mode, 'desktop-reference')
assert.equal(reference.columnCount, 4)
assert.equal(reference.pageRowCount, 2)
assert.equal(reference.viewportLocked, true)
assert.equal(reference.paginationPlacement, 'in-flow')
assert.equal(reference.viewportFit.admitted, true)
assert.equal(reference.viewportFit.admission, 'reference')
assert.ok(reference.viewportFit.requiredBlockPx <= reference.viewportFit.availableBlockPx)

const browserChromeConstrained = resolveWorksLayoutProfile({ width: 1920, height: 900 })
assert.equal(browserChromeConstrained.mode, 'desktop-reference')
assert.equal(browserChromeConstrained.columnCount, 4)
assert.equal(browserChromeConstrained.pageRowCount, 2)
assert.equal(browserChromeConstrained.viewportLocked, true)
assert.equal(browserChromeConstrained.paginationPlacement, 'in-flow')
assert.equal(browserChromeConstrained.viewportFit.admitted, true)
assert.ok(browserChromeConstrained.viewportFit.requiredBlockPx <= browserChromeConstrained.viewportFit.availableBlockPx)
assert.ok(browserChromeConstrained.tokens.contentMaxRem < reference.tokens.contentMaxRem)

const compactThreshold = resolveWorksLayoutProfile({ width: 1440, height: 760 })
assert.equal(compactThreshold.mode, 'desktop-reference')
assert.equal(compactThreshold.viewportLocked, true)
assert.equal(compactThreshold.viewportFit.admitted, true)
assert.equal(compactThreshold.viewportFit.admission, 'compact')
assert.equal(compactThreshold.cardDensity, 'compact')

const insufficientHeight = resolveWorksLayoutProfile({ width: 1440, height: 700 })
assert.equal(insufficientHeight.mode, 'desktop-flow')
assert.equal(insufficientHeight.viewportLocked, false)
assert.equal(insufficientHeight.viewportFit.admitted, false)
assert.equal(insufficientHeight.paginationPlacement, 'in-flow')

const wide = resolveWorksLayoutProfile({ width: 2560, height: 1080 })
assert.equal(wide.mode, 'desktop-wide')
assert.equal(wide.viewportLocked, true)
assert.equal(wide.paginationPlacement, 'in-flow')
assert.ok(wide.viewportFit.requiredBlockPx <= wide.viewportFit.availableBlockPx)

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

console.log('PASS_WORKS_REFERENCE_FIT_BUDGET')
console.log('PASS_WORKS_BROWSER_CHROME_SAFE_COMPACTION')
console.log('PASS_WORKS_COMPACT_RETRY_AND_FLOW_DEMOTION')
console.log('PASS_PAGINATION_IN_FLOW_RESERVATION')
console.log('PASS_VIDEO_INTRINSIC_ASPECT_PRESERVATION')
console.log('PASS_VIDEO_NO_CROP_NO_STRETCH_NO_UPSCALE')
console.log('PASS_FULLSCREEN_INTRINSIC_CONTAIN_MODE')
console.log('PASS_MMJ_UI29_VUE3_NUXT_TS_WORKS_SAFE_FIT_AND_VIDEO_INTRINSIC_GEOMETRY_R1')
