<script setup lang="ts">
definePageMeta({
  hideSiteFooter: true,
  viewportComposition: 'info',
})

import ContactForm from '~/components/contact/ContactForm.vue'
import InfoPageSurface from '~/components/info/InfoPageSurface.vue'
import { SITE_INFORMATION } from '~/content/site-information'

const contact = SITE_INFORMATION.contact

useSeoMeta({
  title: contact.seoTitle,
  description: contact.seoDescription,
  robots: 'index,follow',
})
</script>

<template>
  <InfoPageSurface
    class="mm-contact-page-surface"
    page="contact"
    :eyebrow="contact.eyebrow"
    :title="contact.title"
    :lead="contact.lead"
  >
    <section
      class="mm-info-section mm-contact-section"
      data-mm-contact-section
    >
      <h2 class="mm-info-section__title">
        {{ contact.formHeading }}
      </h2>
      <p class="mm-info-section__body">
        {{ contact.formDescription }}
      </p>

      <ContactForm :content="contact" />
    </section>

    <nav
      class="mm-info-actions"
      aria-label="문의 페이지 이동"
      data-mm-info-actions
    >
      <NuxtLink
        class="mm-info-action mm-info-action--secondary"
        to="/works"
      >
        {{ contact.worksLinkLabel }}
      </NuxtLink>
    </nav>
  </InfoPageSurface>
</template>

<style scoped>
@media (min-width: 80rem) and (min-height: 45rem) {
  .mm-contact-page-surface :deep(.mm-info-page__body) {
    grid-template-rows: auto auto;
    align-content: start;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
    padding-block-end: var(--mm-space-6);
  }

  .mm-contact-page-surface :deep(.mm-contact-section) {
    height: auto;
    min-height: 0;
  }
}
</style>
