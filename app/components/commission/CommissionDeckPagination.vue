<script setup lang="ts">
import type {
  CommissionService,
  CommissionServiceId,
} from '~~/shared/types/commission-guide'

interface Props {
  readonly services: readonly CommissionService[]
  readonly activeServiceId: CommissionServiceId
}

defineProps<Props>()
</script>

<template>
  <div
    class="mm-commission-deck-pagination"
    aria-hidden="true"
  >
    <span
      v-for="service in services"
      :key="service.id"
      :data-active="service.id === activeServiceId ? 'true' : 'false'"
    />
  </div>
</template>
