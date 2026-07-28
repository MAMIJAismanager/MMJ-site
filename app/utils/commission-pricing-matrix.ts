import type {
  CommissionMatrixPricing,
  CommissionPricingCell,
  CommissionPricingColumn,
  CommissionPricingFullSpanCell,
  CommissionPricingRow,
} from '~~/shared/types/commission-guide'

export interface CommissionPricingMatrixView {
  readonly columns: readonly CommissionPricingColumn[]
  readonly rows: readonly CommissionPricingRow[]
  readonly cellByCoordinate: ReadonlyMap<string, CommissionPricingCell>
  readonly fullSpanCellByRowId: ReadonlyMap<string, CommissionPricingFullSpanCell>
  readonly expectedCellCount: number
  readonly standardCellCount: number
  readonly fullSpanCellCount: number
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
  fullSpanCells: readonly CommissionPricingFullSpanCell[],
): void {
  const enabledRows = rows.filter(row => row.enabled)
  const enabledColumns = columns.filter(column => column.enabled)
  const enabledRowIds = new Set(enabledRows.map(row => row.id))
  const enabledColumnIds = new Set(enabledColumns.map(column => column.id))
  const coordinates = new Set<string>()
  const standardCellCountByRow = new Map<string, number>()

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
    standardCellCountByRow.set(
      cell.rowId,
      (standardCellCountByRow.get(cell.rowId) ?? 0) + 1,
    )
  }

  const fullSpanRowIds = new Set<string>()
  for (const cell of fullSpanCells) {
    if (!enabledRowIds.has(cell.rowId)) continue
    if (fullSpanRowIds.has(cell.rowId)) {
      throw new TypeError(
        `duplicate-commission-pricing-full-span-row:${cell.rowId}`,
      )
    }
    fullSpanRowIds.add(cell.rowId)
  }

  for (const row of enabledRows) {
    const hasFullSpan = fullSpanRowIds.has(row.id)
    const standardCount = standardCellCountByRow.get(row.id) ?? 0

    if (hasFullSpan) {
      if (standardCount > 0) {
        throw new TypeError(
          `commission-pricing-row-mixed-cell-modes:${row.id}`,
        )
      }
      continue
    }

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
    }

    if (standardCount !== enabledColumns.length) {
      throw new TypeError(
        `commission-pricing-row-cell-count:${row.id}:${standardCount}:${enabledColumns.length}`,
      )
    }
  }
}

export function createCommissionPricingMatrixView(
  pricing: CommissionMatrixPricing,
): CommissionPricingMatrixView {
  assertCommissionPricingMatrixParity(
    pricing.rows,
    pricing.columns,
    pricing.cells,
    pricing.fullSpanCells,
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
  const fullSpanCellByRowId = new Map<
    string,
    CommissionPricingFullSpanCell
  >()

  for (const cell of pricing.cells) {
    const rowEnabled = rows.some(row => row.id === cell.rowId)
    const columnEnabled = columns.some(column => column.id === cell.columnId)
    if (!rowEnabled || !columnEnabled) continue

    cellByCoordinate.set(
      createCommissionPricingCoordinate(cell.rowId, cell.columnId),
      cell,
    )
  }

  for (const cell of pricing.fullSpanCells) {
    if (!rows.some(row => row.id === cell.rowId)) continue
    fullSpanCellByRowId.set(cell.rowId, cell)
  }

  return Object.freeze({
    columns,
    rows,
    cellByCoordinate,
    fullSpanCellByRowId,
    expectedCellCount: cellByCoordinate.size + fullSpanCellByRowId.size,
    standardCellCount: cellByCoordinate.size,
    fullSpanCellCount: fullSpanCellByRowId.size,
  })
}
