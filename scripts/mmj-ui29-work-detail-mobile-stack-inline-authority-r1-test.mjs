import assert from 'node:assert/strict'

import {
  resolveWorkDetailLayoutProfile,
} from '../app/work-detail/work-detail-layout-profile.ts'

function profile(width, height, hasPrimaryMedia = true) {
  return resolveWorkDetailLayoutProfile({
    viewport: { width, height },
    hasPrimaryMedia,
    primaryMedia: hasPrimaryMedia
      ? { width: 1920, height: 1080 }
      : null,
  })
}

const documentFlow = profile(0, 0, false)
assert.equal(documentFlow.mode, 'document-flow')
assert.equal(documentFlow.composition, 'stack')
assert.equal(documentFlow.copyColumnPx, null)

for (const [width, height] of [
  [360, 800],
  [390, 844],
  [412, 915],
]) {
  const mobile = profile(width, height)
  assert.equal(mobile.mode, 'mobile-stack', `${width}x${height} must resolve mobile-stack`)
  assert.equal(mobile.composition, 'stack', `${width}x${height} must remain stack`)
  assert.equal(mobile.copyColumnPx, null, `${width}x${height} must not publish a numeric copy column`)
  assert.ok(mobile.contentMaxPx >= 288, `${width}x${height} content rail collapsed`)
  assert.ok(mobile.titlePx >= 32, `${width}x${height} title floor drifted`)
}

const compact = profile(1024, 768)
assert.equal(compact.mode, 'compact-stack')
assert.equal(compact.composition, 'stack')
assert.equal(compact.copyColumnPx, null)

const reference = profile(1920, 1080)
assert.equal(reference.mode, 'reference-split')
assert.equal(reference.composition, 'split')
assert.ok(typeof reference.copyColumnPx === 'number' && reference.copyColumnPx > 0)

const wide = profile(2560, 1440)
assert.equal(wide.mode, 'wide-split')
assert.equal(wide.composition, 'split')
assert.ok(typeof wide.copyColumnPx === 'number' && wide.copyColumnPx > 0)

for (const candidate of [documentFlow, compact, reference, wide]) {
  assert.notEqual(candidate.copyColumnPx, 0, 'zero-pixel copy column is forbidden')
}

console.log('PASS_WORK_DETAIL_ZERO_COPY_COLUMN_RETIREMENT')
console.log('PASS_STACK_COPY_COLUMN_NULL_AUTHORITY')
console.log('PASS_DOCUMENT_FLOW_NATURAL_COPY_INLINE')
console.log('PASS_MOBILE_STACK_NATURAL_COPY_INLINE')
console.log('PASS_COMPACT_STACK_NATURAL_COPY_INLINE')
console.log('PASS_REFERENCE_SPLIT_EXPLICIT_COPY_COLUMN')
console.log('PASS_WIDE_SPLIT_EXPLICIT_COPY_COLUMN')
console.log('PASS_360X800_WORK_DETAIL_STACK')
console.log('PASS_390X844_WORK_DETAIL_STACK')
console.log('PASS_412X915_WORK_DETAIL_STACK')
console.log('PASS_1920X1080_WORK_DETAIL_SPLIT_REGRESSION')
console.log('PASS_MMJ_UI29_WORK_DETAIL_MOBILE_STACK_INLINE_AUTHORITY_R1')
