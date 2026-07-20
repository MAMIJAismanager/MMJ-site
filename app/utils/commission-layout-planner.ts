import type {
  CSSProperties,
} from 'vue'
import type {
  CommissionServiceId,
} from '~~/shared/types/commission-guide'

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
  readonly orderedServiceIds: readonly CommissionServiceId[]
  readonly slots: ReadonlyMap<CommissionServiceId, CommissionLayoutSlot>
}

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

function createDesktopDetailPlan(
  serviceIds: readonly CommissionServiceId[],
  activeServiceId: CommissionServiceId,
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

  slots.set(activeServiceId, Object.freeze({
    serviceId: activeServiceId,
    role: 'detail-stage',
    columnStart: 1,
    columnSpan: 8,
    rowStart: 1,
    rowSpan: 5,
  }))

  inactiveServiceIds.forEach((serviceId, index) => {
    slots.set(serviceId, Object.freeze({
      serviceId,
      role: 'compact-rail',
      columnStart: 9,
      columnSpan: 4,
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
): CommissionLayoutPlan {
  assertUniqueServiceIds(serviceIds)

  if (viewportMode === 'flow') {
    return createFlowPlan(serviceIds)
  }

  if (activeServiceId === null) {
    return createDesktopOverviewPlan(serviceIds)
  }

  return createDesktopDetailPlan(serviceIds, activeServiceId)
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
