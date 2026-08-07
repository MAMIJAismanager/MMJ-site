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
