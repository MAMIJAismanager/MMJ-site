<script setup lang="ts">
import type {
  CommissionPriceDisplay,
} from '~/types/commission-price-display'

interface Props {
  readonly display: CommissionPriceDisplay
}

defineProps<Props>()
</script>

<template>
  <strong
    v-if="display.kind === 'numeric'"
    class="mm-commission-price-token"
    :aria-label="display.accessibleLabel"
    :data-has-optical-suffix="display.opticalSuffix !== null ? 'true' : 'false'"
  >
    <span
      class="mm-commission-price-token__core"
      aria-hidden="true"
    >
      {{ display.core }}
    </span>
    <span
      v-if="display.opticalSuffix !== null"
      class="mm-commission-price-token__optical-suffix"
      aria-hidden="true"
    >{{ display.opticalSuffix }}</span>
  </strong>

  <strong
    v-else
    class="mm-commission-price-token mm-commission-price-token--text"
    :aria-label="display.accessibleLabel"
  >
    <span aria-hidden="true">{{ display.text }}</span>
  </strong>
</template>
