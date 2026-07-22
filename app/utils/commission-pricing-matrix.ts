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
  readonly expectedCellCount: number
}

export function createCommissionPricingCoordinate(
  rowId: string,
  columnId: string,
): string {
  return `${rowId}:${columnId}`
}

export function assertCommissionPricingMatrixParity(
  rows: readonly CommissionPricingRow[],
  columns: readonly CommissionPricingColumn[],
  cells: readonly CommissionPricingCell[],
): void {
  const enabledRows = rows.filter(row => row.enabled)
  const enabledColumns = columns.filter(column => column.enabled)
  const enabledRowIds = new Set(enabledRows.map(row => row.id))
  const enabledColumnIds = new Set(enabledColumns.map(column => column.id))
  const coordinates = new Set<string>()

  for (const cell of cells) {
    if (
      !enabledRowIds.has(cell.rowId)
      || !enabledColumnIds.has(cell.columnId)
    ) {
      continue
    }

    const coordinate = createCommissionPricingCoordinate(
      cell.rowId,
      cell.columnId,
    )
    if (coordinates.has(coordinate)) {
      throw new TypeError(
        `duplicate-commission-pricing-cell:${coordinate}`,
      )
    }
    coordinates.add(coordinate)
  }

  for (const row of enabledRows) {
    let rowCellCount = 0
    for (const column of enabledColumns) {
      const coordinate = createCommissionPricingCoordinate(
        row.id,
        column.id,
      )
      if (!coordinates.has(coordinate)) {
        throw new TypeError(
          `missing-commission-pricing-cell:${coordinate}`,
        )
      }
      rowCellCount += 1
    }

    if (rowCellCount !== enabledColumns.length) {
      throw new TypeError(
        `commission-pricing-row-cell-count:${row.id}:${rowCellCount}:${enabledColumns.length}`,
      )
    }
  }

  const expectedCellCount = enabledRows.length * enabledColumns.length
  if (coordinates.size !== expectedCellCount) {
    throw new TypeError(
      `commission-pricing-matrix-cell-count:${coordinates.size}:${expectedCellCount}`,
    )
  }
}

export function createCommissionPricingMatrixView(
  pricing: CommissionMatrixPricing,
): CommissionPricingMatrixView {
  assertCommissionPricingMatrixParity(
    pricing.rows,
    pricing.columns,
    pricing.cells,
  )

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
    const rowEnabled = rows.some(row => row.id === cell.rowId)
    const columnEnabled = columns.some(column => column.id === cell.columnId)
    if (!rowEnabled || !columnEnabled) continue

    cellByCoordinate.set(
      createCommissionPricingCoordinate(cell.rowId, cell.columnId),
      cell,
    )
  }

  return Object.freeze({
    columns,
    rows,
    cellByCoordinate,
    expectedCellCount: rows.length * columns.length,
  })
}
