<script setup lang="ts">
import { ref } from 'vue'

import ProjectCardMetadata from './ProjectCardMetadata.vue'

import type {
  ProjectCardView,
} from '~~/shared/view/portfolio-project-view'
import type {
  WorksMobileProbeReceipt,
  WorksMobileProbeRequest,
} from '~/works/works-mobile-composition'

interface WorksMobileCompositionProbeProps {
  readonly projects: readonly ProjectCardView[]
  readonly request: WorksMobileProbeRequest | null
}

const props = defineProps<WorksMobileCompositionProbeProps>()

const rootElement = ref<HTMLElement | null>(null)
const gridElement = ref<HTMLElement | null>(null)

const CJK = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u
const LATIN_TOKEN = /[A-Za-z0-9]+/g

function rectLineKey(rect: DOMRect): number {
  return Math.round(rect.top * 2) / 2
}

function textNodes(element: Element): readonly Text[] {
  const output: Text[] = []
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
  )
  let current = walker.nextNode()
  while (current !== null) {
    if (current instanceof Text && current.data.length > 0) {
      output.push(current)
    }
    current = walker.nextNode()
  }
  return Object.freeze(output)
}

function rangeRect(
  node: Text,
  start: number,
  end: number,
): DOMRect | null {
  if (end <= start || start < 0 || end > node.data.length) return null
  const range = document.createRange()
  range.setStart(node, start)
  range.setEnd(node, end)
  const rect = range.getBoundingClientRect()
  range.detach()
  if (rect.width <= 0 && rect.height <= 0) return null
  return rect
}

function latinTokenFragmented(element: Element): boolean {
  for (const node of textNodes(element)) {
    LATIN_TOKEN.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = LATIN_TOKEN.exec(node.data)) !== null) {
      if (match[0].length < 2) continue
      const lines = new Set<number>()
      for (
        let offset = match.index;
        offset < match.index + match[0].length;
        offset += 1
      ) {
        const rect = rangeRect(node, offset, offset + 1)
        if (rect !== null) lines.add(rectLineKey(rect))
      }
      if (lines.size > 1) return true
    }
  }
  return false
}

function singleGraphemeCollapse(element: Element): boolean {
  const lineCounts = new Map<number, number>()

  for (const node of textNodes(element)) {
    let offset = 0
    for (const symbol of Array.from(node.data)) {
      const width = symbol.length
      const end = offset + width
      if (CJK.test(symbol)) {
        const rect = rangeRect(node, offset, end)
        if (rect !== null) {
          const key = rectLineKey(rect)
          lineCounts.set(key, (lineCounts.get(key) ?? 0) + 1)
        }
      }
      offset = end
    }
  }

  const counts = [...lineCounts.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([, count]) => count)

  if (counts.length < 3) return false

  let longestSingleRun = 0
  let currentSingleRun = 0
  for (const count of counts) {
    if (count === 1) {
      currentSingleRun += 1
      longestSingleRun = Math.max(longestSingleRun, currentSingleRun)
    } else {
      currentSingleRun = 0
    }
  }

  const singleLineCount = counts.filter(count => count === 1).length
  return (
    longestSingleRun >= 3
    && singleLineCount / counts.length >= 0.75
  )
}

function overflowPx(element: HTMLElement): number {
  return Math.max(
    0,
    element.scrollWidth - element.clientWidth,
  )
}

function metadataClipped(element: HTMLElement): boolean {
  return (
    element.scrollWidth > element.clientWidth + 1
    || element.scrollHeight > element.clientHeight + 1
  )
}

function readProbeReceipt(): WorksMobileProbeReceipt | null {
  const request = props.request
  const root = rootElement.value
  const grid = gridElement.value
  if (
    request === null
    || !(root instanceof HTMLElement)
    || !(grid instanceof HTMLElement)
  ) {
    return null
  }

  const cards = [
    ...root.querySelectorAll<HTMLElement>('[data-mm-mobile-probe-card]'),
  ]
  const metadata = [
    ...root.querySelectorAll<HTMLElement>('.mm-project-card-metadata'),
  ]
  const readabilityElements = [
    ...root.querySelectorAll<HTMLElement>([
      '.mm-project-card-metadata__category',
      '.mm-project-card-metadata__meta',
      '.mm-project-card-metadata__title',
      '.mm-project-card-metadata__role',
    ].join(',')),
  ]
  const titleElements = [
    ...root.querySelectorAll<HTMLElement>('.mm-project-card-metadata__title'),
  ]

  const cardInlinePx = Math.max(
    0,
    ...cards.map(card => card.getBoundingClientRect().width),
  )
  const gridRect = grid.getBoundingClientRect()
  const cardOverflowPx = Math.max(
    0,
    ...cards.map(overflowPx),
  )
  const latinTokenFragmentedCount = readabilityElements
    .filter(latinTokenFragmented)
    .length
  const singleGraphemeCollapseCount = titleElements
    .filter(singleGraphemeCollapse)
    .length
  const metadataClipCount = metadata
    .filter(metadataClipped)
    .length

  return Object.freeze({
    key: request.key,
    probeId: request.probeId,
    columns: request.columns,
    railInlinePx: request.railInlinePx,
    gridInlinePx: Math.max(grid.clientWidth, gridRect.width),
    cardInlinePx: cardInlinePx || request.cardInlinePx,
    gridOverflowPx: Math.max(overflowPx(grid), cardOverflowPx),
    metadataClipCount,
    latinTokenFragmentedCount,
    singleGraphemeCollapseCount,
    projectCount: props.projects.length,
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
    ref="rootElement"
    class="mm-works-mobile-composition-probe"
    aria-hidden="true"
    inert
    :data-mm-works-mobile-probe-id="request.probeId"
    :data-mm-works-mobile-probe-columns="request.columns"
    :style="{
      width: `${request.railInlinePx}px`,
      '--mm-works-grid-gap': `${request.gridGapRem}rem`,
      '--mm-works-card-padding': `${request.cardPaddingRem}rem`,
      '--mm-works-card-title-size': `${request.cardTitleRem}rem`,
    }"
  >
    <ul
      ref="gridElement"
      class="mm-project-grid"
      data-mm-works-mobile-probe-grid
      :style="{
        gridTemplateColumns:
          `repeat(${request.columns}, minmax(0, 1fr))`,
        width: '100%',
      }"
    >
      <li
        v-for="project in projects"
        :key="project.id"
        class="mm-project-grid__item"
      >
        <article
          class="mm-project-card"
          data-mm-mobile-probe-card
          :data-mm-project-card-density="request.cardDensity"
        >
          <div class="mm-project-card__link mm-dark-surface">
            <div
              class="mm-project-card-media mm-works-mobile-composition-probe__media"
            />
            <ProjectCardMetadata :project="project" />
          </div>
        </article>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.mm-works-mobile-composition-probe {
  position: fixed;
  inset-block-start: 0;
  inset-inline-start: -100000px;
  z-index: -1;
  visibility: hidden;
  pointer-events: none;
  contain: layout style paint;
}

.mm-works-mobile-composition-probe__media {
  aspect-ratio: 4 / 3;
}
</style>
