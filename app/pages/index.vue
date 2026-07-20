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
  <div
    class="mm-page mm-home-page"
    data-mm-page="home"
  >
    <ProjectShowcaseRail
      :projects="showcasePreviewProjects"
    />
  </div>
</template>

<style src="~/assets/css/home-page.css"></style>
