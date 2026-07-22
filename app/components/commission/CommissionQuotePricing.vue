<script setup lang="ts">
import type {
  CommissionQuotePricing,
} from '~~/shared/types/commission-guide'

interface Props {
  readonly pricing: CommissionQuotePricing
}

defineProps<Props>()
</script>

<template>
  <section
    class="mm-commission-quote-pricing"
    data-mm-commission-pricing-kind="quote"
  >
    <h3 class="mm-commission-service__subheading">
      기본 견적
    </h3>
    <strong class="mm-commission-quote-pricing__label">
      {{ pricing.displayLabel }}
    </strong>
    <p
      v-if="pricing.note"
      class="mm-commission-quote-pricing__note"
    >
      {{ pricing.note }}
    </p>
  </section>
</template>
