<script setup lang="ts">
import {
  computed,
} from 'vue'

import CommissionPricingGroupGuidance from '~/components/commission/CommissionPricingGroupGuidance.vue'
import CommissionTermsList from '~/components/commission/CommissionTermsList.vue'

import type {
  CommissionPricingGuidanceItem,
  CommissionTerm,
} from '~~/shared/types/commission-guide'
import type {
  CommissionTermsProjection,
} from '~/types/commission-presentation'
import type {
  CommissionDetailDensity,
} from '~/utils/commission-detail-density'

interface Props {
  readonly sharedGuidanceHeading: string | null
  readonly sharedGuidanceItems: readonly CommissionPricingGuidanceItem[]
  readonly activeGuidanceHeading: string | null
  readonly activeGuidanceItems: readonly CommissionPricingGuidanceItem[]
  readonly additionalNote: string | null
  readonly terms: readonly CommissionTerm[]
  readonly commonNoticeHeading: string
  readonly density: CommissionDetailDensity
  readonly termsProjection: CommissionTermsProjection
  readonly mode: 'desktop' | 'mobile'
}

const props = defineProps<Props>()

const hasSharedGuidance = computed(() => (
  props.sharedGuidanceHeading !== null
  && props.sharedGuidanceItems.some(item => item.enabled)
))

const hasActiveGuidance = computed(() => (
  props.activeGuidanceHeading !== null
  && props.activeGuidanceItems.some(item => item.enabled)
))

const hasTerms = computed(() => (
  props.terms.some(term => term.enabled)
))
</script>

<template>
  <div
    class="mm-commission-detail-supplement-rail"
    :data-mm-supplement-mode="mode"
    :data-mm-supplement-density="density"
  >
    <CommissionPricingGroupGuidance
      v-if="hasSharedGuidance && sharedGuidanceHeading"
      :heading="sharedGuidanceHeading"
      :items="sharedGuidanceItems"
      :mode="mode"
    />

    <CommissionPricingGroupGuidance
      v-if="hasActiveGuidance && activeGuidanceHeading"
      :heading="activeGuidanceHeading"
      :items="activeGuidanceItems"
      :mode="mode"
    />

    <p
      v-if="additionalNote"
      class="mm-commission-service__additional-note"
    >
      {{ additionalNote }}
    </p>

    <CommissionTermsList
      v-if="hasTerms"
      :heading="commonNoticeHeading"
      :terms="terms"
      :density="density"
      :projection="termsProjection"
    />
  </div>
</template>
