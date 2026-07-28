<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  toRef,
  watch,
} from 'vue'

import CommissionServiceDetail from '~/components/commission/CommissionServiceDetail.vue'
import {
  useCommissionFocusAnchor,
} from '~/composables/useCommissionFocusAnchor'
import {
  useCommissionWorkspaceLayout,
} from '~/composables/useCommissionWorkspaceLayout'
import {
  COMMISSION_DESKTOP_PRESENTATION_CANDIDATES,
  resolveCommissionDetailWidthProfile,
} from '~/utils/commission-desktop-presentation'
import {
  resolveCommissionTermsForService,
} from '~/utils/commission-terms'

import type {
  ComponentPublicInstance,
} from 'vue'
import type {
  CommissionService,
  CommissionServiceId,
  CommissionTerm,
} from '~~/shared/types/commission-guide'
import type {
  CommissionViewportMode,
} from '~/utils/commission-layout-planner'
import type {
  CommissionDesktopDetailMeasurement,
  CommissionDesktopLayoutReceipt,
  CommissionDesktopPresentationProfile,
  CommissionLayoutInvalidationReason,
} from '~/types/commission-presentation'

interface Props {
  readonly services: readonly CommissionService[]
  readonly terms: readonly CommissionTerm[]
  readonly commonNoticeHeading: string
  readonly viewportMode: CommissionViewportMode
}

interface CommissionServiceDetailExpose {
  measureDesktopLayout(): CommissionDesktopDetailMeasurement | null
}

type CommissionExplorerPhase =
  | 'overview'
  | 'opening'
  | 'detail'
  | 'switching'
  | 'closing'

const props = defineProps<Props>()
const emit = defineEmits<{
  flowFallbackChange: [enabled: boolean]
}>()

const services = computed(() => props.services)
const activeServiceId = ref<CommissionServiceId | null>(null)
const phase = ref<CommissionExplorerPhase>('overview')
const detailContentMounted = ref(false)
const detailPaintReady = ref(false)
const transitionBusy = ref(false)
const activePresentationProfile = ref<CommissionDesktopPresentationProfile>('measuring')
const layoutReceipt = ref<CommissionDesktopLayoutReceipt | null>(null)
const flowFallback = ref(false)
const layoutEpoch = ref(0)
const detailComponents = new Map<CommissionServiceId, CommissionServiceDetailExpose>()
let pendingServiceId: CommissionServiceId | null = null
let scheduledResolveFrame: number | null = null

const activeWidthProfile = computed(() => (
  resolveCommissionDetailWidthProfile(activePresentationProfile.value)
))

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
  viewportMode: toRef(props, 'viewportMode'),
  widthProfile: activeWidthProfile,
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

function isDetailMounted(serviceId: CommissionServiceId): boolean {
  return isActive(serviceId) && detailContentMounted.value
}

function isDetailVisible(serviceId: CommissionServiceId): boolean {
  return isActive(serviceId) && detailPaintReady.value
}

function isDetailStage(serviceId: CommissionServiceId): boolean {
  return readSlotRole(serviceId) === 'detail-stage'
}

