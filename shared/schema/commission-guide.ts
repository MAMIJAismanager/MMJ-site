import {
  COMMISSION_SERVICE_IDS,
} from '../types/commission-guide'

import type {
  CommissionGuideContent,
  CommissionPrice,
  CommissionService,
  CommissionServiceId,
} from '../types/commission-guide'

const SERVICE_ID_SET: ReadonlySet<string> = new Set(
  COMMISSION_SERVICE_IDS,
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

  value.forEach((item, index) => {
    assertNonEmptyText(item, `${path}[${index}]`)
  })
}

function validatePrice(
  price: CommissionPrice,
  path: string,
): void {
  if (
    price.mode !== 'from'
    && price.mode !== 'range'
    && price.mode !== 'quote'
  ) {
    fail(`${path}.mode is unsupported`)
  }

  if (price.currency !== 'KRW') {
    fail(`${path}.currency must be KRW`)
  }

  assertOptionalAmount(price.minimumKrw, `${path}.minimumKrw`)
  assertOptionalAmount(price.maximumKrw, `${path}.maximumKrw`)
  assertNullableText(price.unitLabel, `${path}.unitLabel`)
  assertNonEmptyText(price.displayLabel, `${path}.displayLabel`)
  assertNullableText(price.note, `${path}.note`)

  if (typeof price.mock !== 'boolean') {
    fail(`${path}.mock must be boolean`)
  }

  if (price.mode === 'quote') {
    if (price.minimumKrw !== null || price.maximumKrw !== null) {
      fail(`${path} quote mode cannot carry numeric amounts`)
    }
    return
  }

  if (price.minimumKrw === null) {
    fail(`${path} ${price.mode} mode requires minimumKrw`)
  }

  if (price.mode === 'from' && price.maximumKrw !== null) {
    fail(`${path} from mode cannot carry maximumKrw`)
  }

  if (
    price.mode === 'range'
    && (
      price.maximumKrw === null
      || price.minimumKrw > price.maximumKrw
    )
  ) {
    fail(`${path} range mode requires an ordered maximumKrw`)
  }
}

function validateService(
  service: CommissionService,
  index: number,
): void {
  const path = `services[${index}]`

  if (!SERVICE_ID_SET.has(service.id)) {
    fail(`${path}.id is unsupported`)
  }

  if (!Number.isSafeInteger(service.order) || service.order < 0) {
    fail(`${path}.order must be a non-negative safe integer`)
  }

  if (typeof service.enabled !== 'boolean') {
    fail(`${path}.enabled must be boolean`)
  }

  assertNonEmptyText(service.label, `${path}.label`)
  assertNonEmptyText(service.summary, `${path}.summary`)
  assertNonEmptyText(service.description, `${path}.description`)
  validatePrice(service.price, `${path}.price`)
  assertStringList(service.includedItems, `${path}.includedItems`)
  assertNonEmptyText(service.turnaroundLabel, `${path}.turnaroundLabel`)
  assertNonEmptyText(service.revisionLabel, `${path}.revisionLabel`)
  assertNullableText(
    service.additionalCostNote,
    `${path}.additionalCostNote`,
  )
  assertNonEmptyText(service.inquiryLabel, `${path}.inquiryLabel`)
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
  if (input.schemaVersion !== 1) {
    fail('schemaVersion must equal 1')
  }

  assertNonEmptyText(input.eyebrow, 'eyebrow')
  assertNonEmptyText(input.title, 'title')
  assertNonEmptyText(input.lead, 'lead')
  assertNonEmptyText(input.seoTitle, 'seoTitle')
  assertNonEmptyText(input.seoDescription, 'seoDescription')
  assertNonEmptyText(input.sectionHeading, 'sectionHeading')
  assertNonEmptyText(
    input.commonNoticeHeading,
    'commonNoticeHeading',
  )
  assertStringList(input.commonNotices, 'commonNotices')
  assertNonEmptyText(input.worksLinkLabel, 'worksLinkLabel')
  assertNonEmptyText(input.contactLinkLabel, 'contactLinkLabel')

  if (!Array.isArray(input.services)) {
    fail('services must be an array')
  }

  const ids = new Set<CommissionServiceId>()
  const orders = new Set<number>()

  input.services.forEach((service, index) => {
    validateService(service, index)

    if (ids.has(service.id)) {
      fail(`duplicate service id: ${service.id}`)
    }
    if (orders.has(service.order)) {
      fail(`duplicate service order: ${service.order}`)
    }

    ids.add(service.id)
    orders.add(service.order)
  })

  for (const requiredId of COMMISSION_SERVICE_IDS) {
    if (!ids.has(requiredId)) {
      fail(`missing service id: ${requiredId}`)
    }
  }

  if (!input.services.some(service => service.enabled)) {
    fail('at least one service must be enabled')
  }

  const services = [...input.services]
    .sort((left, right) => left.order - right.order)

  return deepFreeze({
    ...input,
    services,
    commonNotices: [...input.commonNotices],
  })
}
