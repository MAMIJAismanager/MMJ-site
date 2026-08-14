<script setup lang="ts">
import { computed, ref } from 'vue'

import ProjectCardMetadata from './ProjectCardMetadata.vue'
import WorksFilterBar from '~/components/works/WorksFilterBar.vue'
import WorksPagination from '~/components/works/WorksPagination.vue'
import WorksResultSummary from '~/components/works/WorksResultSummary.vue'

import type {
  ProjectCardView,
} from '~~/shared/view/portfolio-project-view'
import type {
  WorksCategoryOption,
  WorksTagOption,
  WorksYearOption,
} from '~~/shared/query/works-project-query'
import type {
  WorksQueryState,
} from '~~/shared/query/works-query-state'
import type {
  WorksPageCompositionCandidate,
  WorksPageProbeReceipt,
} from '~/works/works-page-composition'

interface WorksPageCompositionProbeProps {
  readonly candidate: WorksPageCompositionCandidate | null
  readonly projects: readonly ProjectCardView[]
  readonly title: string
  readonly hiddenLead: string | null
  readonly state: WorksQueryState
  readonly categoryOptions: readonly WorksCategoryOption[]
  readonly tagOptions: readonly WorksTagOption[]
  readonly yearOptions: readonly WorksYearOption[]
  readonly hasActiveFilters: boolean
  readonly totalCount: number
  readonly resultCount: number
  readonly currentPage: number
  readonly pageCount: number
  readonly pageStartIndex: number
  readonly pageEndIndexExclusive: number
}

const props = defineProps<WorksPageCompositionProbeProps>()

const rootElement = ref<HTMLElement | null>(null)
const headerElement = ref<HTMLElement | null>(null)
const queryElement = ref<HTMLElement | null>(null)
const summaryElement = ref<HTMLElement | null>(null)
const gridElement = ref<HTMLElement | null>(null)
const paginationElement = ref<HTMLElement | null>(null)
const cardElements = ref<(HTMLElement | null)[]>([])

const CJK = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u
const LATIN_TOKEN = /[A-Za-z0-9]+/g

const probeStyle = computed<Readonly<Record<string, string>>>(() => {
  const candidate = props.candidate
  if (candidate === null) return Object.freeze({})
  return Object.freeze({
    width: `${candidate.railInlinePx}px`,
    '--mm-works-page-padding-block': `${candidate.pagePaddingBlockPx}px`,
    '--mm-works-page-gap': `${candidate.pageGapPx}px`,
    '--mm-works-header-gap': `${candidate.headerGapPx}px`,
    '--mm-works-title-size': `${candidate.titlePx}px`,
    '--mm-works-query-gap': `${candidate.queryGapPx}px`,
    '--mm-works-query-padding': `${candidate.queryPaddingPx}px`,
    '--mm-works-query-control-height': `${candidate.queryControlBlockPx}px`,
    '--mm-works-grid-gap': `${candidate.gridGapPx}px`,
    '--mm-works-card-padding': `${candidate.cardPaddingPx}px`,
    '--mm-works-card-title-size': `${candidate.cardTitlePx}px`,
  })
})

function setCardElement(value: unknown, index: number): void {
  cardElements.value[index] = value instanceof HTMLElement ? value : null
}

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
    if (current instanceof Text && current.data.length > 0) output.push(current)
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
      const end = offset + symbol.length
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
  return longestSingleRun >= 3 && singleLineCount / counts.length >= 0.75
}

function blockSize(element: HTMLElement | null): number {
  if (!(element instanceof HTMLElement)) return 0
  return Math.max(element.clientHeight, element.getBoundingClientRect().height)
}

function inlineSize(element: HTMLElement | null): number {
  if (!(element instanceof HTMLElement)) return 0
  return Math.max(element.clientWidth, element.getBoundingClientRect().width)
}

function overflowPx(element: HTMLElement): number {
  return Math.max(0, element.scrollWidth - element.clientWidth)
}

function queryRowCount(element: HTMLElement | null): number {
  if (!(element instanceof HTMLElement)) return 0
  const children = [...element.children]
    .filter(child => child instanceof HTMLElement) as HTMLElement[]
  if (children.length === 0) return 0
  return new Set(children.map(child => Math.round(child.getBoundingClientRect().bottom))).size
}

