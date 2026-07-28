<script setup lang="ts">
import {
  nextTick,
  ref,
} from 'vue'

import type {
  ComponentPublicInstance,
} from 'vue'
import type {
  CommissionPricingRowId,
} from '~~/shared/types/commission-guide'

interface RowTabItem {
  readonly id: CommissionPricingRowId
  readonly label: string
  readonly shortLabel: string | null
}

interface Props {
  readonly rows: readonly RowTabItem[]
  readonly activeRowId: CommissionPricingRowId
  readonly idPrefix: string
  readonly accessibleTitle: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  select: [rowId: CommissionPricingRowId]
}>()

const tabElements = new Map<CommissionPricingRowId, HTMLButtonElement>()
const tabListElement = ref<HTMLElement | null>(null)

function setTabElement(
  rowId: CommissionPricingRowId,
  element: Element | ComponentPublicInstance | null,
): void {
  if (element instanceof HTMLButtonElement) {
    tabElements.set(rowId, element)
    return
  }
  tabElements.delete(rowId)
}

async function selectByIndex(index: number): Promise<void> {
  const row = props.rows[index]
  if (row === undefined) return
  emit('select', row.id)
  await nextTick()
  tabElements.get(row.id)?.focus({ preventScroll: true })
}

function handleKeydown(event: KeyboardEvent): void {
  const currentIndex = props.rows.findIndex(row => row.id === props.activeRowId)
  if (currentIndex < 0) return

  switch (event.key) {
    case 'ArrowRight':
      event.preventDefault()
      void selectByIndex(Math.min(props.rows.length - 1, currentIndex + 1))
      break
    case 'ArrowLeft':
      event.preventDefault()
      void selectByIndex(Math.max(0, currentIndex - 1))
      break
    case 'Home':
      event.preventDefault()
      void selectByIndex(0)
      break
    case 'End':
      event.preventDefault()
      void selectByIndex(props.rows.length - 1)
      break
  }
}
</script>

<template>
  <div
    ref="tabListElement"
    class="mm-commission-pricing-row-tabs"
    role="tablist"
    :aria-label="`${accessibleTitle} 참여 인원 선택`"
    data-mm-commission-swipe-ignore
    @keydown="handleKeydown"
  >
    <button
      v-for="row in rows"
      :id="`${idPrefix}-row-tab-${row.id}`"
      :key="row.id"
      :ref="element => setTabElement(row.id, element)"
      class="mm-commission-pricing-row-tab"
      type="button"
      role="tab"
      :aria-selected="row.id === activeRowId"
      :aria-controls="`${idPrefix}-row-panel`"
      :tabindex="row.id === activeRowId ? 0 : -1"
      @click="emit('select', row.id)"
    >
      {{ row.shortLabel ?? row.label }}
    </button>
  </div>
</template>
