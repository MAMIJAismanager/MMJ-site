<script setup lang="ts">
definePageMeta({
  hideSiteFooter: true,
})

import {
  findWorkDetailViewBySlug,
} from '~/data/portfolio-project-views'

import WorkAssetFrame from '~/components/work/WorkAssetFrame.vue'
import WorkCredits from '~/components/work/WorkCredits.vue'
import WorkDescription from '~/components/work/WorkDescription.vue'
import WorkDetailHeader from '~/components/work/WorkDetailHeader.vue'
import WorkExternalLinks from '~/components/work/WorkExternalLinks.vue'
import WorkGallery from '~/components/work/WorkGallery.vue'
import WorkRelatedProjects from '~/components/work/WorkRelatedProjects.vue'

import {
  useWorkDetailLayoutProfile,
} from '~/composables/useWorkDetailLayoutProfile'
import {
  useWorkReturnTarget,
} from '~/composables/useWorkReturnTarget'

const route = useRoute()
const requestedSlug = route.params.slug

if (
  typeof requestedSlug !== 'string'
  || requestedSlug.length === 0
) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Work not found',
  })
}

const project = findWorkDetailViewBySlug(requestedSlug)

if (project === null) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Work not found',
  })
}

const primaryMediaGeometry = (() => {
  const primary = project.assets.primary
  if (primary === null) return null

  switch (primary.kind) {
    case 'image':
    case 'video':
      return Object.freeze({
        width: primary.defaultRendition.metadata.width,
        height: primary.defaultRendition.metadata.height,
      })
    case 'audio': {
      const artwork = primary.artwork
      if (artwork === null) {
        return Object.freeze({ width: 1, height: 1 })
      }
      return Object.freeze({
        width: artwork.defaultRendition.metadata.width,
        height: artwork.defaultRendition.metadata.height,
      })
    }
  }
})()

const workDetailLayout = useWorkDetailLayoutProfile({
  hasPrimaryMedia: project.assets.primary !== null,
  primaryMedia: primaryMediaGeometry,
})
const layoutProfile = workDetailLayout.profile
const layoutStyle = workDetailLayout.style

const returnTarget = useWorkReturnTarget(project.id)
const runtimeConfig = useRuntimeConfig()
const mediaBaseUrl = String(runtimeConfig.public.mmjMediaBaseUrl ?? '').replace(/\/+$/, '')
const ogObjectKey = project.seo.ogAsset?.defaultRendition.objectKey ?? null
const ogImageUrl = mediaBaseUrl && ogObjectKey
  ? `${mediaBaseUrl}/${ogObjectKey}`
  : undefined

useSeoMeta({
  title: project.seo.title,
  description: project.seo.description,
  robots: project.seo.indexable
    ? 'index,follow'
    : 'noindex,nofollow',
  ogTitle: project.seo.title,
  ogDescription: project.seo.description,
  ogImage: ogImageUrl,
  twitterCard: ogImageUrl ? 'summary_large_image' : 'summary',
})
</script>

<template>
  <article
    class="mm-work-detail"
    data-mm-page="work-detail"
    :data-mm-work-slug="project.slug"
    :data-mm-work-id="project.id"
    :data-mm-work-detail-layout="layoutProfile.mode"
    :data-mm-work-detail-density="layoutProfile.density"
    :data-mm-work-detail-core-fit="layoutProfile.coreViewportFit ? 'true' : 'false'"
    :style="layoutStyle"
  >
    <section
      class="mm-work-detail-core"
      data-mm-work-detail-core
      :data-mm-work-detail-core-layout="layoutProfile.mode"
    >
      <div class="mm-work-detail-core__copy">
        <WorkDetailHeader :project="project" />
        <WorkDescription :description="project.description" />
      </div>

      <section
        v-if="project.assets.primary !== null"
        class="mm-work-section mm-work-primary"
        data-mm-work-primary
      >
        <h2 class="mm-work-section__title">
          주요 미디어
        </h2>
        <WorkAssetFrame
          :project="project"
          :asset="project.assets.primary"
          :project-id="project.id"
          context-label="주요 미디어"
          video-runtime="primary-detail"
          audio-runtime="primary-detail"
          caption-mode="none"
          :media-max-inline-px="layoutProfile.mediaMaxInlinePx"
          :media-max-block-px="layoutProfile.mediaMaxBlockPx"
        />
      </section>
    </section>

    <div
      class="mm-work-detail-extended"
      data-mm-work-detail-extended
    >
      <WorkGallery
        :project="project"
        :assets="project.assets.gallery"
      />
      <WorkCredits :groups="project.credits" />
      <WorkExternalLinks :links="project.externalLinks" />
      <WorkRelatedProjects :projects="project.relatedProjects" />

      <footer class="mm-work-detail__footer">
        <NuxtLink
          class="mm-work-detail__all-works"
          :to="returnTarget.href"
          data-mm-work-return-link
          :data-mm-return-origin="returnTarget.origin"
          :data-mm-return-uses-memory="returnTarget.usesMemory ? 'true' : 'false'"
        >
          {{ returnTarget.label }}
        </NuxtLink>
      </footer>
    </div>
  </article>
</template>

<style src="~/assets/css/work-detail.css"></style>
