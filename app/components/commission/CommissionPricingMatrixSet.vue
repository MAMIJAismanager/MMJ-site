<script setup lang="ts">
import {
  computed,
  nextTick,
  ref,
  watch,
} from 'vue'

import CommissionPricingGroupGuidance from '~/components/commission/CommissionPricingGroupGuidance.vue'
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

const showPricingGroupTabs = computed(() => (
  matrixSet.value.groups.length > 1
))

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
  showPricingGroupTabs.value
    ? `${props.serviceLabel} ${activeGroup.value.label} 기본 가격표`
    : `${props.serviceLabel} 기본 가격표`
))

const panelRole = computed(() => (
  showPricingGroupTabs.value ? 'tabpanel' : 'region'
))

const panelLabelledBy = computed(() => (
  showPricingGroupTabs.value
    ? `${props.idPrefix}-pricing-group-tab-${activePricingGroupId.value}`
    : undefined
))

const panelAriaLabel = computed(() => (
  showPricingGroupTabs.value
    ? undefined
    : activeAccessibleTitle.value
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
    :data-mm-commission-pricing-group-tabs-visible="showPricingGroupTabs ? 'true' : 'false'"
  >
    <CommissionPricingGroupTabs
      v-if="showPricingGroupTabs"
      :groups="matrixSet.groups"
      :active-group-id="activePricingGroupId"
      :id-prefix="idPrefix"
      :mode="mode"
      :service-label="serviceLabel"
      @select="selectGroup"
    />

    <div
      :id="`${idPrefix}-pricing-group-panel`"
      class="mm-commission-pricing-group-panel"
      :role="panelRole"
      :aria-labelledby="panelLabelledBy"
      :aria-label="panelAriaLabel"
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

    <CommissionPricingGroupGuidance
      v-if="pricing.sharedGuidanceHeading !== null && pricing.sharedGuidanceItems.length > 0"
      :heading="pricing.sharedGuidanceHeading"
      :items="pricing.sharedGuidanceItems"
      :mode="mode"
    />

    <CommissionPricingGroupGuidance
      heading="가격표 안내"
      :items="activeGroup.guidanceItems"
      :mode="mode"
    />
  </section>
</template>
