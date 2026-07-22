<script setup lang="ts">
import {
  nextTick,
} from 'vue'

import type {
  CommissionMatrixPricingGroup,
  CommissionPricingGroupId,
} from '~~/shared/types/commission-guide'

interface Props {
  readonly groups: readonly CommissionMatrixPricingGroup[]
  readonly activeGroupId: CommissionPricingGroupId
  readonly idPrefix: string
  readonly mode: 'desktop' | 'mobile'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [groupId: CommissionPricingGroupId]
}>()

function tabId(groupId: CommissionPricingGroupId): string {
  return `${props.idPrefix}-pricing-group-tab-${groupId}`
}

function selectGroup(groupId: CommissionPricingGroupId): void {
  emit('select', groupId)
}

async function focusGroup(groupId: CommissionPricingGroupId): Promise<void> {
  await nextTick()
  document.getElementById(tabId(groupId))?.focus()
}

function moveFocus(
  currentGroupId: CommissionPricingGroupId,
  direction: 'previous' | 'next' | 'first' | 'last',
): void {
  const currentIndex = props.groups.findIndex(group => (
    group.id === currentGroupId
  ))
  if (currentIndex < 0 || props.groups.length === 0) return

  let targetIndex = currentIndex
  if (direction === 'first') targetIndex = 0
  if (direction === 'last') targetIndex = props.groups.length - 1
  if (direction === 'previous') {
    targetIndex = (currentIndex - 1 + props.groups.length) % props.groups.length
  }
  if (direction === 'next') {
    targetIndex = (currentIndex + 1) % props.groups.length
  }

  const target = props.groups[targetIndex]
  if (target === undefined) return
  emit('select', target.id)
  void focusGroup(target.id)
}

function handleKeydown(
  event: KeyboardEvent,
  groupId: CommissionPricingGroupId,
): void {
  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault()
      moveFocus(groupId, 'previous')
      break

    case 'ArrowRight':
      event.preventDefault()
      moveFocus(groupId, 'next')
      break

    case 'Home':
      event.preventDefault()
      moveFocus(groupId, 'first')
      break

    case 'End':
      event.preventDefault()
      moveFocus(groupId, 'last')
      break
  }
}
</script>

<template>
  <div
    class="mm-commission-pricing-groups"
    role="tablist"
    aria-label="작사/작곡 가격 구분"
    :data-mm-commission-pricing-group-mode="mode"
  >
    <button
      v-for="group in groups"
      :id="tabId(group.id)"
      :key="group.id"
      class="mm-commission-pricing-group-tab"
      type="button"
      role="tab"
      :aria-selected="group.id === activeGroupId"
      :aria-controls="`${idPrefix}-pricing-group-panel`"
      :tabindex="group.id === activeGroupId ? 0 : -1"
      @click="selectGroup(group.id)"
      @keydown="handleKeydown($event, group.id)"
    >
      {{ mode === 'mobile' ? group.shortLabel : group.label }}
    </button>
  </div>
</template>
