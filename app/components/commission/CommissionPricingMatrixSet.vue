<script setup lang="ts">
import {
  computed,
  nextTick,
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
  CommissionMobileMatrixRowProjection,
  CommissionPricingRowTabLayout,
} from '~/types/commission-presentation'
import type {
  CommissionDetailDensity,
} from '~/utils/commission-detail-density'

interface Props {
  readonly pricing: CommissionMatrixSetPricing
  readonly activeGroupId: CommissionPricingGroupId
  readonly idPrefix: string
  readonly density: CommissionDetailDensity
  readonly mode: 'desktop' | 'mobile'
  readonly serviceLabel: string
  readonly mobileRowProjection: CommissionMobileMatrixRowProjection
  readonly mobileRowTabLayout: CommissionPricingRowTabLayout
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:activeGroupId': [groupId: CommissionPricingGroupId]
  groupChange: [groupId: CommissionPricingGroupId]
  rowChange: []
}>()

const matrixSet = computed(() => (
  createCommissionPricingMatrixSetView(props.pricing)
))

const showPricingGroupTabs = computed(() => (
  matrixSet.value.groups.length > 1
))

const activeGroup = computed(() => {
  const group = matrixSet.value.groups.find(candidate => (
    candidate.id === props.activeGroupId
  ))
  if (group === undefined) {
    throw new TypeError(
      `commission-pricing-active-group-missing:${props.activeGroupId}`,
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
    ? `${props.idPrefix}-pricing-group-tab-${props.activeGroupId}`
    : undefined
))

const panelAriaLabel = computed(() => (
  showPricingGroupTabs.value
    ? undefined
    : activeAccessibleTitle.value
))

async function selectGroup(groupId: CommissionPricingGroupId): Promise<void> {
  if (groupId === props.activeGroupId) return
  const exists = matrixSet.value.groups.some(group => group.id === groupId)
  if (!exists) {
    throw new TypeError(`commission-pricing-group-unknown:${groupId}`)
  }

  emit('update:activeGroupId', groupId)
  await nextTick()
  emit('groupChange', groupId)
}
</script>

<template>
  <section
    class="mm-commission-matrix-set"
    data-mm-commission-pricing-kind="matrix-set"
    :data-mm-commission-active-pricing-group="activeGroupId"
    :data-mm-commission-pricing-group-count="matrixSet.groups.length"
    :data-mm-commission-pricing-group-tabs-visible="showPricingGroupTabs ? 'true' : 'false'"
  >
    <CommissionPricingGroupTabs
      v-if="showPricingGroupTabs"
      :groups="matrixSet.groups"
      :active-group-id="activeGroupId"
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
        :key="activeGroupId"
        :pricing="activeMatrixPricing"
        :id-prefix="`${idPrefix}-${activeGroupId}`"
        :density="density"
        :header-projection="headerProjection"
        :accessible-title="activeAccessibleTitle"
        :mobile-row-projection="mobileRowProjection"
        :mobile-row-tab-layout="mobileRowTabLayout"
        @row-change="emit('rowChange')"
      />
    </div>
  </section>
</template>
