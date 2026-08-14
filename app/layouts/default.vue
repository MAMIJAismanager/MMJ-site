<script setup lang="ts">
import CrossMediaArbitrationProvider from '~/components/media/CrossMediaArbitrationProvider.vue'
import GlobalAudioDock from '~/components/player/GlobalAudioDock.vue'
import SiteFooter from '~/components/shell/SiteFooter.vue'
import SiteHeader from '~/components/shell/SiteHeader.vue'

import {
  useWorksLayoutProfile,
} from '~/composables/useWorksLayoutProfile'

const route = useRoute()

const {
  profile: worksLayoutProfile,
  ready: worksLayoutReady,
} = useWorksLayoutProfile()

const viewportComposition = computed(() => {
  const value = route.meta.viewportComposition

  if (
    value === 'home'
    || value === 'works'
    || value === 'info'
    || value === 'commission'
  ) {
    return value
  }

  return null
})

// R5: Works owns no shell viewport lock. One-screen fit must be proven by
// measured geometry, never created by shell height or overflow clipping.
const usesViewportComposition = computed(() => (
  viewportComposition.value !== null
  && viewportComposition.value !== 'works'
))

const showsSiteFooter = computed(() => (
  route.meta.hideSiteFooter !== true
))
</script>

<template>
  <CrossMediaArbitrationProvider>
    <div
      :class="[
        'mm-layout',
        {
          'mm-layout--viewport-locked': usesViewportComposition,
          [`mm-layout--viewport-${viewportComposition}`]: viewportComposition,
        },
      ]"
      data-mm-layout="default"
      :data-mm-works-layout-ready="
        viewportComposition === 'works'
          ? (worksLayoutReady ? 'true' : 'false')
          : undefined
      "
      :data-mm-works-viewport-authority="
        viewportComposition === 'works'
          ? 'natural-flow-r5'
          : undefined
      "
      :data-mm-works-layout-mode="
        viewportComposition === 'works'
          ? worksLayoutProfile.mode
          : undefined
      "
    >
      <a
        class="mm-skip-link"
        href="#main-content"
      >
        본문으로 건너뛰기
      </a>

      <SiteHeader />

      <main
        id="main-content"
        class="mm-main"
        tabindex="-1"
      >
        <slot />
      </main>

      <GlobalAudioDock />

      <SiteFooter v-if="showsSiteFooter" />
    </div>
  </CrossMediaArbitrationProvider>
</template>
