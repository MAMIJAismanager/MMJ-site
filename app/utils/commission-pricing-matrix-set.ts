import {
  assertCommissionPricingMatrixParity,
} from '~/utils/commission-pricing-matrix'

import type {
  CommissionMatrixPricing,
  CommissionMatrixPricingGroup,
  CommissionMatrixSetPricing,
  CommissionPricingGroupId,
} from '~~/shared/types/commission-guide'

export interface CommissionPricingMatrixSetView {
  readonly groups: readonly CommissionMatrixPricingGroup[]
  readonly firstGroupId: CommissionPricingGroupId
}

export function createCommissionPricingMatrixSetView(
  pricing: CommissionMatrixSetPricing,
): CommissionPricingMatrixSetView {
  const ids = new Set<CommissionPricingGroupId>()
  const orders = new Set<number>()
  const groups = pricing.groups
    .filter(group => group.enabled)
    .sort((left, right) => left.order - right.order)

  if (groups.length === 0) {
    throw new TypeError('commission-pricing-matrix-set-requires-group')
  }

  for (const group of groups) {
    if (ids.has(group.id)) {
      throw new TypeError(`duplicate-commission-pricing-group:${group.id}`)
    }
    if (orders.has(group.order)) {
      throw new TypeError(`duplicate-commission-pricing-group-order:${group.order}`)
    }

    assertCommissionPricingMatrixParity(
      group.rows,
      group.columns,
      group.cells,
    )

    ids.add(group.id)
    orders.add(group.order)
  }

  const firstGroup = groups[0]
  if (firstGroup === undefined) {
    throw new TypeError('commission-pricing-matrix-set-first-group-missing')
  }

  return Object.freeze({
    groups: Object.freeze(groups),
    firstGroupId: firstGroup.id,
  })
}

export function projectCommissionPricingGroup(
  pricing: CommissionMatrixSetPricing,
  group: CommissionMatrixPricingGroup,
): CommissionMatrixPricing {
  return Object.freeze({
    kind: 'matrix',
    title: group.label,
    description: null,
    compactDescription: null,
    currency: pricing.currency,
    displayUnit: pricing.displayUnit,
    unitLabel: pricing.unitLabel,
    rowAxisLabel: group.rowAxisLabel,
    columnAxisLabel: group.columnAxisLabel,
    columns: group.columns,
    rows: group.rows,
    cells: group.cells,
    footnote: pricing.footnote,
    mock: pricing.mock,
  })
}
