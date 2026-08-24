<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type {
  ResolvedAssetReference,
  WorkDetailView,
} from '~~/shared/view/portfolio-project-view'
import type {
  WorkDetailGalleryPresentationR1,
} from '~~/shared/resolver/work-detail-gallery-presentation'

import WorkAssetFrame from './WorkAssetFrame.vue'

interface Props {
  readonly project: WorkDetailView
  readonly presentation: WorkDetailGalleryPresentationR1
  readonly mediaMaxInlinePx?: number
  readonly mediaMaxBlockPx?: number
}

const props = defineProps<Props>()

const activeAssetId = ref(props.presentation.canonicalHero.id)

watch(
  () => [props.project.id, props.presentation.canonicalHero.id] as const,
  () => {
    activeAssetId.value = props.presentation.canonicalHero.id
  },
)

const activeAsset = computed<ResolvedAssetReference>(() => {
  if (activeAssetId.value === props.presentation.canonicalHero.id) {
    return props.presentation.canonicalHero
  }
  return props.presentation.thumbnails.find(
    asset => asset.id === activeAssetId.value,
  ) ?? props.presentation.canonicalHero
})

const isCanonicalHeroActive = computed(() => (
  activeAsset.value.id === props.presentation.canonicalHero.id
))

function selectSecondary(assetId: string): void {
  activeAssetId.value = assetId
}

function restoreCanonicalHero(): void {
  activeAssetId.value = props.presentation.canonicalHero.id
}

function thumbnailControlLabel(
  asset: ResolvedAssetReference,
  index: number,
): string {
  const prefix = `보조 미디어 ${index + 1}`
  return asset.caption === null
    ? `${prefix} 보기`
    : `${prefix}: ${asset.caption}`
}
</script>

<template>
  <div
    class="mm-work-gallery"
    data-mm-work-gallery
    :data-mm-work-gallery-primary-id="presentation.canonicalHero.id"
    :data-mm-work-gallery-active-id="activeAsset.id"
    :data-mm-work-gallery-thumbnail-count="presentation.thumbnails.length"
  >
    <div class="mm-work-gallery__hero">
      <WorkAssetFrame
        :project="project"
        :asset="activeAsset"
        :project-id="project.id"
        :context-label="isCanonicalHeroActive ? '주요 미디어' : '선택된 보조 미디어'"
        :video-runtime="isCanonicalHeroActive ? 'primary-detail' : 'disabled'"
        :audio-runtime="isCanonicalHeroActive ? 'primary-detail' : 'disabled'"
        caption-mode="editorial"
        image-intent="primary"
        :media-max-inline-px="mediaMaxInlinePx"
        :media-max-block-px="mediaMaxBlockPx"
      />

      <button
        v-if="!isCanonicalHeroActive"
        class="mm-work-gallery__restore"
        type="button"
        data-mm-work-gallery-restore-primary
        @click="restoreCanonicalHero"
      >
        대표 미디어로 돌아가기
      </button>
    </div>

    <ol
      v-if="presentation.thumbnails.length > 0"
      class="mm-work-gallery__thumbnails"
      aria-label="보조 미디어"
      data-mm-work-gallery-thumbnails
    >
      <li
        v-for="(asset, index) in presentation.thumbnails"
        :key="asset.id"
        class="mm-work-gallery__thumbnail-item"
      >
        <button
          class="mm-work-gallery__thumbnail"
          type="button"
          :aria-label="thumbnailControlLabel(asset, index)"
          :aria-pressed="activeAsset.id === asset.id ? 'true' : 'false'"
          :data-mm-gallery-thumbnail-selected="activeAsset.id === asset.id ? 'true' : 'false'"
          @click="selectSecondary(asset.id)"
        >
          <WorkAssetFrame
            :project="project"
            :asset="asset"
            context-label="보조 미디어 썸네일"
            caption-mode="none"
            image-intent="thumbnail"
          />
        </button>
      </li>
    </ol>
  </div>
</template>
