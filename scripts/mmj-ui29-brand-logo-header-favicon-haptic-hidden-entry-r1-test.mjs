import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const root = process.cwd()
const policy = await import(pathToFileURL(resolve(root, 'app/utils/brand-entry-policy.ts')).href)

assert.equal(policy.BRAND_DOUBLE_CLICK_WINDOW_MS, 280)
assert.equal(policy.BRAND_POINTER_MOVE_CANCEL_PX, 8)
assert.equal(policy.BRAND_FEEDBACK_DURATION_MS, 320)
assert.deepEqual([...policy.BRAND_HAPTIC_PATTERN_MS], [18, 42, 18])
assert.equal(Object.isFrozen(policy.BRAND_HAPTIC_PATTERN_MS), true)

assert.equal(policy.isBrandDoubleActivationPointer('mouse'), true)
assert.equal(policy.isBrandDoubleActivationPointer('touch'), true)
assert.equal(policy.isBrandDoubleActivationPointer('pen'), false)
assert.equal(policy.isBrandDoubleActivationPointer('keyboard'), false)
assert.equal(policy.isBrandDoubleActivationPointer(null), false)

assert.equal(
  policy.isBrandDoubleActivationMatch('mouse', 'mouse', 'header', 'header'),
  true,
)
assert.equal(
  policy.isBrandDoubleActivationMatch('touch', 'touch', 'mobile-menu', 'mobile-menu'),
  true,
)
assert.equal(
  policy.isBrandDoubleActivationMatch('touch', 'mouse', 'header', 'header'),
  false,
)
assert.equal(
  policy.isBrandDoubleActivationMatch('touch', 'touch', 'header', 'mobile-menu'),
  false,
)

assert.equal(policy.didBrandPointerMoveBeyondThreshold(8, 0), false)
assert.equal(policy.didBrandPointerMoveBeyondThreshold(8.01, 0), true)
assert.equal(policy.didBrandPointerMoveBeyondThreshold(6, 6), true)

console.log(JSON.stringify({
  event: 'PASS_MMJ_UI29_BRAND_LOGO_HEADER_FAVICON_HAPTIC_HIDDEN_ENTRY_ADOPTION_R1_POLICY',
  doubleActivationWindowMs: policy.BRAND_DOUBLE_CLICK_WINDOW_MS,
  pointerMoveCancelPx: policy.BRAND_POINTER_MOVE_CANCEL_PX,
  feedbackDurationMs: policy.BRAND_FEEDBACK_DURATION_MS,
  hapticPatternMs: [...policy.BRAND_HAPTIC_PATTERN_MS],
}))
