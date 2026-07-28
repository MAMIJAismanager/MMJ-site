<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  ref,
  watch,
} from 'vue'

import CommissionDetailSupplementRail from '~/components/commission/CommissionDetailSupplementRail.vue'
import CommissionPricingMatrix from '~/components/commission/CommissionPricingMatrix.vue'
import CommissionPricingMatrixSet from '~/components/commission/CommissionPricingMatrixSet.vue'
import CommissionQuotePricing from '~/components/commission/CommissionQuotePricing.vue'
import CommissionRateRangePricing from '~/components/commission/CommissionRateRangePricing.vue'
import {
  intersectionArea,
  isCommissionDesktopMeasurementFit,
  resolveCommissionDesktopDensity,
  resolveCommissionDesktopDetailLayout,
} from '~/utils/commission-desktop-presentation'
import {
  createCommissionPricingMatrixSetView,
} from '~/utils/commission-pricing-matrix-set'

import type {
  ComponentPublicInstance,
} from 'vue'
import type {
  CommissionMatrixPricingGroup,
  CommissionPricingGroupId,
  CommissionService,
  CommissionTerm,
} from '~~/shared/types/commission-guide'
import type {
  CommissionDesktopDetailMeasurement,
  CommissionDesktopPresentationProfile,
  CommissionLayoutInvalidationReason,
  CommissionMatrixHeaderProjection,
  CommissionMobileMatrixRowProjection,
  CommissionPricingRowTabLayout,
  CommissionTermsProjection,
} from '~/types/commission-presentation'

interface Props {
  readonly service: CommissionService
  readonly terms: readonly CommissionTerm[]
  readonly commonNoticeHeading: string
  readonly idPrefix: string
  readonly mode: 'desktop' | 'mobile'
  readonly desktopProfile?: CommissionDesktopPresentationProfile
}

const props = withDefaults(defineProps<Props>(), {
  desktopProfile: 'balanced-stacked',
})

const emit = defineEmits<{
  layoutReady: [{
    readonly profile: CommissionDesktopPresentationProfile
    readonly measurement: CommissionDesktopDetailMeasurement
  }]
  layoutInvalidated: [reason: CommissionLayoutInvalidationReason]
}>()

const rootElement = ref<HTMLElement | null>(null)
const stageElement = ref<HTMLElement | null>(null)
const pricingHostElement = ref<HTMLElement | null>(null)
const supplementHostElement = ref<HTMLElement | null>(null)
let publishEpoch = 0

const density = computed(() => (
  props.mode === 'desktop'
    ? resolveCommissionDesktopDensity(props.desktopProfile)
    : 'comfortable'
))

const detailLayout = computed(() => (
  props.mode === 'desktop'
    ? resolveCommissionDesktopDetailLayout(props.desktopProfile)
    : 'stacked'
))

const matrixSetView = computed(() => (
  props.service.pricing.kind === 'matrix-set'
    ? createCommissionPricingMatrixSetView(props.service.pricing)
    : null
))

const activePricingGroupId = ref<CommissionPricingGroupId | null>(
  matrixSetView.value?.firstGroupId ?? null,
)

const activePricingGroup = computed<CommissionMatrixPricingGroup | null>(() => {
  const view = matrixSetView.value
  if (view === null) return null

  return view.groups.find(group => (
    group.id === activePricingGroupId.value
  )) ?? view.groups[0] ?? null
})

const sharedGuidanceHeading = computed(() => (
  props.service.pricing.kind === 'matrix-set'
    ? props.service.pricing.sharedGuidanceHeading
    : null
))

const sharedGuidanceItems = computed(() => (
  props.service.pricing.kind === 'matrix-set'
    ? props.service.pricing.sharedGuidanceItems
    : []
))

const activeGuidanceHeading = computed(() => (
  (activePricingGroup.value?.guidanceItems.length ?? 0) > 0
    ? '가격표 안내'
    : null
))

const activeGuidanceItems = computed(() => (
  activePricingGroup.value?.guidanceItems ?? []
))

watch(
  () => ({
    serviceId: props.service.id,
    groupIds: matrixSetView.value?.groups.map(group => group.id).join('|') ?? '',
  }),
  () => {
    const view = matrixSetView.value
    if (view === null) {
      activePricingGroupId.value = null
      return
    }

    const activeStillExists = view.groups.some(group => (
      group.id === activePricingGroupId.value
    ))
    if (!activeStillExists) {
      activePricingGroupId.value = view.firstGroupId
    }
  },
)

const shouldRenderDesktopMatrixTitle = computed(() => (
  props.mode === 'desktop'
  && (
    props.service.pricing.kind === 'matrix'
    || props.service.pricing.kind === 'matrix-set'
    || props.service.pricing.kind === 'rate-range'
  )
))

const matrixHeaderProjection = computed<CommissionMatrixHeaderProjection>(() => (
  props.mode === 'mobile'
    ? 'unit-only'
    : 'hidden'
))

