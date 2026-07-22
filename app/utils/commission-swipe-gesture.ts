export type CommissionSwipeAxis =
  | 'pending'
  | 'horizontal'
  | 'vertical'

export type CommissionSwipeDirection =
  | 'previous'
  | 'next'

export interface CommissionSwipeGestureState {
  readonly pointerId: number | null
  readonly startX: number
  readonly startY: number
  readonly currentX: number
  readonly currentY: number
  readonly startedAt: number
  readonly axis: CommissionSwipeAxis
}

export interface CommissionSwipeDecision {
  readonly direction: CommissionSwipeDirection
  readonly deltaX: number
  readonly velocityX: number
  readonly commits: boolean
}

export const COMMISSION_SWIPE_AXIS_LOCK_PX = 8
export const COMMISSION_SWIPE_DISTANCE_PX = 52
export const COMMISSION_SWIPE_VELOCITY_PX_PER_MS = 0.42

export function createIdleCommissionSwipeState(): CommissionSwipeGestureState {
  return Object.freeze({
    pointerId: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    startedAt: 0,
    axis: 'pending',
  })
}

export function resolveCommissionSwipeAxis(
  deltaX: number,
  deltaY: number,
): CommissionSwipeAxis {
  const absoluteX = Math.abs(deltaX)
  const absoluteY = Math.abs(deltaY)
  if (
    absoluteX < COMMISSION_SWIPE_AXIS_LOCK_PX
    && absoluteY < COMMISSION_SWIPE_AXIS_LOCK_PX
  ) {
    return 'pending'
  }
  return absoluteX > absoluteY * 1.12
    ? 'horizontal'
    : 'vertical'
}

export function decideCommissionSwipe(
  state: CommissionSwipeGestureState,
  endedAt: number,
): CommissionSwipeDecision {
  const deltaX = state.currentX - state.startX
  const elapsed = Math.max(1, endedAt - state.startedAt)
  const velocityX = deltaX / elapsed
  const direction: CommissionSwipeDirection = deltaX < 0
    ? 'next'
    : 'previous'

  return Object.freeze({
    direction,
    deltaX,
    velocityX,
    commits: state.axis === 'horizontal' && (
      Math.abs(deltaX) >= COMMISSION_SWIPE_DISTANCE_PX
      || Math.abs(velocityX) >= COMMISSION_SWIPE_VELOCITY_PX_PER_MS
    ),
  })
}

export function applyCommissionSwipeEdgeResistance(
  deltaX: number,
  canMove: boolean,
): number {
  return canMove ? deltaX : deltaX * 0.24
}
