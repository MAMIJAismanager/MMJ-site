import type {
  CommissionMatrixPricing,
  CommissionRecurringFullSpanCell,
} from '~~/shared/types/commission-guide'

type PricingUnit = Pick<CommissionMatrixPricing, 'displayUnit'>

function formatAmount(
  amountKrw: number,
  pricing: PricingUnit,
): string {
  if (!Number.isSafeInteger(amountKrw) || amountKrw < 0) {
    throw new TypeError(
      `commission-recurring-price-invalid-amount:${amountKrw}`,
    )
  }

  if (pricing.displayUnit === 'manwon') {
    return (amountKrw / 10_000).toFixed(1)
  }

  return new Intl.NumberFormat('ko-KR').format(amountKrw)
}

export function formatCommissionRecurringPrice(
  cell: CommissionRecurringFullSpanCell,
  pricing: PricingUnit,
): string {
  return `주 ${formatAmount(cell.weeklyAmountKrw, pricing)}~ / 월 ${formatAmount(cell.monthlyAmountKrw, pricing)}~`
}

export function formatCommissionRecurringPriceAccessible(
  cell: CommissionRecurringFullSpanCell,
): string {
  const numberFormat = new Intl.NumberFormat('ko-KR')
  return `주당 ${numberFormat.format(cell.weeklyAmountKrw)}원부터, 월 ${numberFormat.format(cell.monthlyAmountKrw)}원부터`
}
