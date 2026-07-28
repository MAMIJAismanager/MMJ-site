<script setup lang="ts">
import {
  ref,
} from 'vue'

import CommissionServiceExplorer from '~/components/commission/CommissionServiceExplorer.vue'
import InfoPageSurface from '~/components/info/InfoPageSurface.vue'
import {
  useCommissionViewportMode,
} from '~/composables/useCommissionViewportMode'
import {
  commissionGuide,
  enabledCommissionServices,
  enabledCommissionTerms,
} from '~/data/commission-guide'

definePageMeta({
  hideSiteFooter: true,
  viewportComposition: 'commission',
})

const {
  viewportMode,
} = useCommissionViewportMode()

const commissionDetailActive = ref(false)

useSeoMeta({
  title: commissionGuide.seoTitle,
  description: commissionGuide.seoDescription,
})
</script>

<template>
  <InfoPageSurface
    page="commission"
    :eyebrow="commissionGuide.eyebrow"
    :title="commissionGuide.title"
    :lead="commissionGuide.lead"
    :detail-active="commissionDetailActive"
  >
    <CommissionServiceExplorer
      :heading="commissionGuide.sectionHeading"
      :services="enabledCommissionServices"
      :terms="enabledCommissionTerms"
      :common-notice-heading="commissionGuide.commonNoticeHeading"
      :viewport-mode="viewportMode"
      @detail-active-change="commissionDetailActive = $event"
    />

    <footer
      v-if="viewportMode === 'desktop'"
      class="mm-commission-utility-dock"
      data-mm-commission-utility-dock
    >
      <nav
        class="mm-info-actions"
        aria-label="의뢰 안내 페이지 이동"
        data-mm-info-actions
      >
        <NuxtLink
          class="mm-info-action mm-info-action--secondary"
          to="/works"
        >
          {{ commissionGuide.worksLinkLabel }}
        </NuxtLink>
        <NuxtLink
          class="mm-info-action mm-info-action--primary"
          to="/contact"
        >
          {{ commissionGuide.contactLinkLabel }}
        </NuxtLink>
      </nav>
    </footer>
  </InfoPageSurface>
</template>