const termsProjection = computed<CommissionTermsProjection>(() => (
  props.mode === 'mobile'
    ? 'title-only'
    : 'full'
))

const mobileMatrixRowProjection = computed<CommissionMobileMatrixRowProjection>(() => {
  if (props.mode !== 'mobile') return 'stacked'

  switch (props.service.id) {
    case 'choreography':
    case 'project-planning':
    case 'video-direction':
      return 'single-row-tabs'
    default:
      return 'stacked'
  }
})

const mobileMatrixRowTabLayout = computed<CommissionPricingRowTabLayout>(() => (
  props.service.id === 'project-planning'
  || props.service.id === 'video-direction'
    ? 'scroll'
    : 'equal'
))

const shouldRenderDetailInquiry = computed(() => (
  props.mode === 'mobile'
))

const MATRIX_STAGE_TITLE = '기본 가격표' as const

function setDetailElement(
  element: Element | ComponentPublicInstance | null,
): void {
  rootElement.value = element instanceof HTMLElement ? element : null
  stageElement.value = rootElement.value?.closest<HTMLElement>(
    '.mm-commission-service__panel-inner',
  ) ?? rootElement.value?.parentElement ?? null
}

function setPricingHostElement(
  element: Element | ComponentPublicInstance | null,
): void {
  pricingHostElement.value = element instanceof HTMLElement ? element : null
}

function setSupplementHostElement(
  element: Element | ComponentPublicInstance | null,
): void {
  supplementHostElement.value = element instanceof HTMLElement ? element : null
}

function nextAnimationFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()))
}

function measureDesktopLayout(): CommissionDesktopDetailMeasurement | null {
  const root = rootElement.value
  const stage = stageElement.value
  const pricing = pricingHostElement.value
  const supplement = supplementHostElement.value

  if (
    props.mode !== 'desktop'
    || root === null
    || stage === null
    || pricing === null
    || supplement === null
  ) {
    return null
  }

  const stageRect = stage.getBoundingClientRect()
  const rootRect = root.getBoundingClientRect()
  const pricingRect = pricing.getBoundingClientRect()
  const supplementRect = supplement.getBoundingClientRect()
  const overflowWidth = Math.max(0, root.scrollWidth - stage.clientWidth)
  const overflowHeight = Math.max(0, root.scrollHeight - stage.clientHeight)
  const documentOverflowHeight = typeof document === 'undefined'
    ? 0
    : Math.max(
        0,
        document.documentElement.scrollHeight
          - document.documentElement.clientHeight,
      )
  const supplementVisible = supplementRect.width > 0 && supplementRect.height > 0
  const usesSupplementRail = detailLayout.value === 'supplement-rail'
  const pricingSupplementIntersectionArea = supplementVisible
    ? intersectionArea(pricingRect, supplementRect)
    : 0
  const pricingInlineShare = rootRect.width > 0
    ? pricingRect.width / rootRect.width
    : 0
  const supplementInlineShare = usesSupplementRail && rootRect.width > 0
    ? supplementRect.width / rootRect.width
    : 0
  const pricingBeforeSupplement = !usesSupplementRail || !supplementVisible
    ? true
    : (
        pricingRect.left < supplementRect.left
        && pricingRect.right <= supplementRect.left + 1
      )
  const pricingTableFrame = pricing.querySelector<HTMLElement>(
    '.mm-commission-pricing-table-frame',
  )
  const pricingTableCoverage = pricingTableFrame === null || pricingRect.width <= 0
    ? 1
    : pricingTableFrame.getBoundingClientRect().width / pricingRect.width
  const matrixElement = pricing.querySelector<HTMLElement>(
    '[data-mm-commission-pricing-column-count]',
  )
  const matrixColumnCount = Number.parseInt(
    matrixElement?.dataset.mmCommissionPricingColumnCount ?? '0',
    10,
  )
  const minimumPricingWidth = matrixColumnCount >= 4 ? 704 : 0
  const pricingWidthSatisfiesMinimum = pricingRect.width + 1 >= minimumPricingWidth

  const base: Omit<CommissionDesktopDetailMeasurement, 'fits'> = {
    stageWidth: stageRect.width,
    stageHeight: stageRect.height,
    rootWidth: rootRect.width,
    rootHeight: rootRect.height,
    pricingLeft: pricingRect.left,
    pricingRight: pricingRect.right,
    pricingWidth: pricingRect.width,
    pricingHeight: pricingRect.height,
    supplementLeft: supplementRect.left,
    supplementRight: supplementRect.right,
    supplementWidth: supplementRect.width,
    supplementHeight: supplementRect.height,
    pricingInlineShare,
    supplementInlineShare,
    pricingBeforeSupplement,
    pricingTableCoverage,
    minimumPricingWidth,
    pricingWidthSatisfiesMinimum,
    overflowWidth,
    overflowHeight,
    documentOverflowHeight,
    pricingSupplementIntersectionArea,
  }
  const measurement: CommissionDesktopDetailMeasurement = {
    ...base,
    fits: false,
  }

  return Object.freeze({
    ...measurement,
    fits: (
      isCommissionDesktopMeasurementFit(measurement)
      && rootRect.bottom <= stageRect.bottom + 1
    ),
  })
}

