import type {
  CSSProperties,
} from 'vue'
import type {
  CommissionServiceId,
} from '~~/shared/types/commission-guide'
import type {
  CommissionDetailWidthProfile,
} from '~/types/commission-presentation'

export type CommissionViewportMode =
  | 'flow'
  | 'desktop'

export type CommissionLayoutRole =
  | 'flow-card'
  | 'overview-card'
  | 'detail-stage'
  | 'compact-rail'

export interface CommissionLayoutSlot {
  readonly serviceId: CommissionServiceId
  readonly role: CommissionLayoutRole
  readonly columnStart: number
  readonly columnSpan: number
  readonly rowStart: number
  readonly rowSpan: number
}

export interface CommissionLayoutPlan {
  readonly mode:
    | 'mobile-flow'
    | 'desktop-overview'
    | 'desktop-detail'
    | 'desktop-document-flow'
  readonly orderedServiceIds: readonly CommissionServiceId[]
  readonly slots: ReadonlyMap<CommissionServiceId, CommissionLayoutSlot>
}

interface CommissionDetailWidthDefinition {
  readonly detailColumnStart: number
  readonly detailColumnSpan: number
  readonly railColumnStart: number
  readonly railColumnSpan: number
}

const DETAIL_WIDTHS = Object.freeze({
  balanced: Object.freeze({
    detailColumnStart: 1,
    detailColumnSpan: 8,
    railColumnStart: 9,
    railColumnSpan: 4,
  }),
  wide: Object.freeze({
    detailColumnStart: 1,
    detailColumnSpan: 9,
    railColumnStart: 10,
    railColumnSpan: 3,
  }),
} satisfies Record<Exclude<CommissionDetailWidthProfile, 'full'>, CommissionDetailWidthDefinition>)

function assertUniqueServiceIds(
  serviceIds: readonly CommissionServiceId[],
): void {
  if (new Set(serviceIds).size !== serviceIds.length) {
    throw new TypeError('duplicate-commission-layout-service-id')
  }
}

function createFlowPlan(
  serviceIds: readonly CommissionServiceId[],
): CommissionLayoutPlan {
  const slots = new Map<CommissionServiceId, CommissionLayoutSlot>()

  serviceIds.forEach((serviceId, index) => {
    slots.set(serviceId, Object.freeze({
      serviceId,
      role: 'flow-card',
      columnStart: 1,
      columnSpan: 1,
      rowStart: index + 1,
      rowSpan: 1,
    }))
  })

  return Object.freeze({
    mode: 'mobile-flow',
    orderedServiceIds: Object.freeze([...serviceIds]),
    slots,
  })
}

function createDesktopOverviewPlan(
  serviceIds: readonly CommissionServiceId[],
): CommissionLayoutPlan {
  const slots = new Map<CommissionServiceId, CommissionLayoutSlot>()

  serviceIds.forEach((serviceId, index) => {
    const columnIndex = index % 3
    const rowIndex = Math.floor(index / 3)

    slots.set(serviceId, Object.freeze({
      serviceId,
      role: 'overview-card',
      columnStart: (columnIndex * 4) + 1,
      columnSpan: 4,
      rowStart: rowIndex + 1,
      rowSpan: 1,
    }))
  })

  return Object.freeze({
    mode: 'desktop-overview',
    orderedServiceIds: Object.freeze([...serviceIds]),
    slots,
  })
}

function createDesktopDocumentFlowPlan(
  serviceIds: readonly CommissionServiceId[],
  activeServiceId: CommissionServiceId,
): CommissionLayoutPlan {
  const inactiveServiceIds = serviceIds.filter(
    serviceId => serviceId !== activeServiceId,
  )
  const slots = new Map<CommissionServiceId, CommissionLayoutSlot>()

  slots.set(activeServiceId, Object.freeze({
    serviceId: activeServiceId,
    role: 'detail-stage',
    columnStart: 1,
    columnSpan: 12,
    rowStart: 1,
    rowSpan: 1,
  }))

  inactiveServiceIds.forEach((serviceId, index) => {
    const columnIndex = index % 3
    const rowIndex = Math.floor(index / 3)
    slots.set(serviceId, Object.freeze({
      serviceId,
      role: 'compact-rail',
      columnStart: (columnIndex * 4) + 1,
      columnSpan: 4,
      rowStart: rowIndex + 2,
      rowSpan: 1,
    }))
  })

  return Object.freeze({
    mode: 'desktop-document-flow',
    orderedServiceIds: Object.freeze([activeServiceId, ...inactiveServiceIds]),
    slots,
  })
}

function createDesktopDetailPlan(
  serviceIds: readonly CommissionServiceId[],
  activeServiceId: CommissionServiceId,
  widthProfile: Exclude<CommissionDetailWidthProfile, 'full'>,
): CommissionLayoutPlan {
  if (!serviceIds.includes(activeServiceId)) {
    return createDesktopOverviewPlan(serviceIds)
  }

  const inactiveServiceIds = serviceIds.filter(
    serviceId => serviceId !== activeServiceId,
  )
  const orderedServiceIds = [
    activeServiceId,
    ...inactiveServiceIds,
  ]
  const slots = new Map<CommissionServiceId, CommissionLayoutSlot>()
  const width = DETAIL_WIDTHS[widthProfile]

  slots.set(activeServiceId, Object.freeze({
    serviceId: activeServiceId,
    role: 'detail-stage',
    columnStart: width.detailColumnStart,
    columnSpan: width.detailColumnSpan,
    rowStart: 1,
    rowSpan: 5,
  }))

  inactiveServiceIds.forEach((serviceId, index) => {
    slots.set(serviceId, Object.freeze({
      serviceId,
      role: 'compact-rail',
      columnStart: width.railColumnStart,
      columnSpan: width.railColumnSpan,
      rowStart: index + 1,
      rowSpan: 1,
    }))
  })

  return Object.freeze({
    mode: 'desktop-detail',
    orderedServiceIds: Object.freeze(orderedServiceIds),
    slots,
  })
}

export function createCommissionLayoutPlan(
  serviceIds: readonly CommissionServiceId[],
  activeServiceId: CommissionServiceId | null,
  viewportMode: CommissionViewportMode,
  widthProfile: CommissionDetailWidthProfile = 'balanced',
): CommissionLayoutPlan {
  assertUniqueServiceIds(serviceIds)

  if (viewportMode === 'flow') {
    return createFlowPlan(serviceIds)
  }

  if (activeServiceId === null) {
    return createDesktopOverviewPlan(serviceIds)
  }

  if (widthProfile === 'full') {
    return createDesktopDocumentFlowPlan(serviceIds, activeServiceId)
  }

  return createDesktopDetailPlan(
    serviceIds,
    activeServiceId,
    widthProfile,
  )
}

export function createCommissionSlotStyle(
  slot: CommissionLayoutSlot | undefined,
  viewportMode: CommissionViewportMode,
): CSSProperties {
  if (slot === undefined || viewportMode === 'flow') return {}

  return Object.freeze({
    gridColumn: `${slot.columnStart} / span ${slot.columnSpan}`,
    gridRow: `${slot.rowStart} / span ${slot.rowSpan}`,
  })
}
