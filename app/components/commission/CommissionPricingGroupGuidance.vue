<script setup lang="ts">
import {
  computed,
} from 'vue'

import type {
  CommissionPricingGuidanceItem,
} from '~~/shared/types/commission-guide'

interface Props {
  readonly heading: string
  readonly items: readonly CommissionPricingGuidanceItem[]
  readonly mode: 'desktop' | 'mobile'
}

const props = defineProps<Props>()

const visibleItems = computed(() => (
  props.items
    .filter(item => item.enabled)
    .toSorted((left, right) => left.order - right.order)
))
</script>

<template>
  <section
    v-if="visibleItems.length > 0"
    class="mm-commission-pricing-guidance"
    :data-mm-guidance-count="visibleItems.length"
    :data-mm-guidance-mode="mode"
  >
    <h3 class="mm-commission-pricing-guidance__heading">
      {{ heading }}
    </h3>

    <dl class="mm-commission-pricing-guidance__list">
      <div
        v-for="item in visibleItems"
        :key="item.id"
        class="mm-commission-pricing-guidance__item"
      >
        <dt>{{ item.label }}</dt>
        <dd>{{ item.description }}</dd>
      </div>
    </dl>
  </section>
</template>