function resolveTerms(service: CommissionService) {
  return resolveCommissionTermsForService(
    props.terms,
    service,
  )
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

function setDetailComponent(
  serviceId: CommissionServiceId,
  element: Element | ComponentPublicInstance | null,
): void {
  if (element === null) {
    detailComponents.delete(serviceId)
    return
  }

  const exposed = element as unknown as CommissionServiceDetailExpose
  if (typeof exposed.measureDesktopLayout === 'function') {
    detailComponents.set(serviceId, exposed)
  }
}

function setFlowFallback(enabled: boolean): void {
  if (flowFallback.value === enabled) return
  flowFallback.value = enabled
  emit('flowFallbackChange', enabled)
}

async function evaluatePresentationCandidate(
  serviceId: CommissionServiceId,
  profile: Exclude<CommissionDesktopPresentationProfile, 'measuring' | 'document-flow'>,
  epoch: number,
): Promise<CommissionDesktopDetailMeasurement | null> {
  activePresentationProfile.value = profile
  await nextTick()
  await nextAnimationFrame()
  await nextAnimationFrame()
  if (layoutEpoch.value !== epoch || activeServiceId.value !== serviceId) {
    return null
  }

  return detailComponents.get(serviceId)?.measureDesktopLayout() ?? null
}

async function resolveDesktopPresentation(
  serviceId: CommissionServiceId,
  reason: CommissionLayoutInvalidationReason,
): Promise<void> {
  if (
    viewportMode.value !== 'desktop'
    || activeServiceId.value !== serviceId
    || !detailContentMounted.value
  ) {
    return
  }

  const epoch = ++layoutEpoch.value
  detailPaintReady.value = false
  activePresentationProfile.value = 'measuring'
  layoutReceipt.value = null
  setFlowFallback(false)

  for (const candidate of COMMISSION_DESKTOP_PRESENTATION_CANDIDATES) {
    const measurement = await evaluatePresentationCandidate(
      serviceId,
      candidate.profile,
      epoch,
    )

    if (layoutEpoch.value !== epoch || activeServiceId.value !== serviceId) {
      return
    }

    if (measurement?.fits) {
      layoutReceipt.value = Object.freeze({
        serviceId,
        epoch,
        profile: candidate.profile,
        measurement,
      })
      detailPaintReady.value = true
      phase.value = 'detail'
      return
    }
  }

  activePresentationProfile.value = 'document-flow'
  setFlowFallback(true)
  await nextTick()
  await nextAnimationFrame()
  await nextAnimationFrame()
  if (layoutEpoch.value !== epoch || activeServiceId.value !== serviceId) return

  const measurement = detailComponents.get(serviceId)?.measureDesktopLayout()
  if (measurement !== null && measurement !== undefined) {
    layoutReceipt.value = Object.freeze({
      serviceId,
      epoch,
      profile: 'document-flow',
      measurement,
    })
  }
  detailPaintReady.value = true
  phase.value = 'detail'

  if (import.meta.dev) {
    console.info('MMJ-UI28-R2-R11-R2: document-flow fallback', {
      serviceId,
      reason,
    })
  }
}

function scheduleDesktopLayoutResolve(
  serviceId: CommissionServiceId,
  reason: CommissionLayoutInvalidationReason,
): void {
  if (typeof window === 'undefined') return
  if (activeServiceId.value === serviceId) {
    detailPaintReady.value = false
  }
  if (scheduledResolveFrame !== null) {
    cancelAnimationFrame(scheduledResolveFrame)
  }
  scheduledResolveFrame = requestAnimationFrame(() => {
    scheduledResolveFrame = null
    void resolveDesktopPresentation(serviceId, reason)
  })
}

function acceptLayoutReady(
  serviceId: CommissionServiceId,
  payload: {
    readonly profile: CommissionDesktopPresentationProfile
    readonly measurement: CommissionDesktopDetailMeasurement
  },
): void {
  if (
    activeServiceId.value !== serviceId
    || payload.profile !== activePresentationProfile.value
    || activePresentationProfile.value === 'measuring'
  ) {
    return
  }

  if (layoutReceipt.value?.profile === payload.profile) {
    layoutReceipt.value = Object.freeze({
      ...layoutReceipt.value,
      measurement: payload.measurement,
    })
  }
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

  layoutEpoch.value += 1
  detailPaintReady.value = false
  detailContentMounted.value = false
  activePresentationProfile.value = 'measuring'
  layoutReceipt.value = null
  setFlowFallback(false)

  if (previousServiceId !== null) {
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
    detailContentMounted.value = true
    await nextTick()
    await resolveDesktopPresentation(nextServiceId, 'service-open')
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

function handleViewportResize(): void {
  const active = activeServiceId.value
  if (active !== null && detailContentMounted.value) {
    scheduleDesktopLayoutResolve(active, 'viewport-resize')
  }
}

onMounted(() => {
  window.addEventListener('resize', handleViewportResize, { passive: true })
  if (document.fonts) {
    void document.fonts.ready.then(() => {
      const active = activeServiceId.value
      if (active !== null && detailContentMounted.value) {
        scheduleDesktopLayoutResolve(active, 'font-ready')
      }
    })
  }
})

watch(viewportMode, mode => {
  if (mode !== 'desktop') {
    setFlowFallback(false)
    return
  }
  const active = activeServiceId.value
  if (active !== null && detailContentMounted.value) {
    scheduleDesktopLayoutResolve(active, 'viewport-resize')
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleViewportResize)
  if (scheduledResolveFrame !== null) {
    cancelAnimationFrame(scheduledResolveFrame)
  }
  detailComponents.clear()
})
</script>

<template>
  <div
    class="mm-commission-desktop-workspace"
    data-mm-commission-desktop-workspace
    :data-mm-commission-active-service="activeServiceId ?? 'none'"
    :data-mm-commission-phase="phase"
    :data-mm-commission-layout="layoutPlan.mode"
    :data-mm-commission-presentation-profile="activePresentationProfile"
    :data-mm-commission-width-profile="activeWidthProfile"
    :data-mm-detail-paint-ready="detailPaintReady ? 'true' : 'false'"
    :data-mm-flow-fallback="flowFallback ? 'true' : 'false'"
    :data-mm-layout-epoch="layoutReceipt?.epoch ?? undefined"
    :data-mm-layout-overflow-height="layoutReceipt ? Math.round(layoutReceipt.measurement.overflowHeight) : undefined"
    :data-mm-layout-overflow-width="layoutReceipt ? Math.round(layoutReceipt.measurement.overflowWidth) : undefined"
    :data-mm-layout-intersection-area="layoutReceipt ? Math.round(layoutReceipt.measurement.pricingSupplementIntersectionArea) : undefined"
    :aria-busy="transitionBusy || (activeServiceId !== null && !detailPaintReady) ? 'true' : undefined"
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
        :data-detail-mounted="isDetailMounted(service.id) ? 'true' : 'false'"
        :data-detail-visible="isDetailVisible(service.id) ? 'true' : 'false'"
        :data-layout-role="readSlotRole(service.id)"
        :data-mm-commission-service-id="service.id"
        :style="readSlotStyle(service.id)"
      >
        <header
          v-if="isDetailStage(service.id) && isActive(service.id)"
          class="mm-commission-service__active-header"
          data-mm-commission-active-header
        >
          <button
            :id="`mm-commission-desktop-trigger-${service.id}`"
            :ref="element => setTriggerElement(service.id, element)"
            class="mm-commission-service__active-copy"
            type="button"
            :aria-expanded="true"
            :aria-controls="`mm-commission-desktop-panel-${service.id}`"
            @click="toggleService(service.id)"
          >
            <span class="mm-commission-service__label">
              {{ service.label }}
            </span>
            <span class="mm-commission-service__summary">
              {{ service.summary }}
            </span>
          </button>

          <div class="mm-commission-service__active-actions">
            <NuxtLink
              class="mm-info-action mm-info-action--primary mm-commission-service__header-inquiry"
              to="/contact"
            >
              {{ service.inquiryLabel }}
            </NuxtLink>

            <button
              class="mm-commission-service__toggle"
              type="button"
              :aria-label="`${service.label} 의뢰 상세 접기`"
              :aria-controls="`mm-commission-desktop-panel-${service.id}`"
              :aria-expanded="true"
              @click="toggleService(service.id)"
            >
              <span aria-hidden="true">−</span>
            </button>
          </div>
        </header>

        <button
          v-else
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
              v-if="isDetailMounted(service.id)"
              :ref="element => setDetailComponent(service.id, element)"
              :service="service"
              :terms="resolveTerms(service)"
              :common-notice-heading="commonNoticeHeading"
              :id-prefix="`mm-commission-desktop-${service.id}`"
              mode="desktop"
              :desktop-profile="activePresentationProfile"
              @layout-ready="payload => acceptLayoutReady(service.id, payload)"
              @layout-invalidated="reason => scheduleDesktopLayoutResolve(service.id, reason)"
            />
          </div>
        </section>
      </li>
    </ul>
  </div>
</template>
