<script setup lang="ts">
import CommissionDesktopWorkspace from '~/components/commission/CommissionDesktopWorkspace.vue'
import CommissionMobileServiceDeck from '~/components/commission/CommissionMobileServiceDeck.vue'

import type {
  CommissionService,
  CommissionTerm,
} from '~~/shared/types/commission-guide'
import type {
  CommissionViewportMode,
} from '~/utils/commission-layout-planner'

interface Props {
  readonly heading: string
  readonly services: readonly CommissionService[]
  readonly terms: readonly CommissionTerm[]
  readonly commonNoticeHeading: string
  readonly viewportMode: CommissionViewportMode
}

defineProps<Props>()
</script>

<template>
  <section
    class="mm-commission-explorer"
    aria-labelledby="mm-commission-services-heading"
    data-mm-commission-explorer
  >
    <h2
      id="mm-commission-services-heading"
      class="mm-info-section__title"
    >
      {{ heading }}
    </h2>

    <CommissionDesktopWorkspace
      :services="services"
      :terms="terms"
      :common-notice-heading="commonNoticeHeading"
      :viewport-mode="viewportMode"
    />

    <CommissionMobileServiceDeck
      :services="services"
      :terms="terms"
      :common-notice-heading="commonNoticeHeading"
    />
  </section>
</template>

<style src="~/assets/css/commission-guide.css"></style>
