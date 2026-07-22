<script setup lang="ts">
import type {
  CommissionTerm,
} from '~~/shared/types/commission-guide'
import type {
  CommissionTermsProjection,
} from '~/types/commission-presentation'
import type {
  CommissionDetailDensity,
} from '~/utils/commission-detail-density'

interface Props {
  readonly heading: string
  readonly terms: readonly CommissionTerm[]
  readonly density?: CommissionDetailDensity
  readonly projection?: CommissionTermsProjection
}

withDefaults(defineProps<Props>(), {
  density: 'comfortable',
  projection: 'full',
})
</script>

<template>
  <section
    class="mm-commission-terms"
    data-mm-commission-terms
    :data-mm-commission-density="density"
    :data-mm-terms-projection="projection"
  >
    <h3 class="mm-commission-terms__heading">
      {{ heading }}
    </h3>
    <ul class="mm-commission-terms__list">
      <li
        v-for="term in terms"
        :key="term.id"
        class="mm-commission-term"
        :data-mm-commission-term-icon="term.iconKey ?? 'none'"
      >
        <span
          class="mm-commission-term__mark"
          aria-hidden="true"
        >✓</span>
        <span class="mm-commission-term__copy">
          <strong>{{ term.label }}</strong>
          <span
            v-if="projection === 'full' && density === 'comfortable' && term.description"
          >
            {{ term.description }}
          </span>
        </span>
      </li>
    </ul>
  </section>
</template>
