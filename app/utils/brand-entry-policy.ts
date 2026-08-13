export type BrandEntrySurface = 'header' | 'mobile-menu'

export const BRAND_DOUBLE_CLICK_WINDOW_MS = 280
export const BRAND_POINTER_MOVE_CANCEL_PX = 8
export const BRAND_FEEDBACK_DURATION_MS = 320
export const BRAND_HAPTIC_PATTERN_MS: readonly number[] = Object.freeze([18, 42, 18])

export function isBrandDoubleActivationPointer(
  pointerType: string | null,
): pointerType is 'mouse' | 'touch' {
  return pointerType === 'mouse' || pointerType === 'touch'
}

export function isBrandDoubleActivationMatch(
  pendingPointerType: string | null,
  currentPointerType: string | null,
  pendingSurface: BrandEntrySurface | null,
  currentSurface: BrandEntrySurface,
): boolean {
  return (
    isBrandDoubleActivationPointer(currentPointerType)
    && pendingPointerType === currentPointerType
    && pendingSurface === currentSurface
  )
}

export function didBrandPointerMoveBeyondThreshold(
  deltaX: number,
  deltaY: number,
): boolean {
  return Math.hypot(deltaX, deltaY) > BRAND_POINTER_MOVE_CANCEL_PX
}
