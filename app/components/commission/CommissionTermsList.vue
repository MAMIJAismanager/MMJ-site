<script setup lang="ts">
import type {
  CommissionTerm,
} from '~~/shared/types/commission-guide'

interface Props {
  readonly heading: string
  readonly terms: readonly CommissionTerm[]
}

defineProps<Props>()
</script>

<template>
  <section
    class="mm-commission-terms"
    data-mm-commission-terms
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
          <span v-if="term.description">
            {{ term.description }}
          </span>
        </span>
      </li>
    </ul>
  </section>
</template>
