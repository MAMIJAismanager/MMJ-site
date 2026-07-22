<script setup lang="ts">
definePageMeta({
  hideSiteFooter: true,
  viewportComposition: 'commission',
})

import CommissionServiceExplorer from '~/components/commission/CommissionServiceExplorer.vue'
import InfoPageSurface from '~/components/info/InfoPageSurface.vue'
import {
  commissionGuide,
  enabledCommissionServices,
  enabledCommissionTerms,
} from '~/data/commission-guide'

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
  >
    <CommissionServiceExplorer
      :heading="commissionGuide.sectionHeading"
      :services="enabledCommissionServices"
      :terms="enabledCommissionTerms"
      :common-notice-heading="commissionGuide.commonNoticeHeading"
    />

    <footer
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
