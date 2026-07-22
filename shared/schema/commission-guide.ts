import {
  COMMISSION_SERVICE_IDS,
  COMMISSION_TERM_ICON_KEYS,
} from '../types/commission-guide'

import type {
  CommissionGuideContent,
  CommissionMatrixPricing,
  CommissionPricing,
  CommissionPricingCell,
  CommissionPricingColumn,
  CommissionPricingRow,
  CommissionQuotePricing,
  CommissionService,
  CommissionServiceId,
  CommissionTerm,
} from '../types/commission-guide'

const SERVICE_ID_SET: ReadonlySet<string> = new Set(
  COMMISSION_SERVICE_IDS,
)
const TERM_ICON_KEY_SET: ReadonlySet<string> = new Set(
  COMMISSION_TERM_ICON_KEYS,
)

function fail(message: string): never {
  throw new TypeError(`invalid-commission-guide: ${message}`)
}

function assertNonEmptyText(
  value: unknown,
  path: string,
): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`${path} must be a non-empty string`)
  }
}

function assertNullableText(
  value: unknown,
  path: string,
): asserts value is string | null {
  if (value !== null) assertNonEmptyText(value, path)
}

function assertBoolean(
  value: unknown,
  path: string,
): asserts value is boolean {
  if (typeof value !== 'boolean') fail(`${path} must be boolean`)
}

function assertOrder(
  value: unknown,
  path: string,
): asserts value is number {
  if (
    typeof value !== 'number'
    || !Number.isSafeInteger(value)
    || value < 0
  ) {
    fail(`${path} must be a non-negative safe integer`)
  }
}

function assertOptionalAmount(
  value: unknown,
  path: string,
): asserts value is number | null {
  if (
    value !== null
    && (
      typeof value !== 'number'
      || !Number.isSafeInteger(value)
      || value < 0
    )
  ) {
    fail(`${path} must be a non-negative safe integer or null`)
  }
}

function assertStringList(
  value: unknown,
  path: string,
): asserts value is readonly string[] {
  if (!Array.isArray(value) || value.length === 0) {
    fail(`${path} must contain at least one item`)
  }

  const seen = new Set<string>()
  value.forEach((item, index) => {
    assertNonEmptyText(item, `${path}[${index}]`)
    if (seen.has(item)) fail(`${path} contains duplicate item: ${item}`)
    seen.add(item)
  })
}

function validateQuotePricing(
  pricing: CommissionQuotePricing,
  path: string,
): void {
  assertNonEmptyText(pricing.displayLabel, `${path}.displayLabel`)
  assertNullableText(pricing.note, `${path}.note`)
  assertBoolean(pricing.mock, `${path}.mock`)
}

function validatePricingColumn(
  column: CommissionPricingColumn,
  path: string,
): void {
  assertNonEmptyText(column.id, `${path}.id`)
  assertOrder(column.order, `${path}.order`)
  assertBoolean(column.enabled, `${path}.enabled`)
  assertNonEmptyText(column.label, `${path}.label`)
  assertNullableText(column.detailLabel, `${path}.detailLabel`)
  assertNonEmptyText(column.shortLabel, `${path}.shortLabel`)
}

function validatePricingRow(
  row: CommissionPricingRow,
  path: string,
): void {
  assertNonEmptyText(row.id, `${path}.id`)
  assertOrder(row.order, `${path}.order`)
  assertBoolean(row.enabled, `${path}.enabled`)
  assertNonEmptyText(row.label, `${path}.label`)
  assertNullableText(row.detailLabel, `${path}.detailLabel`)
}

function validatePricingCell(
  cell: CommissionPricingCell,
  path: string,
): void {
  assertNonEmptyText(cell.rowId, `${path}.rowId`)
  assertNonEmptyText(cell.columnId, `${path}.columnId`)

  if (
    cell.mode !== 'from'
    && cell.mode !== 'fixed'
    && cell.mode !== 'quote'
  ) {
    fail(`${path}.mode is unsupported`)
  }

  assertOptionalAmount(cell.amountKrw, `${path}.amountKrw`)
  assertNullableText(cell.displayOverride, `${path}.displayOverride`)
  assertNullableText(cell.note, `${path}.note`)

  if (cell.mode === 'quote') {
    if (cell.amountKrw !== null) {
      fail(`${path} quote mode cannot carry amountKrw`)
    }
    if (cell.displayOverride === null) {
      fail(`${path} quote mode requires displayOverride`)
    }
    return
  }

  if (cell.amountKrw === null) {
    fail(`${path} ${cell.mode} mode requires amountKrw`)
  }
}

