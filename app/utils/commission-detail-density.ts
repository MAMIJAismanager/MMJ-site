export type CommissionDetailDensity =
  | 'comfortable'
  | 'compact'

export interface CommissionDetailDensityInput {
  readonly availableHeight: number
  readonly requiredHeight: number
  readonly comfortableRequiredHeight: number
  readonly currentDensity: CommissionDetailDensity
}

export const COMMISSION_DETAIL_ENTER_COMPACT_OVERFLOW_PX = 4
export const COMMISSION_DETAIL_LEAVE_COMPACT_HEADROOM_PX = 40

export function resolveCommissionDetailDensity(
  input: CommissionDetailDensityInput,
): CommissionDetailDensity {
  const availableHeight = Number.isFinite(input.availableHeight)
    ? Math.max(0, input.availableHeight)
    : 0
  const requiredHeight = Number.isFinite(input.requiredHeight)
    ? Math.max(0, input.requiredHeight)
    : 0
  const comfortableRequiredHeight = Number.isFinite(
    input.comfortableRequiredHeight,
  )
    ? Math.max(0, input.comfortableRequiredHeight)
    : requiredHeight

  if (availableHeight <= 0) return input.currentDensity

  if (input.currentDensity === 'comfortable') {
    const measuredOverflow = requiredHeight - availableHeight
    if (
      measuredOverflow > COMMISSION_DETAIL_ENTER_COMPACT_OVERFLOW_PX
    ) {
      return 'compact'
    }
    return 'comfortable'
  }

  const comfortableHeadroom = availableHeight - comfortableRequiredHeight
  if (
    comfortableHeadroom
      >= COMMISSION_DETAIL_LEAVE_COMPACT_HEADROOM_PX
  ) {
    return 'comfortable'
  }

  return 'compact'
}
