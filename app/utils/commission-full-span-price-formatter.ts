import {
  formatCommissionRecurringPrice,
  formatCommissionRecurringPriceAccessible,
} from '~/utils/commission-recurring-price-formatter'

import type {
  CommissionMatrixPricing,
  CommissionPricingFullSpanCell,
} from '~~/shared/types/commission-guide'

type PricingUnit = Pick<CommissionMatrixPricing, 'displayUnit'>

function formatAmount(
  amountKrw: number,
  pricing: PricingUnit,
): string {
  if (!Number.isSafeInteger(amountKrw) || amountKrw < 0) {
    throw new TypeError(
      `commission-full-span-price-invalid-amount:${amountKrw}`,
    )
  }

  return pricing.displayUnit === 'manwon'
    ? (amountKrw / 10_000).toFixed(1)
    : new Intl.NumberFormat('ko-KR').format(amountKrw)
}

function formatAccessibleAmount(
  amountKrw: number,
  pricing: PricingUnit,
): string {
  return pricing.displayUnit === 'manwon'
    ? `${(amountKrw / 10_000).toFixed(1)}만원`
    : `${new Intl.NumberFormat('ko-KR').format(amountKrw)}원`
}

export function formatCommissionFullSpanPrice(
  cell: CommissionPricingFullSpanCell,
  pricing: PricingUnit,
): string {
  switch (cell.mode) {
    case 'from':
      return cell.displayOverride ?? `${formatAmount(cell.amountKrw, pricing)}~`

    case 'fixed':
      return cell.displayOverride ?? formatAmount(cell.amountKrw, pricing)

    case 'recurring-from':
      return formatCommissionRecurringPrice(cell, pricing)
  }
}

export function formatCommissionFullSpanPriceAccessible(
  cell: CommissionPricingFullSpanCell,
  pricing: PricingUnit,
): string {
  switch (cell.mode) {
    case 'from':
      return `${formatAccessibleAmount(cell.amountKrw, pricing)}부터`

    case 'fixed':
      return `${formatAccessibleAmount(cell.amountKrw, pricing)} 고정`

    case 'recurring-from':
      return formatCommissionRecurringPriceAccessible(cell)
  }
}