async function publishLayoutReady(): Promise<void> {
  if (props.mode !== 'desktop') return
  const epoch = ++publishEpoch
  await nextTick()
  await nextAnimationFrame()
  await nextAnimationFrame()
  if (epoch !== publishEpoch) return

  const measurement = measureDesktopLayout()
  if (measurement !== null) {
    emit('layoutReady', {
      profile: props.desktopProfile,
      measurement,
    })
  }
}

function invalidateLayout(reason: CommissionLayoutInvalidationReason): void {
  emit('layoutInvalidated', reason)
  void publishLayoutReady()
}

async function updateActiveGroupId(
  groupId: CommissionPricingGroupId,
): Promise<void> {
  activePricingGroupId.value = groupId
  await nextTick()
  invalidateLayout('group-change')
}

watch(
  () => props.desktopProfile,
  () => {
    void publishLayoutReady()
  },
)

onMounted(() => {
  void publishLayoutReady()
})

defineExpose({
  measureDesktopLayout,
})
</script>

<template>
  <article
    :ref="setDetailElement"
    class="mm-commission-detail"
    :data-mm-commission-detail-mode="mode"
    :data-mm-commission-density="density"
    :data-mm-commission-pricing-kind="service.pricing.kind"
    :data-mm-desktop-profile="mode === 'desktop' ? desktopProfile : undefined"
    :data-mm-detail-layout="detailLayout"
    data-mm-detail-grid-contract="pricing-left-supplement-right"
  >
    <header
      v-if="shouldRenderDesktopMatrixTitle"
      class="mm-commission-matrix-stage-header"
      data-mm-commission-matrix-stage-header
    >
      <h3
        :id="`${idPrefix}-pricing-title`"
        class="mm-commission-matrix-stage-header__title"
      >
        {{ MATRIX_STAGE_TITLE }}
      </h3>
    </header>

    <section
      :ref="setPricingHostElement"
      class="mm-commission-detail__pricing-host"
    >
      <p
        v-if="service.pricing.kind === 'quote'"
        class="mm-commission-service__description"
        data-mm-commission-service-description
      >
        {{ service.description }}
      </p>

      <CommissionPricingMatrix
        v-if="service.pricing.kind === 'matrix'"
        :pricing="service.pricing"
        :id-prefix="idPrefix"
        :density="density"
        :header-projection="matrixHeaderProjection"
        :accessible-title="`${service.label} 기본 가격표`"
        :mobile-row-projection="mobileMatrixRowProjection"
        :mobile-row-tab-layout="mobileMatrixRowTabLayout"
        @row-change="invalidateLayout('row-change')"
      />

      <CommissionPricingMatrixSet
        v-else-if="service.pricing.kind === 'matrix-set' && activePricingGroupId"
        :pricing="service.pricing"
        :active-group-id="activePricingGroupId"
        :id-prefix="idPrefix"
        :density="density"
        :mode="mode"
        :service-label="service.label"
        :mobile-row-projection="mobileMatrixRowProjection"
        :mobile-row-tab-layout="mobileMatrixRowTabLayout"
        @update:active-group-id="updateActiveGroupId"
        @row-change="invalidateLayout('row-change')"
      />

      <CommissionRateRangePricing
        v-else-if="service.pricing.kind === 'rate-range'"
        :pricing="service.pricing"
        :id-prefix="idPrefix"
        :density="density"
        :mode="mode"
        :service-label="service.label"
      />

      <template v-else-if="service.pricing.kind === 'quote'">
        <CommissionQuotePricing :pricing="service.pricing" />

        <dl class="mm-commission-service__facts">
          <div class="mm-commission-service__fact">
            <dt>예상 기간</dt>
            <dd>{{ service.turnaroundLabel }}</dd>
          </div>
          <div class="mm-commission-service__fact">
            <dt>수정 범위</dt>
            <dd>{{ service.revisionLabel }}</dd>
          </div>
        </dl>

        <section class="mm-commission-service__included">
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
        </section>
      </template>
    </section>

    <aside
      :ref="setSupplementHostElement"
      class="mm-commission-detail__supplement-host"
    >
      <CommissionDetailSupplementRail
        :shared-guidance-heading="sharedGuidanceHeading"
        :shared-guidance-items="sharedGuidanceItems"
        :active-guidance-heading="activeGuidanceHeading"
        :active-guidance-items="activeGuidanceItems"
        :additional-note="service.additionalCostNote"
        :terms="terms"
        :common-notice-heading="commonNoticeHeading"
        :density="density"
        :terms-projection="termsProjection"
        :mode="mode"
      />
    </aside>

    <NuxtLink
      v-if="shouldRenderDetailInquiry"
      class="mm-info-action mm-info-action--primary mm-commission-service__inquiry"
      to="/contact"
    >
      {{ service.inquiryLabel }}
    </NuxtLink>
  </article>
</template>
