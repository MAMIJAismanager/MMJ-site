import type {
  CommissionMatrixPricing,
  CommissionPricingCell,
} from '~~/shared/types/commission-guide'

export function formatCommissionPriceCell(
  cell: CommissionPricingCell,
  pricing: Pick<CommissionMatrixPricing, 'displayUnit'>,
): string {
  if (cell.displayOverride !== null) return cell.displayOverride
  if (cell.mode === 'quote') return '협의'
  if (cell.amountKrw === null) {
    throw new TypeError('commission-price-amount-required')
  }

  const value = pricing.displayUnit === 'manwon'
    ? (cell.amountKrw / 10_000).toFixed(1)
    : cell.amountKrw.toLocaleString('ko-KR')

  return cell.mode === 'from'
    ? `${value}~`
    : value
}
