<script setup lang="ts">
import { ref } from 'vue'

import ProjectCardMetadata from './ProjectCardMetadata.vue'
import WorksPagination from '~/components/works/WorksPagination.vue'

import type {
  ProjectCardView,
} from '~~/shared/view/portfolio-project-view'
import type {
  WorksCompositionProbeReceipt,
  WorksCompositionProbeRequest,
} from '~/works/works-composition-solver'

interface MetadataReader {
  readMetadataBlockPx(): number
}

interface WorksCompositionProbeProps {
  readonly projects: readonly ProjectCardView[]
  readonly request: WorksCompositionProbeRequest | null
  readonly currentPage: number
  readonly pageCount: number
}

const props = defineProps<WorksCompositionProbeProps>()

const lowerElement = ref<HTMLElement | null>(null)
const gridElement = ref<HTMLElement | null>(null)
const paginationElement = ref<HTMLElement | null>(null)
const cardElements = ref<(HTMLElement | null)[]>([])
const metadataReaders = ref<(MetadataReader | null)[]>([])

function setCardElement(value: unknown, index: number): void {
  cardElements.value[index] = value instanceof HTMLElement ? value : null
}

function setMetadataReader(value: unknown, index: number): void {
  if (
    typeof value === 'object'
    && value !== null
    && 'readMetadataBlockPx' in value
    && typeof (value as MetadataReader).readMetadataBlockPx === 'function'
  ) {
    metadataReaders.value[index] = value as MetadataReader
    return
  }
  metadataReaders.value[index] = null
}

function blockSize(element: HTMLElement | null): number {
  if (!(element instanceof HTMLElement)) return 0
  return Math.max(element.clientHeight, element.getBoundingClientRect().height)
}

function inlineSize(element: HTMLElement | null): number {
  if (!(element instanceof HTMLElement)) return 0
  return Math.max(element.clientWidth, element.getBoundingClientRect().width)
}

function readProbeReceipt(): WorksCompositionProbeReceipt | null {
  const request = props.request
  const lower = lowerElement.value
  const grid = gridElement.value
  if (
    request === null
    || !(lower instanceof HTMLElement)
    || !(grid instanceof HTMLElement)
  ) {
    return null
  }

  const metadata = props.projects.map((_, index) => (
    metadataReaders.value[index]?.readMetadataBlockPx() ?? 0
  ))
  const row0MetadataMaxPx = Math.max(0, ...metadata.slice(0, 4))
  const row1MetadataMaxPx = Math.max(0, ...metadata.slice(4, 8))
  const measuredCardInlinePx = Math.max(
    0,
    ...cardElements.value
      .slice(0, props.projects.length)
      .map(element => inlineSize(element)),
  )

  return Object.freeze({
    key: request.key,
    probeId: request.probeId,
    density: request.density,
    cardInlinePx: measuredCardInlinePx || request.cardInlinePx,
    gridInlinePx: inlineSize(grid),
    gridBlockPx: blockSize(grid),
    paginationBlockPx: blockSize(paginationElement.value),
    lowerCompositionBlockPx: blockSize(lower),
    row0MetadataMaxPx,
    row1MetadataMaxPx,
    visibleCardCount: props.projects.length,
    stable: true,
  })
}

defineExpose({
  readProbeReceipt,
})
</script>

<template>
  <div
    v-if="request !== null"
    class="mm-works-composition-probe"
    aria-hidden="true"
    inert
    :data-mm-works-probe-id="request.probeId"
    :data-mm-works-probe-density="request.density"
    :style="{
      width: `${request.gridInlinePx}px`,
      '--mm-works-grid-gap': `${request.gridGapRem}rem`,
      '--mm-works-card-padding': `${request.cardPaddingRem}rem`,
      '--mm-works-card-title-size': `${request.cardTitleRem}rem`,
      '--mm-works-page-gap': `${request.pageGapRem}rem`,
    }"
  >
    <div
      ref="lowerElement"
      class="mm-works-composition-probe__lower"
    >
      <ul
        ref="gridElement"
        class="mm-project-grid"
        data-mm-works-probe-grid
        :style="{
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          width: '100%',
        }"
      >
        <li
          v-for="(project, index) in projects"
          :key="project.id"
          class="mm-project-grid__item"
        >
          <article
            :ref="value => setCardElement(value, index)"
            class="mm-project-card"
            :data-mm-project-card-density="request.cardDensity"
          >
            <div class="mm-project-card__link mm-dark-surface">
              <div
                class="mm-project-card-media mm-works-composition-probe__media"
              />
              <ProjectCardMetadata
                :ref="value => setMetadataReader(value, index)"
                :project="project"
              />
            </div>
          </article>
        </li>
      </ul>

      <div
        v-if="pageCount > 1"
        ref="paginationElement"
        class="mm-works-composition-probe__pagination"
      >
        <WorksPagination
          :current-page="currentPage"
          :page-count="pageCount"
          :query-ready="false"
          placement="in-flow"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.mm-works-composition-probe {
  position: fixed;
  inset-block-start: 0;
  inset-inline-start: -100000px;
  z-index: -1;
  visibility: hidden;
  pointer-events: none;
  contain: layout style paint;
}

.mm-works-composition-probe__lower {
  display: grid;
  gap: var(--mm-works-page-gap);
  width: 100%;
}

.mm-works-composition-probe__media {
  aspect-ratio: 4 / 3;
}
</style>
