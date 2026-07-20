<script setup lang="ts">
import {
  computed,
  nextTick,
  ref,
} from 'vue'

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
} from '~~/shared/types/commission-guide'

interface Props {
  readonly heading: string
  readonly services: readonly CommissionService[]
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
  alignServiceTrigger,
} = useCommissionFocusAnchor()

function nextAnimationFrame(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => resolve())
  })
}

function wait(milliseconds: number): Promise<void> {
  return new Promise(resolve => {
    window.setTimeout(resolve, milliseconds)
  })
}

function isActive(serviceId: CommissionServiceId): boolean {
  return activeServiceId.value === serviceId
}

function isDetailVisible(serviceId: CommissionServiceId): boolean {
  return isActive(serviceId) && detailContentVisible.value
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

    if (viewportMode.value === 'flow') {
      await alignServiceTrigger(nextServiceId)
    }
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
  if (active === null) return
  void runServiceTransition(active)
}
</script>

<template>
  <section
    class="mm-commission-explorer"
    aria-labelledby="mm-commission-services-heading"
    data-mm-commission-explorer
    :data-mm-commission-active-service="activeServiceId ?? 'none'"
    :data-mm-commission-phase="phase"
    :data-mm-commission-layout="layoutPlan.mode"
    :data-mm-commission-viewport="viewportMode"
    :aria-busy="transitionBusy ? 'true' : undefined"
    @keydown.esc.prevent="closeActiveService"
  >
    <h2
      id="mm-commission-services-heading"
      class="mm-info-section__title"
    >
      {{ heading }}
    </h2>

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
          :id="`mm-commission-trigger-${service.id}`"
          :ref="element => setTriggerElement(service.id, element)"
          class="mm-commission-service__trigger"
          type="button"
          :aria-expanded="isActive(service.id)"
          :aria-controls="`mm-commission-panel-${service.id}`"
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
          :id="`mm-commission-panel-${service.id}`"
          class="mm-commission-service__panel"
          role="region"
          :aria-labelledby="`mm-commission-trigger-${service.id}`"
          :aria-hidden="isDetailVisible(service.id) ? undefined : 'true'"
          :inert="!isDetailVisible(service.id)"
        >
          <div class="mm-commission-service__panel-inner">
            <div class="mm-commission-service__detail-grid">
              <div class="mm-commission-service__description-block">
                <p class="mm-commission-service__description">
                  {{ service.description }}
                </p>
              </div>

              <dl class="mm-commission-service__facts">
                <div class="mm-commission-service__fact mm-commission-service__fact--price">
                  <dt>기본 견적</dt>
                  <dd>
                    <strong>{{ service.price.displayLabel }}</strong>
                    <span
                      v-if="service.price.note"
                      class="mm-commission-service__price-note"
                    >
                      {{ service.price.note }}
                    </span>
                  </dd>
                </div>

                <div class="mm-commission-service__fact">
                  <dt>예상 기간</dt>
                  <dd>{{ service.turnaroundLabel }}</dd>
                </div>

                <div class="mm-commission-service__fact">
                  <dt>수정 범위</dt>
                  <dd>{{ service.revisionLabel }}</dd>
                </div>
              </dl>

              <div class="mm-commission-service__included">
                <h3 class="mm-commission-service__subheading">
                  기본 포함
                </h3>
                <ul class="mm-commission-service__included-list">
                  <li
                    v-for="item in service.includedItems"
                    :key="item"
                  >
                    {{ item }}
                  </li>
                </ul>
              </div>

              <p
                v-if="service.additionalCostNote"
                class="mm-commission-service__additional-note"
              >
                {{ service.additionalCostNote }}
              </p>

              <NuxtLink
                class="mm-info-action mm-info-action--primary mm-commission-service__inquiry"
                to="/contact"
              >
                {{ service.inquiryLabel }}
              </NuxtLink>
            </div>
          </div>
        </section>
      </li>
    </ul>
  </section>
</template>

<style src="~/assets/css/commission-guide.css"></style>