function validateMatrixPricing(
  pricing: CommissionMatrixPricing,
  path: string,
): void {
  assertNonEmptyText(pricing.title, `${path}.title`)
  assertNullableText(pricing.description, `${path}.description`)
  assertNullableText(
    pricing.compactDescription,
    `${path}.compactDescription`,
  )
  if (pricing.currency !== 'KRW') fail(`${path}.currency must be KRW`)
  if (pricing.displayUnit !== 'manwon' && pricing.displayUnit !== 'won') {
    fail(`${path}.displayUnit is unsupported`)
  }
  assertNonEmptyText(pricing.unitLabel, `${path}.unitLabel`)
  assertNonEmptyText(pricing.rowAxisLabel, `${path}.rowAxisLabel`)
  assertNonEmptyText(pricing.columnAxisLabel, `${path}.columnAxisLabel`)
  assertNullableText(pricing.footnote, `${path}.footnote`)
  assertBoolean(pricing.mock, `${path}.mock`)

  if (!Array.isArray(pricing.columns) || pricing.columns.length === 0) {
    fail(`${path}.columns must contain at least one item`)
  }
  if (!Array.isArray(pricing.rows) || pricing.rows.length === 0) {
    fail(`${path}.rows must contain at least one item`)
  }
  if (!Array.isArray(pricing.cells) || pricing.cells.length === 0) {
    fail(`${path}.cells must contain at least one item`)
  }

  const columnIds = new Set<string>()
  const columnOrders = new Set<number>()
  pricing.columns.forEach((column, index) => {
    validatePricingColumn(column, `${path}.columns[${index}]`)
    if (columnIds.has(column.id)) {
      fail(`${path} duplicate column id: ${column.id}`)
    }
    if (columnOrders.has(column.order)) {
      fail(`${path} duplicate column order: ${column.order}`)
    }
    columnIds.add(column.id)
    columnOrders.add(column.order)
  })

  const rowIds = new Set<string>()
  const rowOrders = new Set<number>()
  pricing.rows.forEach((row, index) => {
    validatePricingRow(row, `${path}.rows[${index}]`)
    if (rowIds.has(row.id)) fail(`${path} duplicate row id: ${row.id}`)
    if (rowOrders.has(row.order)) {
      fail(`${path} duplicate row order: ${row.order}`)
    }
    rowIds.add(row.id)
    rowOrders.add(row.order)
  })

  const cellCoordinates = new Set<string>()
  pricing.cells.forEach((cell, index) => {
    validatePricingCell(cell, `${path}.cells[${index}]`)
    if (!rowIds.has(cell.rowId)) {
      fail(`${path} cell references unknown row: ${cell.rowId}`)
    }
    if (!columnIds.has(cell.columnId)) {
      fail(`${path} cell references unknown column: ${cell.columnId}`)
    }
    const coordinate = `${cell.rowId}:${cell.columnId}`
    if (cellCoordinates.has(coordinate)) {
      fail(`${path} duplicate cell coordinate: ${coordinate}`)
    }
    cellCoordinates.add(coordinate)
  })

  const enabledRows = pricing.rows.filter(row => row.enabled)
  const enabledColumns = pricing.columns.filter(column => column.enabled)
  if (enabledRows.length === 0) fail(`${path} requires an enabled row`)
  if (enabledColumns.length === 0) fail(`${path} requires an enabled column`)

  for (const row of enabledRows) {
    for (const column of enabledColumns) {
      const coordinate = `${row.id}:${column.id}`
      if (!cellCoordinates.has(coordinate)) {
        fail(`${path} missing enabled cell: ${coordinate}`)
      }
    }
  }
}

function validatePricing(
  pricing: CommissionPricing,
  path: string,
): void {
  if (pricing.kind === 'quote') {
    validateQuotePricing(pricing, path)
    return
  }
  if (pricing.kind === 'matrix') {
    validateMatrixPricing(pricing, path)
    return
  }
  fail(`${path}.kind is unsupported`)
}

