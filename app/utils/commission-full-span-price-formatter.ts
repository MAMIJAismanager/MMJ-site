import {
  formatCommissionRecurringPrice,
  formatCommissionRecurringPriceAccessible,
} from '~/utils/commission-recurring-price-formatter'
import {
  createCommissionOverridePriceDisplay,
  serializeCommissionPriceDisplay,
} from '~/types/commission-price-display'

import type {
  CommissionPriceDisplay,
} from '~/types/commission-price-display'
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

export function createCommissionFullSpanPriceDisplay(
  cell: CommissionPricingFullSpanCell,
  pricing: PricingUnit,
): CommissionPriceDisplay {
  switch (cell.mode) {
    case 'from':
    case 'fixed': {
      const accessibleLabel = cell.mode === 'from'
        ? `${formatAccessibleAmount(cell.amountKrw, pricing)}부터`
        : `${formatAccessibleAmount(cell.amountKrw, pricing)} 고정`

      if (cell.displayOverride !== null) {
        return createCommissionOverridePriceDisplay(
          cell.displayOverride,
          accessibleLabel,
        )
      }

      return Object.freeze({
        kind: 'numeric',
        core: formatAmount(cell.amountKrw, pricing),
        suffix: cell.mode === 'from' ? '~' : null,
        accessibleLabel,
      })
    }

    case 'recurring-from':
      return Object.freeze({
        kind: 'text',
        text: formatCommissionRecurringPrice(cell, pricing),
        accessibleLabel: formatCommissionRecurringPriceAccessible(cell),
      })
  }

  throw new TypeError('commission-full-span-price-mode-unsupported')
}

export function formatCommissionFullSpanPrice(
  cell: CommissionPricingFullSpanCell,
  pricing: PricingUnit,
): string {
  return serializeCommissionPriceDisplay(
    createCommissionFullSpanPriceDisplay(cell, pricing),
  )
}

export function formatCommissionFullSpanPriceAccessible(
  cell: CommissionPricingFullSpanCell,
  pricing: PricingUnit,
): string {
  return createCommissionFullSpanPriceDisplay(cell, pricing).accessibleLabel
}
