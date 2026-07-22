<script setup lang="ts">
import {
  computed,
  nextTick,
  ref,
} from 'vue'

import CommissionServiceDetail from '~/components/commission/CommissionServiceDetail.vue'
import {
  useCommissionFocusAnchor,
} from '~/composables/useCommissionFocusAnchor'
import {
  useCommissionWorkspaceLayout,
} from '~/composables/useCommissionWorkspaceLayout'

import type {
  ComponentPublicInstance,
} from 'vue'
import type {
  CommissionService,
  CommissionServiceId,
  CommissionTerm,
} from '~~/shared/types/commission-guide'

interface Props {
  readonly services: readonly CommissionService[]
  readonly terms: readonly CommissionTerm[]
  readonly commonNoticeHeading: string
}

type CommissionExplorerPhase =
  | 'overview'
  | 'opening'
  | 'detail'
  | 'switching'
  | 'closing'

const props = defineProps<Props>()
const services = computed(() => props.services)
const activeServiceId = ref<CommissionServiceId | null>(null)
const phase = ref<CommissionExplorerPhase>('overview')
const detailContentVisible = ref(false)
const transitionBusy = ref(false)
let pendingServiceId: CommissionServiceId | null = null

const {
  viewportMode,
  layoutPlan,
  orderedServices,
  setServiceElement,
  readSlotRole,
  readSlotStyle,
  captureLayoutRects,
  animateFrom,
} = useCommissionWorkspaceLayout({
  services,
  activeServiceId,
})

const {
  setTriggerElement,
  focusTrigger,
} = useCommissionFocusAnchor()

function nextAnimationFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()))
}

function wait(milliseconds: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds))
}

function isActive(serviceId: CommissionServiceId): boolean {
  return activeServiceId.value === serviceId
}

function isDetailVisible(serviceId: CommissionServiceId): boolean {
  return isActive(serviceId) && detailContentVisible.value
}

function resolveTerms(serviceId: CommissionServiceId) {
  return props.terms.filter(term => (
    term.enabled
    && (
      term.scope === 'global'
      || term.serviceId === serviceId
    )
  ))
}

function setServiceCardElement(
  serviceId: CommissionServiceId,
  element: Element | ComponentPublicInstance | null,
): void {
  setServiceElement(
    serviceId,
    element instanceof HTMLElement ? element : null,
  )
}

async function runServiceTransition(
  requestedServiceId: CommissionServiceId,
): Promise<void> {
  if (transitionBusy.value) {
    pendingServiceId = requestedServiceId
    return
  }

  transitionBusy.value = true
  const previousServiceId = activeServiceId.value
  const nextServiceId = previousServiceId === requestedServiceId
    ? null
    : requestedServiceId
  const isOpening = previousServiceId === null && nextServiceId !== null
  const isClosing = previousServiceId !== null && nextServiceId === null

  phase.value = isOpening
    ? 'opening'
    : isClosing
      ? 'closing'
      : 'switching'

  if (previousServiceId !== null) {
    detailContentVisible.value = false
    await nextTick()
    if (viewportMode.value === 'desktop') await wait(110)
  }

  const before = captureLayoutRects()
  activeServiceId.value = nextServiceId
  await nextTick()
  await nextAnimationFrame()
  await animateFrom(before)

  if (nextServiceId === null) {
    phase.value = 'overview'
    if (previousServiceId !== null) focusTrigger(previousServiceId)
  } else {
    detailContentVisible.value = true
    phase.value = 'detail'
  }

  transitionBusy.value = false
  const queuedServiceId = pendingServiceId
  pendingServiceId = null
  if (queuedServiceId !== null) {
    await runServiceTransition(queuedServiceId)
  }
}

function toggleService(serviceId: CommissionServiceId): void {
  void runServiceTransition(serviceId)
}

function closeActiveService(): void {
  const active = activeServiceId.value
  if (active !== null) void runServiceTransition(active)
}
</script>

<template>
  <div
    class="mm-commission-desktop-workspace"
    data-mm-commission-desktop-workspace
    :data-mm-commission-active-service="activeServiceId ?? 'none'"
    :data-mm-commission-phase="phase"
    :data-mm-commission-layout="layoutPlan.mode"
    :aria-busy="transitionBusy ? 'true' : undefined"
    @keydown.esc.prevent="closeActiveService"
  >
    <ul
      class="mm-commission-service-list"
      data-mm-commission-service-list
    >
      <li
        v-for="service in orderedServices"
        :key="service.id"
        :ref="element => setServiceCardElement(service.id, element)"
        class="mm-commission-service"
        :data-active="isActive(service.id) ? 'true' : 'false'"
        :data-detail-visible="isDetailVisible(service.id) ? 'true' : 'false'"
        :data-layout-role="readSlotRole(service.id)"
        :data-mm-commission-service-id="service.id"
        :style="readSlotStyle(service.id)"
      >
        <button
          :id="`mm-commission-desktop-trigger-${service.id}`"
          :ref="element => setTriggerElement(service.id, element)"
          class="mm-commission-service__trigger"
          type="button"
          :aria-expanded="isActive(service.id)"
          :aria-controls="`mm-commission-desktop-panel-${service.id}`"
          @click="toggleService(service.id)"
        >
          <span class="mm-commission-service__trigger-copy">
            <span class="mm-commission-service__label">
              {{ service.label }}
            </span>
            <span class="mm-commission-service__summary">
              {{ service.summary }}
            </span>
          </span>
          <span
            class="mm-commission-service__indicator"
            aria-hidden="true"
          >
            {{ isActive(service.id) ? '−' : '+' }}
          </span>
        </button>

        <section
          :id="`mm-commission-desktop-panel-${service.id}`"
          class="mm-commission-service__panel"
          role="region"
          :aria-labelledby="`mm-commission-desktop-trigger-${service.id}`"
          :aria-hidden="isDetailVisible(service.id) ? undefined : 'true'"
          :inert="!isDetailVisible(service.id)"
        >
          <div class="mm-commission-service__panel-inner">
            <CommissionServiceDetail
              v-if="isDetailVisible(service.id)"
              :service="service"
              :terms="resolveTerms(service.id)"
              :common-notice-heading="commonNoticeHeading"
              :id-prefix="`mm-commission-desktop-${service.id}`"
              mode="desktop"
            />
          </div>
        </section>
      </li>
    </ul>
  </div>
</template>
