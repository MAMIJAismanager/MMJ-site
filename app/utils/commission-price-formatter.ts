import {
  createCommissionNumericPriceDisplay,
  createCommissionOverridePriceDisplay,
  createCommissionTextPriceDisplay,
  serializeCommissionPriceDisplay,
} from '~/types/commission-price-display'

import type {
  CommissionPriceDisplay,
} from '~/types/commission-price-display'
import type {
  CommissionMatrixPricing,
  CommissionPricingCell,
} from '~~/shared/types/commission-guide'

type PricingUnit = Pick<CommissionMatrixPricing, 'displayUnit'>

function readCommissionPriceValue(
  cell: CommissionPricingCell,
  pricing: PricingUnit,
): string {
  if (cell.amountKrw === null) {
    throw new TypeError('commission-price-amount-required')
  }

  return pricing.displayUnit === 'manwon'
    ? (cell.amountKrw / 10_000).toFixed(1)
    : cell.amountKrw.toLocaleString('ko-KR')
}

function formatCommissionPriceCellAccessibleLabel(
  cell: CommissionPricingCell,
  pricing: PricingUnit,
): string {
  if (cell.mode === 'not-listed') return '가격 미기재'
  if (cell.mode === 'quote') return '가격 협의'
  if (cell.amountKrw === null) {
    throw new TypeError('commission-price-amount-required')
  }

  const amount = cell.amountKrw.toLocaleString('ko-KR')
  const unit = pricing.displayUnit === 'manwon'
    ? `${(cell.amountKrw / 10_000).toFixed(1)}만원`
    : `${amount}원`

  switch (cell.mode) {
    case 'from':
      return `${unit}부터`

    case 'fixed':
      return `${unit} 고정`
  }

  throw new TypeError('commission-price-mode-unsupported')
}

export function createCommissionPriceCellDisplay(
  cell: CommissionPricingCell,
  pricing: PricingUnit,
): CommissionPriceDisplay {
  const accessibleLabel = formatCommissionPriceCellAccessibleLabel(
    cell,
    pricing,
  )

  if (cell.mode === 'not-listed') {
    return createCommissionTextPriceDisplay(
      '—',
      accessibleLabel,
    )
  }

  if (cell.mode === 'quote') {
    return createCommissionTextPriceDisplay(
      '협의',
      accessibleLabel,
    )
  }

  if (cell.displayOverride !== null) {
    return createCommissionOverridePriceDisplay(
      cell.displayOverride,
      accessibleLabel,
    )
  }

  const value = readCommissionPriceValue(cell, pricing)
  switch (cell.mode) {
    case 'from':
      return createCommissionNumericPriceDisplay(
        value,
        '~',
        accessibleLabel,
      )

    case 'fixed':
      return createCommissionTextPriceDisplay(
        `${value} 고정`,
        accessibleLabel,
      )
  }

  throw new TypeError('commission-price-mode-unsupported')
}

export function formatCommissionPriceCell(
  cell: CommissionPricingCell,
  pricing: PricingUnit,
): string {
  return serializeCommissionPriceDisplay(
    createCommissionPriceCellDisplay(cell, pricing),
  )
}

export function formatCommissionPriceCellAccessible(
  cell: CommissionPricingCell,
  pricing: PricingUnit,
): string {
  return formatCommissionPriceCellAccessibleLabel(cell, pricing)
}
