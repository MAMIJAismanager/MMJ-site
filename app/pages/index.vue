<script setup lang="ts">
definePageMeta({
  hideSiteFooter: true,
  viewportComposition: 'home',
})

import ProjectShowcaseRail from '~/components/showcase/ProjectShowcaseRail.vue'

import {
  createHomeShowcasePreview,
} from '~/data/home-showcase-preview'
import {
  featuredShowcaseViews,
} from '~/data/portfolio-project-views'

const showcasePreviewProjects = createHomeShowcasePreview(
  featuredShowcaseViews,
)
</script>

<template>
  <section
    class="mm-page mm-home-page"
    data-mm-page="home"
  >
    <header class="mm-page__header">
      <h1
        class="mm-display-title"
        data-mm-title-probe
      >
        매미: 著
      </h1>
    </header>

    <ProjectShowcaseRail
      :projects="showcasePreviewProjects"
    />
  </section>
</template>

<style src="~/assets/css/home-page.css"></style>
