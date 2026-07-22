import type {
  CommissionMatrixPricing,
  CommissionPricingCell,
} from '~~/shared/types/commission-guide'

function readCommissionPriceValue(
  cell: CommissionPricingCell,
  pricing: Pick<CommissionMatrixPricing, 'displayUnit'>,
): string {
  if (cell.amountKrw === null) {
    throw new TypeError('commission-price-amount-required')
  }

  return pricing.displayUnit === 'manwon'
    ? (cell.amountKrw / 10_000).toFixed(1)
    : cell.amountKrw.toLocaleString('ko-KR')
}

export function formatCommissionPriceCell(
  cell: CommissionPricingCell,
  pricing: Pick<CommissionMatrixPricing, 'displayUnit'>,
): string {
  if (cell.displayOverride !== null) return cell.displayOverride
  if (cell.mode === 'quote') return '협의'

  const value = readCommissionPriceValue(cell, pricing)

  switch (cell.mode) {
    case 'from':
      return `${value}~`

    case 'fixed':
      return `${value} 고정`
  }
}

export function formatCommissionPriceCellAccessible(
  cell: CommissionPricingCell,
  pricing: Pick<CommissionMatrixPricing, 'displayUnit'>,
): string {
  if (cell.displayOverride !== null) return cell.displayOverride
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
}
