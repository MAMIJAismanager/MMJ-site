import type {
  CommissionRateRangeItem,
  CommissionRateRangePricing,
} from '~~/shared/types/commission-guide'

function formatDisplayAmount(
  amountKrw: number,
  displayUnit: CommissionRateRangePricing['displayUnit'],
): string {
  return displayUnit === 'manwon'
    ? (amountKrw / 10_000).toFixed(1)
    : amountKrw.toLocaleString('ko-KR')
}

function formatAccessibleAmount(
  amountKrw: number,
  displayUnit: CommissionRateRangePricing['displayUnit'],
): string {
  if (displayUnit === 'won') {
    return `${amountKrw.toLocaleString('ko-KR')}원`
  }

  const amountInManwon = amountKrw / 10_000
  const value = Number.isInteger(amountInManwon)
    ? amountInManwon.toFixed(0)
    : amountInManwon.toFixed(1)
  return `${value}만원`
}

export function formatCommissionRateRange(
  item: CommissionRateRangeItem,
  pricing: Pick<CommissionRateRangePricing, 'displayUnit'>,
): string {
  const minimum = formatDisplayAmount(
    item.minimumAmountKrw,
    pricing.displayUnit,
  )
  const maximum = formatDisplayAmount(
    item.maximumAmountKrw,
    pricing.displayUnit,
  )
  return `${minimum}~${maximum}`
}

export function formatCommissionRateRangeAccessible(
  item: CommissionRateRangeItem,
  pricing: Pick<CommissionRateRangePricing, 'displayUnit'>,
): string {
  const parts = [
    `${formatAccessibleAmount(item.minimumAmountKrw, pricing.displayUnit)}부터 ${formatAccessibleAmount(item.maximumAmountKrw, pricing.displayUnit)}까지`,
    item.basisLabel,
    item.expenseLabel,
    item.note,
  ].filter((value): value is string => Boolean(value))

  return parts.join(', ')
}
