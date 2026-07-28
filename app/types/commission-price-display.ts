export interface CommissionNumericPriceDisplay {
  readonly kind: 'numeric'
  readonly core: string
  readonly suffix: string | null
  readonly accessibleLabel: string
}

export interface CommissionTextPriceDisplay {
  readonly kind: 'text'
  readonly text: string
  readonly accessibleLabel: string
}

export type CommissionPriceDisplay =
  | CommissionNumericPriceDisplay
  | CommissionTextPriceDisplay

const PLAIN_NUMERIC_PRICE_OVERRIDE = /^\d{1,3}(?:,\d{3})*(?:\.\d+)?$|^\d+(?:\.\d+)?$/

export function createCommissionOverridePriceDisplay(
  value: string,
  accessibleLabel: string,
): CommissionPriceDisplay {
  const normalized = value.trim()
  if (PLAIN_NUMERIC_PRICE_OVERRIDE.test(normalized)) {
    return Object.freeze({
      kind: 'numeric',
      core: normalized,
      suffix: null,
      accessibleLabel,
    })
  }

  return Object.freeze({
    kind: 'text',
    text: value,
    accessibleLabel,
  })
}

export function serializeCommissionPriceDisplay(
  display: CommissionPriceDisplay,
): string {
  return display.kind === 'numeric'
    ? `${display.core}${display.suffix ?? ''}`
    : display.text
}
