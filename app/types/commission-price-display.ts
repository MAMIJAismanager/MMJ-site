export type CommissionOpticalPriceSuffix = '~'

export interface CommissionNumericPriceDisplay {
  readonly kind: 'numeric'
  readonly core: string
  readonly opticalSuffix: CommissionOpticalPriceSuffix | null
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

export function createCommissionNumericPriceDisplay(
  core: string,
  opticalSuffix: CommissionOpticalPriceSuffix | null,
  accessibleLabel: string,
): CommissionNumericPriceDisplay {
  return Object.freeze({
    kind: 'numeric',
    core,
    opticalSuffix,
    accessibleLabel,
  })
}

export function createCommissionTextPriceDisplay(
  text: string,
  accessibleLabel: string,
): CommissionTextPriceDisplay {
  return Object.freeze({
    kind: 'text',
    text,
    accessibleLabel,
  })
}

export function createCommissionOverridePriceDisplay(
  value: string,
  accessibleLabel: string,
): CommissionPriceDisplay {
  const normalized = value.trim()
  if (PLAIN_NUMERIC_PRICE_OVERRIDE.test(normalized)) {
    return createCommissionNumericPriceDisplay(
      normalized,
      null,
      accessibleLabel,
    )
  }

  return createCommissionTextPriceDisplay(
    value,
    accessibleLabel,
  )
}

export function serializeCommissionPriceDisplay(
  display: CommissionPriceDisplay,
): string {
  return display.kind === 'numeric'
    ? `${display.core}${display.opticalSuffix ?? ''}`
    : display.text
}
