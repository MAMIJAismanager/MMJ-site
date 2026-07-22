<script setup lang="ts">
import {
  computed,
  nextTick,
  ref,
} from 'vue'

import CommissionDeckPagination from '~/components/commission/CommissionDeckPagination.vue'
import CommissionServiceDetail from '~/components/commission/CommissionServiceDetail.vue'
import CommissionServiceTabRail from '~/components/commission/CommissionServiceTabRail.vue'
import {
  useCommissionSwipeDeck,
} from '~/composables/useCommissionSwipeDeck'

import type {
  ComponentPublicInstance,
} from 'vue'
import type {
  CommissionService,
  CommissionServiceId,
  CommissionTerm,
} from '~~/shared/types/commission-guide'
import type {
  CommissionSwipeDirection,
} from '~/utils/commission-swipe-gesture'

interface Props {
  readonly services: readonly CommissionService[]
  readonly terms: readonly CommissionTerm[]
  readonly commonNoticeHeading: string
}

interface TabRailExpose {
  alignActiveTab(serviceId: CommissionServiceId): Promise<void>
  focusActiveTab(serviceId: CommissionServiceId): void
}

const props = defineProps<Props>()
const firstService = props.services[0]
if (firstService === undefined) {
  throw new TypeError('commission-mobile-deck-requires-service')
}

const activeServiceId = ref<CommissionServiceId>(firstService.id)
const panelElement = ref<HTMLElement | null>(null)
const tabRail = ref<TabRailExpose | null>(null)
let pendingTargetServiceId: CommissionServiceId | null = null

const activeIndex = computed(() => (
  props.services.findIndex(service => service.id === activeServiceId.value)
))

const activeService = computed(() => {
  const service = props.services[activeIndex.value]
  if (service === undefined) {
    throw new TypeError('commission-mobile-active-service-missing')
  }
  return service
})

const activeTerms = computed(() => (
  props.terms.filter(term => (
    term.enabled
    && (
      term.scope === 'global'
      || term.serviceId === activeServiceId.value
    )
  ))
))

function setPanelElement(
  element: Element | ComponentPublicInstance | null,
): void {
  panelElement.value = element instanceof HTMLElement ? element : null
}

function nextAnimationFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()))
}

function canMove(direction: CommissionSwipeDirection): boolean {
  if (direction === 'previous') return activeIndex.value > 0
  return activeIndex.value < props.services.length - 1
}

async function commitMove(
  direction: CommissionSwipeDirection,
): Promise<void> {
  const requestedId = pendingTargetServiceId
  pendingTargetServiceId = null

  if (requestedId !== null) {
    activeServiceId.value = requestedId
  } else {
    const offset = direction === 'next' ? 1 : -1
    const service = props.services[activeIndex.value + offset]
    if (service === undefined) return
    activeServiceId.value = service.id
  }

  await nextTick()
  await nextAnimationFrame()
  await tabRail.value?.alignActiveTab(activeServiceId.value)
}

const {
  panelStyle,
  transitionBusy,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handlePointerCancel,
  runProgrammaticTransition,
} = useCommissionSwipeDeck({
  getPanelElement: () => panelElement.value,
  canMove,
  move: commitMove,
})

async function selectService(
  serviceId: CommissionServiceId,
  source: 'tab' | 'keyboard',
): Promise<void> {
  if (
    transitionBusy.value
    || serviceId === activeServiceId.value
  ) {
    if (source === 'keyboard') {
      tabRail.value?.focusActiveTab(serviceId)
    }
    return
  }

  const nextIndex = props.services.findIndex(service => service.id === serviceId)
  if (nextIndex < 0) return

  pendingTargetServiceId = serviceId
  const direction: CommissionSwipeDirection = nextIndex > activeIndex.value
    ? 'next'
    : 'previous'
  await runProgrammaticTransition(direction)

  if (source === 'keyboard') {
    tabRail.value?.focusActiveTab(serviceId)
  }
}
</script>

<template>
  <div
    class="mm-commission-mobile-deck"
    data-mm-commission-mobile-deck
    :aria-busy="transitionBusy ? 'true' : undefined"
  >
    <CommissionServiceTabRail
      ref="tabRail"
      :services="services"
      :active-service-id="activeServiceId"
      id-prefix="mm-commission-mobile"
      @select="selectService"
    />

    <div
      class="mm-commission-swipe-viewport"
      data-mm-commission-swipe-viewport
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerCancel"
    >
      <section
        :id="`mm-commission-mobile-panel-${activeService.id}`"
        :key="activeService.id"
        :ref="setPanelElement"
        class="mm-commission-mobile-panel"
        role="tabpanel"
        :aria-labelledby="`mm-commission-mobile-tab-${activeService.id}`"
        :style="panelStyle"
      >
        <header class="mm-commission-mobile-panel__header">
          <div>
            <p class="mm-commission-mobile-panel__position">
              {{ activeIndex + 1 }} / {{ services.length }}
            </p>
            <h3 class="mm-commission-mobile-panel__title">
              {{ activeService.label }}
            </h3>
          </div>
          <p class="mm-commission-mobile-panel__summary">
            {{ activeService.summary }}
          </p>
        </header>

        <CommissionServiceDetail
          :service="activeService"
          :terms="activeTerms"
          :common-notice-heading="commonNoticeHeading"
          :id-prefix="`mm-commission-mobile-${activeService.id}`"
          mode="mobile"
        />
      </section>
    </div>

    <CommissionDeckPagination
      :services="services"
      :active-service-id="activeServiceId"
    />
  </div>
</template>
