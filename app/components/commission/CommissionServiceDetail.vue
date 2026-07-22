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

const MATRIX_STAGE_TITLE = '기본 가격표' as const

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
      v-if="shouldLiftMatrixHeader"
      class="mm-commission-matrix-stage-header"
      data-mm-commission-matrix-stage-header
    >
      <h3
        :id="`${idPrefix}-pricing-title`"
        class="mm-commission-matrix-stage-header__title"
      >
        {{ MATRIX_STAGE_TITLE }}
      </h3>

      <div
        class="mm-commission-matrix-stage-header__end"
        data-mm-commission-matrix-stage-header-end
      >
        <NuxtLink
          class="mm-info-action mm-info-action--primary mm-commission-matrix-stage-header__inquiry"
          to="/contact"
        >
          {{ service.inquiryLabel }}
        </NuxtLink>
      </div>
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
      :accessible-title="`${service.label} 기본 가격표`"
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
