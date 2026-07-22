import {
  computed,
  onBeforeUnmount,
} from 'vue'

import {
  animateCommissionFlip,
  captureCommissionRects,
} from '~/utils/commission-flip-animation'
import {
  createCommissionLayoutPlan,
  createCommissionSlotStyle,
} from '~/utils/commission-layout-planner'

import type {
  ComputedRef,
  Ref,
} from 'vue'
import type {
  CommissionService,
  CommissionServiceId,
} from '~~/shared/types/commission-guide'
import type {
  CommissionViewportMode,
} from '~/utils/commission-layout-planner'

interface UseCommissionWorkspaceLayoutOptions {
  readonly services: ComputedRef<readonly CommissionService[]>
  readonly activeServiceId: Readonly<Ref<CommissionServiceId | null>>
  readonly viewportMode: Readonly<Ref<CommissionViewportMode>>
}

export function useCommissionWorkspaceLayout(
  options: UseCommissionWorkspaceLayoutOptions,
) {
  const serviceElements = new Map<CommissionServiceId, HTMLElement>()

  const serviceIds = computed(() => (
    options.services.value.map(service => service.id)
  ))

  const layoutPlan = computed(() => (
    createCommissionLayoutPlan(
      serviceIds.value,
      options.activeServiceId.value,
      options.viewportMode.value,
    )
  ))

  const serviceById = computed(() => (
    new Map(
      options.services.value.map(service => [service.id, service] as const),
    )
  ))

  const orderedServices = computed(() => (
    layoutPlan.value.orderedServiceIds.flatMap(serviceId => {
      const service = serviceById.value.get(serviceId)
      return service === undefined ? [] : [service]
    })
  ))

  function setServiceElement(
    serviceId: CommissionServiceId,
    element: HTMLElement | null,
  ): void {
    if (element === null) {
      serviceElements.delete(serviceId)
      return
    }

    serviceElements.set(serviceId, element)
  }

  function readSlotRole(serviceId: CommissionServiceId) {
    return layoutPlan.value.slots.get(serviceId)?.role ?? 'flow-card'
  }

  function readSlotStyle(
    serviceId: CommissionServiceId,
  ) {
    return createCommissionSlotStyle(
      layoutPlan.value.slots.get(serviceId),
      options.viewportMode.value,
    )
  }

  function captureLayoutRects() {
    return captureCommissionRects(serviceElements)
  }

  onBeforeUnmount(() => {
    serviceElements.clear()
  })

  async function animateFrom(
    before: ReturnType<typeof captureCommissionRects>,
  ): Promise<void> {
    if (options.viewportMode.value !== 'desktop') return
    await animateCommissionFlip(before, serviceElements)
  }

  return {
    viewportMode: options.viewportMode,
    layoutPlan,
    orderedServices,
    setServiceElement,
    readSlotRole,
    readSlotStyle,
    captureLayoutRects,
    animateFrom,
  }
}
