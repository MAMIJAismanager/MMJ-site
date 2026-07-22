import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
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
  CommissionLayoutPlan,
  CommissionViewportMode,
} from '~/utils/commission-layout-planner'

const DESKTOP_COMPOSITION_QUERY =
  '(min-width: 80rem) and (min-height: 54rem)'

interface UseCommissionWorkspaceLayoutOptions {
  readonly services: ComputedRef<readonly CommissionService[]>
  readonly activeServiceId: Readonly<Ref<CommissionServiceId | null>>
}

export function useCommissionWorkspaceLayout(
  options: UseCommissionWorkspaceLayoutOptions,
) {
  const viewportMode = ref<CommissionViewportMode>('flow')
  const serviceElements = new Map<CommissionServiceId, HTMLElement>()
  let desktopMedia: MediaQueryList | null = null

  const serviceIds = computed(() => (
    options.services.value.map(service => service.id)
  ))

  const layoutPlan = computed<CommissionLayoutPlan>(() => (
    createCommissionLayoutPlan(
      serviceIds.value,
      options.activeServiceId.value,
      viewportMode.value,
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

  function syncViewportMode(
    media: MediaQueryList | MediaQueryListEvent,
  ): void {
    viewportMode.value = media.matches ? 'desktop' : 'flow'
  }

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
      viewportMode.value,
    )
  }

  function captureLayoutRects() {
    return captureCommissionRects(serviceElements)
  }

  async function animateFrom(
    before: ReturnType<typeof captureCommissionRects>,
  ): Promise<void> {
    if (viewportMode.value !== 'desktop') return
    await animateCommissionFlip(before, serviceElements)
  }

  onMounted(() => {
    desktopMedia = window.matchMedia(DESKTOP_COMPOSITION_QUERY)
    syncViewportMode(desktopMedia)
    desktopMedia.addEventListener('change', syncViewportMode)
  })

  onBeforeUnmount(() => {
    desktopMedia?.removeEventListener('change', syncViewportMode)
    desktopMedia = null
    serviceElements.clear()
  })

  return {
    viewportMode,
    layoutPlan,
    orderedServices,
    setServiceElement,
    readSlotRole,
    readSlotStyle,
    captureLayoutRects,
    animateFrom,
  }
}
