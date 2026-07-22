<script setup lang="ts">
import {
  computed,
  nextTick,
  ref,
  watch,
} from 'vue'

import CommissionPricingGroupTabs from '~/components/commission/CommissionPricingGroupTabs.vue'
import CommissionPricingMatrix from '~/components/commission/CommissionPricingMatrix.vue'
import {
  createCommissionPricingMatrixSetView,
  projectCommissionPricingGroup,
} from '~/utils/commission-pricing-matrix-set'

import type {
  CommissionMatrixSetPricing,
  CommissionPricingGroupId,
} from '~~/shared/types/commission-guide'
import type {
  CommissionMatrixHeaderProjection,
} from '~/types/commission-presentation'
import type {
  CommissionDetailDensity,
} from '~/utils/commission-detail-density'

interface Props {
  readonly pricing: CommissionMatrixSetPricing
  readonly idPrefix: string
  readonly density: CommissionDetailDensity
  readonly mode: 'desktop' | 'mobile'
  readonly serviceLabel: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  groupChange: []
}>()

const matrixSet = computed(() => (
  createCommissionPricingMatrixSetView(props.pricing)
))

const activePricingGroupId = ref<CommissionPricingGroupId>(
  matrixSet.value.firstGroupId,
)

const activeGroup = computed(() => {
  const group = matrixSet.value.groups.find(candidate => (
    candidate.id === activePricingGroupId.value
  ))
  if (group === undefined) {
    throw new TypeError(
      `commission-pricing-active-group-missing:${activePricingGroupId.value}`,
    )
  }
  return group
})

const activeMatrixPricing = computed(() => (
  projectCommissionPricingGroup(props.pricing, activeGroup.value)
))

const headerProjection = computed<CommissionMatrixHeaderProjection>(() => (
  props.mode === 'mobile'
    ? 'unit-only'
    : 'hidden'
))

const activeAccessibleTitle = computed(() => (
  `${props.serviceLabel} ${activeGroup.value.label} 기본 가격표`
))

watch(
  () => matrixSet.value.groups.map(group => group.id).join('|'),
  () => {
    const activeStillExists = matrixSet.value.groups.some(group => (
      group.id === activePricingGroupId.value
    ))
    if (!activeStillExists) {
      activePricingGroupId.value = matrixSet.value.firstGroupId
    }
  },
)

async function selectGroup(groupId: CommissionPricingGroupId): Promise<void> {
  if (groupId === activePricingGroupId.value) return
  const exists = matrixSet.value.groups.some(group => group.id === groupId)
  if (!exists) {
    throw new TypeError(`commission-pricing-group-unknown:${groupId}`)
  }

  activePricingGroupId.value = groupId
  await nextTick()
  emit('groupChange')
}
</script>

<template>
  <section
    class="mm-commission-matrix-set"
    data-mm-commission-pricing-kind="matrix-set"
    :data-mm-commission-active-pricing-group="activePricingGroupId"
    :data-mm-commission-pricing-group-count="matrixSet.groups.length"
  >
    <CommissionPricingGroupTabs
      :groups="matrixSet.groups"
      :active-group-id="activePricingGroupId"
      :id-prefix="idPrefix"
      :mode="mode"
      @select="selectGroup"
    />

    <div
      :id="`${idPrefix}-pricing-group-panel`"
      class="mm-commission-pricing-group-panel"
      role="tabpanel"
      :aria-labelledby="`${idPrefix}-pricing-group-tab-${activePricingGroupId}`"
    >
      <CommissionPricingMatrix
        :key="activePricingGroupId"
        :pricing="activeMatrixPricing"
        :id-prefix="`${idPrefix}-${activePricingGroupId}`"
        :density="density"
        :header-projection="headerProjection"
        :accessible-title="activeAccessibleTitle"
      />
    </div>
  </section>
</template>
