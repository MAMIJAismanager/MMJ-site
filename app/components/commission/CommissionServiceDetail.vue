<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  toRef,
} from 'vue'

import CommissionPricingMatrix from '~/components/commission/CommissionPricingMatrix.vue'
import CommissionQuotePricing from '~/components/commission/CommissionQuotePricing.vue'
import CommissionTermsList from '~/components/commission/CommissionTermsList.vue'
import {
  useCommissionDetailDensity,
} from '~/composables/useCommissionDetailDensity'

import type {
  ComponentPublicInstance,
} from 'vue'
import type {
  CommissionService,
  CommissionTerm,
} from '~~/shared/types/commission-guide'

interface Props {
  readonly service: CommissionService
  readonly terms: readonly CommissionTerm[]
  readonly commonNoticeHeading: string
  readonly idPrefix: string
  readonly mode: 'desktop' | 'mobile'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  layoutReady: []
}>()

const {
  density,
  availableHeight,
  requiredHeight,
  overflowAmount,
  internalScrollFallback,
  setRootElement,
  remeasure,
} = useCommissionDetailDensity({
  mode: toRef(props, 'mode'),
})

const shouldLiftMatrixHeader = computed(() => (
  props.mode === 'desktop'
  && props.service.pricing.kind === 'matrix'
))

const matrixHeaderView = computed(() => {
  const pricing = props.service.pricing
  if (pricing.kind !== 'matrix') return null

  return {
    title: pricing.title,
    description: density.value === 'compact'
      ? pricing.compactDescription
      : pricing.description,
    unitLabel: pricing.unitLabel,
  }
})

function setDetailElement(
  element: Element | ComponentPublicInstance | null,
): void {
  setRootElement(element instanceof HTMLElement ? element : null)
}

function nextAnimationFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()))
}

onMounted(async () => {
  await nextTick()
  await nextAnimationFrame()
  await nextAnimationFrame()
  await remeasure()
  emit('layoutReady')
})
</script>

<template>
  <article
    :ref="setDetailElement"
    class="mm-commission-detail"
    :data-mm-commission-detail-mode="mode"
    :data-mm-commission-density="density"
    :data-mm-commission-pricing-kind="service.pricing.kind"
    :data-mm-content-overflow="internalScrollFallback ? 'true' : 'false'"
    :data-mm-available-height="Math.round(availableHeight)"
    :data-mm-required-height="Math.round(requiredHeight)"
    :data-mm-overflow-amount="Math.round(overflowAmount)"
  >
    <header
      v-if="shouldLiftMatrixHeader && matrixHeaderView"
      class="mm-commission-matrix-stage-header"
      data-mm-commission-matrix-stage-header
    >
      <div class="mm-commission-matrix-stage-header__copy">
        <h3
          :id="`${idPrefix}-pricing-title`"
          class="mm-commission-matrix-stage-header__title"
        >
          {{ matrixHeaderView.title }}
        </h3>
        <div class="mm-commission-matrix-stage-header__meta">
          <p
            v-if="matrixHeaderView.description"
            :id="`${idPrefix}-pricing-description`"
          >
            {{ matrixHeaderView.description }}
          </p>
          <p class="mm-commission-matrix-stage-header__unit">
            단위: {{ matrixHeaderView.unitLabel }}
          </p>
        </div>
      </div>

      <NuxtLink
        class="mm-info-action mm-info-action--primary mm-commission-detail__inquiry"
        to="/contact"
      >
        {{ service.inquiryLabel }}
      </NuxtLink>
    </header>

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
      :show-header="!shouldLiftMatrixHeader"
    />

    <template v-else>
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

      <p
        v-if="service.additionalCostNote"
        class="mm-commission-service__additional-note"
      >
        {{ service.additionalCostNote }}
      </p>
    </template>

    <CommissionTermsList
      :heading="commonNoticeHeading"
      :terms="terms"
      :density="density"
    />

    <NuxtLink
      v-if="!shouldLiftMatrixHeader"
      class="mm-info-action mm-info-action--primary mm-commission-service__inquiry"
      to="/contact"
    >
      {{ service.inquiryLabel }}
    </NuxtLink>
  </article>
</template>
