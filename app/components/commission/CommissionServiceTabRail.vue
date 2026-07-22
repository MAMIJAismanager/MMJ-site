<script setup lang="ts">
import {
  nextTick,
  watch,
} from 'vue'

import type {
  ComponentPublicInstance,
} from 'vue'
import type {
  CommissionService,
  CommissionServiceId,
} from '~~/shared/types/commission-guide'

interface Props {
  readonly services: readonly CommissionService[]
  readonly activeServiceId: CommissionServiceId
  readonly idPrefix: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  select: [serviceId: CommissionServiceId, source: 'tab' | 'keyboard']
}>()

const tabElements = new Map<CommissionServiceId, HTMLButtonElement>()

function setTabElement(
  serviceId: CommissionServiceId,
  element: Element | ComponentPublicInstance | null,
): void {
  if (element instanceof HTMLButtonElement) {
    tabElements.set(serviceId, element)
    return
  }
  tabElements.delete(serviceId)
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

async function alignActiveTab(serviceId: CommissionServiceId): Promise<void> {
  if (typeof window === 'undefined') return
  await nextTick()
  tabElements.get(serviceId)?.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'nearest',
    inline: 'center',
  })
}

function selectByIndex(index: number): void {
  const service = props.services[index]
  if (service === undefined) return
  emit('select', service.id, 'keyboard')
}

function handleKeydown(event: KeyboardEvent): void {
  const currentIndex = props.services.findIndex(
    service => service.id === props.activeServiceId,
  )
  if (currentIndex < 0) return

  switch (event.key) {
    case 'ArrowRight':
      event.preventDefault()
      selectByIndex(Math.min(props.services.length - 1, currentIndex + 1))
      break
    case 'ArrowLeft':
      event.preventDefault()
      selectByIndex(Math.max(0, currentIndex - 1))
      break
    case 'Home':
      event.preventDefault()
      selectByIndex(0)
      break
    case 'End':
      event.preventDefault()
      selectByIndex(props.services.length - 1)
      break
  }
}

watch(
  () => props.activeServiceId,
  serviceId => {
    void alignActiveTab(serviceId)
  },
  { immediate: true },
)

function focusActiveTab(serviceId: CommissionServiceId): void {
  tabElements.get(serviceId)?.focus({ preventScroll: true })
}

defineExpose({
  alignActiveTab,
  focusActiveTab,
})
</script>

<template>
  <nav
    class="mm-commission-mobile-tabs"
    role="tablist"
    aria-label="의뢰 서비스"
    @keydown="handleKeydown"
  >
    <button
      v-for="service in services"
      :id="`${idPrefix}-tab-${service.id}`"
      :key="service.id"
      :ref="element => setTabElement(service.id, element)"
      class="mm-commission-mobile-tab"
      type="button"
      role="tab"
      :aria-selected="activeServiceId === service.id"
      :aria-controls="`${idPrefix}-panel-${service.id}`"
      :tabindex="activeServiceId === service.id ? 0 : -1"
      @click="emit('select', service.id, 'tab')"
    >
      {{ service.label }}
    </button>
  </nav>
</template>