function validateService(
  service: CommissionService,
  index: number,
): void {
  const path = `services[${index}]`
  if (!SERVICE_ID_SET.has(service.id)) fail(`${path}.id is unsupported`)
  assertOrder(service.order, `${path}.order`)
  assertBoolean(service.enabled, `${path}.enabled`)
  assertNonEmptyText(service.label, `${path}.label`)
  assertNonEmptyText(service.summary, `${path}.summary`)
  assertNonEmptyText(service.description, `${path}.description`)
  validatePricing(service.pricing, `${path}.pricing`)
  assertStringList(service.includedItems, `${path}.includedItems`)
  assertNonEmptyText(service.turnaroundLabel, `${path}.turnaroundLabel`)
  assertNonEmptyText(service.revisionLabel, `${path}.revisionLabel`)
  assertNullableText(
    service.additionalCostNote,
    `${path}.additionalCostNote`,
  )
  assertNonEmptyText(service.inquiryLabel, `${path}.inquiryLabel`)
}

function validateTerm(
  term: CommissionTerm,
  index: number,
): void {
  const path = `terms[${index}]`
  assertNonEmptyText(term.id, `${path}.id`)
  assertOrder(term.order, `${path}.order`)
  assertBoolean(term.enabled, `${path}.enabled`)
  if (term.scope !== 'global' && term.scope !== 'service') {
    fail(`${path}.scope is unsupported`)
  }
  assertNonEmptyText(term.label, `${path}.label`)
  assertNullableText(term.description, `${path}.description`)

  if (term.scope === 'global') {
    if (term.serviceId !== null) {
      fail(`${path} global term cannot carry serviceId`)
    }
  } else {
    if (term.serviceId === null || !SERVICE_ID_SET.has(term.serviceId)) {
      fail(`${path} service term requires a supported serviceId`)
    }
  }

  if (
    term.iconKey !== null
    && !TERM_ICON_KEY_SET.has(term.iconKey)
  ) {
    fail(`${path}.iconKey is unsupported`)
  }
}

function deepFreeze<T>(value: T): T {
  if (
    value === null
    || typeof value !== 'object'
    || Object.isFrozen(value)
  ) {
    return value
  }

  for (const child of Object.values(
    value as Record<string, unknown>,
  )) {
    deepFreeze(child)
  }

  return Object.freeze(value)
}

export function createCommissionGuideSnapshot(
  input: CommissionGuideContent,
): CommissionGuideContent {
  if (input.schemaVersion !== 3) {
    fail('schemaVersion must equal 3')
  }

  assertNonEmptyText(input.eyebrow, 'eyebrow')
  assertNonEmptyText(input.title, 'title')
  assertNonEmptyText(input.lead, 'lead')
  assertNonEmptyText(input.seoTitle, 'seoTitle')
  assertNonEmptyText(input.seoDescription, 'seoDescription')
  assertNonEmptyText(input.sectionHeading, 'sectionHeading')
  assertNonEmptyText(input.commonNoticeHeading, 'commonNoticeHeading')
  assertNonEmptyText(input.worksLinkLabel, 'worksLinkLabel')
  assertNonEmptyText(input.contactLinkLabel, 'contactLinkLabel')

  if (!Array.isArray(input.services)) fail('services must be an array')
  if (!Array.isArray(input.terms)) fail('terms must be an array')

  const ids = new Set<CommissionServiceId>()
  const orders = new Set<number>()
  input.services.forEach((service, index) => {
    validateService(service, index)
    if (ids.has(service.id)) fail(`duplicate service id: ${service.id}`)
    if (orders.has(service.order)) {
      fail(`duplicate service order: ${service.order}`)
    }
    ids.add(service.id)
    orders.add(service.order)
  })

  for (const requiredId of COMMISSION_SERVICE_IDS) {
    if (!ids.has(requiredId)) fail(`missing service id: ${requiredId}`)
  }
  if (!input.services.some(service => service.enabled)) {
    fail('at least one service must be enabled')
  }

  const termIds = new Set<string>()
  const termOrders = new Set<number>()
  input.terms.forEach((term, index) => {
    validateTerm(term, index)
    if (termIds.has(term.id)) fail(`duplicate term id: ${term.id}`)
    if (termOrders.has(term.order)) {
      fail(`duplicate term order: ${term.order}`)
    }
    termIds.add(term.id)
    termOrders.add(term.order)
  })
  if (!input.terms.some(term => term.enabled)) {
    fail('at least one term must be enabled')
  }

  return deepFreeze({
    ...input,
    services: [...input.services]
      .sort((left, right) => left.order - right.order),
    terms: [...input.terms]
      .sort((left, right) => left.order - right.order),
  })
}
