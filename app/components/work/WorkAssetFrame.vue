<script setup lang="ts">
import { computed } from 'vue'

import AudioInlinePlayer from '~/components/player/AudioInlinePlayer.vue'
import MediaFrame from '~/components/media/MediaFrame.vue'
import VideoPlayer from '~/components/media/VideoPlayer.vue'
import {
  resolvePortfolioAudioTrack,
  resolvePortfolioImagePresentation,
  resolvePortfolioVideoPresentation,
} from '~/data/portfolio-media-presentation'
import {
  createWorkDetailImageOptions,
  createWorkDetailThumbnailImageOptions,
} from '~~/shared/resolver/work-detail-presentation-plan'
import {
  classifyWorkDetailFrameImageAccessibilityContext,
} from '~~/shared/resolver/accessible-description-resolution'

import type { ProjectId } from '~~/shared/types/domain-identifiers'
import type { VideoGeometryConstraint } from '~/video/video-geometry-profile'
import type {
  ResolvedAssetReference,
  ResolvedImageAssetReference,
  WorkDetailView,
} from '~~/shared/view/portfolio-project-view'

interface Props {
  readonly project: WorkDetailView
  readonly asset: ResolvedAssetReference
  readonly contextLabel: string
  readonly projectId?: ProjectId
  readonly videoRuntime?: 'disabled' | 'primary-detail'
  readonly audioRuntime?: 'disabled' | 'primary-detail'
  readonly captionMode?: 'editorial' | 'none'
  readonly imageIntent?: 'primary' | 'thumbnail'
  readonly mediaMaxInlinePx?: number
  readonly mediaMaxBlockPx?: number
}

const props = withDefaults(defineProps<Props>(), {
  projectId: undefined,
  videoRuntime: 'disabled',
  audioRuntime: 'disabled',
  captionMode: 'editorial',
  imageIntent: 'primary',
})

const previewAsset = computed<ResolvedImageAssetReference | null>(() => {
  switch (props.asset.kind) {
    case 'image':
      return props.asset
    case 'video':
      return props.asset.poster
    case 'audio':
      return props.asset.artwork
  }
})

const frameRatio = computed(() => {
  const preview = previewAsset.value
  if (preview !== null) {
    return Object.freeze({
      width: preview.defaultRendition.metadata.width,
      height: preview.defaultRendition.metadata.height,
    })
  }
  if (props.asset.kind === 'video') {
    return Object.freeze({
      width: props.asset.defaultRendition.metadata.width,
      height: props.asset.defaultRendition.metadata.height,
    })
  }
  return Object.freeze({ width: 1, height: 1 })
})

const imagePlan = computed(() => {
  const preview = previewAsset.value
  if (preview === null) return null

  if (props.imageIntent === 'thumbnail') {
    return resolvePortfolioImagePresentation(
      preview,
      'thumbnail',
      createWorkDetailThumbnailImageOptions(),
    )
  }

  return resolvePortfolioImagePresentation(
    preview,
    'primary',
    createWorkDetailImageOptions(
      props.project,
      preview,
      classifyWorkDetailFrameImageAccessibilityContext(
        props.asset.kind,
        props.videoRuntime === 'primary-detail'
          || props.audioRuntime === 'primary-detail',
      ),
      props.videoRuntime === 'primary-detail'
        || props.audioRuntime === 'primary-detail'
        ? 'primary'
        : 'gallery',
    ),
  )
})

const videoPresentation = computed(() => {
  if (
    props.videoRuntime !== 'primary-detail'
    || props.asset.kind !== 'video'
  ) {
    return null
  }
  return resolvePortfolioVideoPresentation(props.asset)
})

const videoGeometryConstraint = computed<VideoGeometryConstraint | undefined>(() => {
  if (
    videoPresentation.value === null
    || props.mediaMaxInlinePx === undefined
    || props.mediaMaxBlockPx === undefined
  ) return undefined

  return Object.freeze({
    maxInlinePx: props.mediaMaxInlinePx,
    maxBlockPx: props.mediaMaxBlockPx,
  })
})

const audioTrack = computed(() => {
  if (
    props.audioRuntime !== 'primary-detail'
    || props.asset.kind !== 'audio'
    || props.projectId === undefined
  ) {
    return null
  }
  return resolvePortfolioAudioTrack(props.asset, props.projectId)
})

const audioArtworkState = computed(() => {
  if (props.asset.kind !== 'audio') return undefined
  return props.asset.artwork === null ? 'fallback' : 'present'
})

const frameStateLabel = computed(() => {
  if (props.asset.kind === 'audio' && props.asset.artwork === null) return 'AUDIO'
  switch (props.asset.kind) {
    case 'image': return '이미지 영역'
    case 'video': return '영상 영역'
    case 'audio': return '오디오 영역'
  }
})

const hasEditorialCaption = computed(() => (
  props.captionMode === 'editorial'
  && (props.asset.caption !== null || props.asset.credit !== null)
))
</script>

<template>
  <figure
    class="mm-work-asset-frame"
    data-mm-work-asset-frame
    :data-mm-work-asset-context="contextLabel"
    :data-mm-work-asset-kind="asset.kind"
    :data-mm-work-asset-id="asset.id"
    :data-mm-work-image-intent="imageIntent"
    :data-mm-work-audio-artwork="audioArtworkState"
    :data-mm-video-runtime="videoRuntime"
    :data-mm-audio-runtime="audioRuntime"
  >
    <VideoPlayer
      v-if="videoPresentation !== null"
      :presentation="videoPresentation"
      :geometry-constraint="videoGeometryConstraint"
    />
    <MediaFrame
      v-else
      class="mm-work-asset-frame__surface mm-dark-surface"
      :image-plan="imagePlan"
      :frame-ratio="frameRatio"
      :state-label="frameStateLabel"
    />

    <AudioInlinePlayer
      v-if="audioTrack !== null"
      :track="audioTrack"
    />

    <figcaption
      v-if="hasEditorialCaption"
      class="mm-work-asset-frame__caption"
    >
      <p
        v-if="asset.caption !== null"
        class="mm-work-asset-frame__editorial"
      >
        {{ asset.caption }}
      </p>
      <p
        v-if="asset.credit !== null"
        class="mm-work-asset-frame__credit"
      >
        {{ asset.credit }}
      </p>
    </figcaption>
  </figure>
</template>
