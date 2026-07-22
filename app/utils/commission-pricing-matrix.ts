import type {
  CommissionMatrixPricing,
  CommissionPricingCell,
  CommissionPricingColumn,
  CommissionPricingRow,
} from '~~/shared/types/commission-guide'

export interface CommissionPricingMatrixView {
  readonly columns: readonly CommissionPricingColumn[]
  readonly rows: readonly CommissionPricingRow[]
  readonly cellByCoordinate: ReadonlyMap<string, CommissionPricingCell>
}

export function createCommissionPricingCoordinate(
  rowId: string,
  columnId: string,
): string {
  return `${rowId}:${columnId}`
}

export function createCommissionPricingMatrixView(
  pricing: CommissionMatrixPricing,
): CommissionPricingMatrixView {
  const columns = Object.freeze(
    pricing.columns
      .filter(column => column.enabled)
      .sort((left, right) => left.order - right.order),
  )
  const rows = Object.freeze(
    pricing.rows
      .filter(row => row.enabled)
      .sort((left, right) => left.order - right.order),
  )
  const cellByCoordinate = new Map<string, CommissionPricingCell>()

  for (const cell of pricing.cells) {
    cellByCoordinate.set(
      createCommissionPricingCoordinate(cell.rowId, cell.columnId),
      cell,
    )
  }

  return Object.freeze({
    columns,
    rows,
    cellByCoordinate,
  })
}
