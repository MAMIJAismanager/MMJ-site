<script setup lang="ts">
definePageMeta({
  hideSiteFooter: true,
  viewportComposition: 'home',
})

import ProjectShowcaseRail from '~/components/showcase/ProjectShowcaseRail.vue'

import {
  createHomeShowcasePreview,
} from '~/data/home-showcase-preview'

const showcasePreviewProjects = createHomeShowcasePreview()
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