function readProbeReceipt(): WorksPageProbeReceipt | null {
  const candidate = props.candidate
  const root = rootElement.value
  const grid = gridElement.value
  if (
    candidate === null
    || !(root instanceof HTMLElement)
    || !(grid instanceof HTMLElement)
  ) return null

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
    ...cardElements.value
      .slice(0, props.projects.length)
      .map(element => inlineSize(element)),
  )
  const overflowElements = [
    root,
    grid,
    ...(queryElement.value instanceof HTMLElement ? [queryElement.value] : []),
    ...metadata,
  ]

  return Object.freeze({
    key: candidate.key,
    probeId: candidate.probeId,
    presetId: candidate.presetId,
    railInlinePx: inlineSize(root),
    gridInlinePx: inlineSize(grid),
    cardInlinePx,
    headerBlockPx: blockSize(headerElement.value),
    queryBlockPx: blockSize(queryElement.value),
    summaryBlockPx: blockSize(summaryElement.value),
    gridBlockPx: blockSize(grid),
    paginationBlockPx: blockSize(paginationElement.value),
    totalPageBlockPx: blockSize(root),
    queryRowCount: queryRowCount(queryElement.value),
    horizontalOverflowPx: Math.max(
      0,
      ...overflowElements.map(overflowPx),
    ),
    metadataClipCount: metadata.filter(element => (
      element.scrollWidth > element.clientWidth + 1
      || element.scrollHeight > element.clientHeight + 1
    )).length,
    latinTokenFragmentedCount:
      readabilityElements.filter(latinTokenFragmented).length,
    singleGraphemeCollapseCount:
      titleElements.filter(singleGraphemeCollapse).length,
    stable: true,
  })
}

defineExpose({ readProbeReceipt })
</script>

<template>
  <section
    v-if="candidate !== null"
    ref="rootElement"
    class="mm-page mm-works-page-composition-probe"
    aria-hidden="true"
    inert
    :data-mm-works-r6-probe-id="candidate.probeId"
    :data-mm-works-r6-preset="candidate.presetId"
    :style="probeStyle"
  >
    <header
      ref="headerElement"
      class="mm-page__header mm-works-page-composition-probe__header"
    >
      <p class="mm-label">Portfolio</p>
      <h1 class="mm-page-title">{{ title }}</h1>
      <p
        v-if="hiddenLead !== null"
        class="mm-page__lead"
      >
        {{ hiddenLead }}
      </p>
    </header>

    <div
      v-if="candidate.queryPlacement === 'inline'"
      ref="queryElement"
      class="mm-works-query-host"
      data-mm-works-query-placement="inline"
    >
      <WorksFilterBar
        :state="state"
        :category-options="categoryOptions"
        :tag-options="tagOptions"
        :year-options="yearOptions"
        :has-active-filters="hasActiveFilters"
        :query-ready="true"
        placement="inline"
        :layout-mode="candidate.layoutMode"
        id-prefix="mm-works-r6-probe"
      />
    </div>

    <div ref="summaryElement" style="min-width: 0">
      <WorksResultSummary
        :total-count="totalCount"
        :result-count="resultCount"
        :has-active-filters="hasActiveFilters"
        :query-ready="true"
        :current-page="currentPage"
        :page-count="pageCount"
        :page-start-index="pageStartIndex"
        :page-end-index-exclusive="pageEndIndexExclusive"
      />
    </div>

    <ul
      ref="gridElement"
      class="mm-project-grid"
      data-mm-works-r6-probe-grid
      :style="{
        gridTemplateColumns:
          `repeat(${candidate.columnCount}, minmax(0, 1fr))`,
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
          :data-mm-project-card-density="candidate.cardDensity"
        >
          <div class="mm-project-card__link mm-dark-surface">
            <div class="mm-project-card-media mm-works-page-composition-probe__media" />
            <ProjectCardMetadata :project="project" />
          </div>
        </article>
      </li>
    </ul>

    <div
      v-if="pageCount > 1"
      ref="paginationElement"
      style="min-width: 0"
    >
      <WorksPagination
        :current-page="currentPage"
        :page-count="pageCount"
        :query-ready="false"
        placement="in-flow"
      />
    </div>
  </section>
</template>

<style scoped>
.mm-works-page-composition-probe {
  position: fixed;
  inset-block-start: 0;
  inset-inline-start: -100000px;
  z-index: -1;
  display: grid;
  min-width: 0;
  margin: 0;
  gap: var(--mm-works-page-gap);
  padding-block: var(--mm-works-page-padding-block);
  visibility: hidden;
  pointer-events: none;
  contain: layout style paint;
}

.mm-works-page-composition-probe__header {
  gap: var(--mm-works-header-gap);
  max-width: none;
}

.mm-works-page-composition-probe .mm-page-title {
  font-size: var(--mm-works-title-size);
}

.mm-works-page-composition-probe__media {
  aspect-ratio: 4 / 3;
}
</style>
