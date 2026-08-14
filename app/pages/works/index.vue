<script setup lang="ts">
definePageMeta({
  hideSiteFooter: true,
  viewportComposition: 'works',
})

import {
  computed,
  nextTick,
  onMounted,
  ref,
  watch,
} from 'vue'

import ProjectGrid from '~/components/project/ProjectGrid.vue'
import WorksCompositionProbe from '~/components/project/WorksCompositionProbe.vue'
import WorksFilterBar from '~/components/works/WorksFilterBar.vue'
import WorksPagination from '~/components/works/WorksPagination.vue'
import WorksResultSummary from '~/components/works/WorksResultSummary.vue'

import type {
  WorksQueryPlacement,
} from '~/components/works/WorksFilterBar.vue'

import {
  worksCategoryOptions,
  worksTagOptions,
  worksYearOptions,
} from '~/data/works-query'
import {
  useWorksQueryState,
} from '~/composables/useWorksQueryState'
import {
  useWorksNavigationMemory,
} from '~/composables/useWorksNavigationMemory'
import {
  useWorksLayoutProfile,
} from '~/composables/useWorksLayoutProfile'
import {
  useWorksCompositionTransaction,
} from '~/composables/useWorksCompositionTransaction'

import {
  findPortfolioGatewayCategory,
} from '~~/shared/constants/portfolio-gateway-categories'

import type {
  PortfolioGatewayCategoryId,
} from '~~/shared/types/portfolio-gateway-category'
import type {
  WorksSort,
} from '~~/shared/query/works-query-state'
import type {
  WorksCompositionProbeReceipt,
} from '~/works/works-composition-solver'

interface WorksCompositionProbeReader {
  readProbeReceipt(): WorksCompositionProbeReceipt | null
}

const WORKS_SEO = Object.freeze({
  title: '작업 | 매미: 著',
  description:
    '매미: 著의 공개 작업과 프로젝트를 한곳에서 확인합니다.',
})

useSeoMeta({
  title: WORKS_SEO.title,
  description: WORKS_SEO.description,
  robots: 'index,follow',
})

const {
  queryReady,
  evaluation,
  pageProjects,
  state,
  activeProject,
  hasActiveFilters,
  hiddenCategoryActive,
  hiddenAccessDenied,
  patchQuery,
  replaceQuery,
  resetQuery,
} = useWorksQueryState()

const {
  restorationResult,
  handleDetailActivation,
} = useWorksNavigationMemory({
  queryReady,
  projects: pageProjects,
  activeProject,
  replaceQuery,
})

const pageElement = ref<HTMLElement | null>(null)
const summaryMeasureElement = ref<HTMLElement | null>(null)
const compositionProbeReader = ref<WorksCompositionProbeReader | null>(null)

const {
  viewport: worksViewport,
  viewportRevision: worksViewportRevision,
  profile: worksLayoutProfile,
  ready: worksLayoutReady,
  style: worksLayoutStyle,
} = useWorksLayoutProfile()

const activeGatewayCategory = computed(() => (
  state.value.category === null
    ? null
    : findPortfolioGatewayCategory(state.value.category)
))

const worksQueryPlacement = ref<WorksQueryPlacement>('pending')
let placementRevision = 0

function mobileMenuContextTargetExists(): boolean {
  return document.getElementById(
    'mm-mobile-menu-context-slot',
  ) !== null
}

async function syncWorksQueryPlacement(): Promise<void> {
  if (!import.meta.client) return

  const revision = ++placementRevision
  if (!worksLayoutProfile.value.mobileQueryPlacement) {
    worksQueryPlacement.value = 'inline'
    return
  }

  worksQueryPlacement.value = 'pending'
  await nextTick()
  if (revision !== placementRevision) return

  worksQueryPlacement.value = mobileMenuContextTargetExists()
    ? 'mobile-menu'
    : 'inline'
}

watch(
  () => worksLayoutProfile.value.mobileQueryPlacement,
  () => {
    void syncWorksQueryPlacement()
  },
)

onMounted(() => {
  void syncWorksQueryPlacement()
})

const worksCompositionEnabled = computed(() => (
  queryReady.value
  && pageProjects.value.length > 0
  && worksQueryPlacement.value !== 'pending'
  && worksLayoutReady.value
))

function readProbeReceipt(): WorksCompositionProbeReceipt | null {
  return compositionProbeReader.value?.readProbeReceipt() ?? null
}

const {
  published: worksPublishedComposition,
  probeRequest: worksProbeRequest,
  telemetry: worksCompositionTelemetry,
} = useWorksCompositionTransaction({
  enabled: worksCompositionEnabled,
  viewport: worksViewport,
  viewportRevision: worksViewportRevision,
  layout: worksLayoutProfile,
  projects: pageProjects,
  currentPage: computed(() => evaluation.value.currentPage),
  pageCount: computed(() => evaluation.value.pageCount),
  pageElement,
  summaryElement: summaryMeasureElement,
  readProbeReceipt,
})

function submitSearch(value: string | null): void {
  void patchQuery({ q: value })
}

function changeCategory(value: PortfolioGatewayCategoryId | null): void {
  void patchQuery({ category: value })
}

function changeTag(value: string | null): void {
  void patchQuery({ tag: value })
}

function changeYear(value: number | null): void {
  void patchQuery({ year: value })
}

function changeSort(value: WorksSort): void {
  void patchQuery({ sort: value })
}

function changePage(page: number): void {
  void patchQuery({
    page,
    project: null,
  })
}

function resetWorksQuery(): void {
  void resetQuery()
}
</script>

<template>
  <section
    ref="pageElement"
    class="mm-page mm-works-index"
    data-mm-page="works-index"
    :data-mm-query-ready="queryReady ? 'true' : 'false'"
    :data-mm-result-count="evaluation.resultCount"
    :data-mm-total-count="evaluation.totalCount"
    :data-mm-page-size="evaluation.pageSize"
    :data-mm-current-page="evaluation.currentPage"
    :data-mm-page-count="evaluation.pageCount"
    :data-mm-page-result-count="evaluation.pageResultCount"
    :data-mm-active-project-id="activeProject?.id"
    :data-mm-navigation-restoration="restorationResult?.status ?? 'pending'"
    :data-mm-hidden-category-active="hiddenCategoryActive ? 'true' : 'false'"
    :data-mm-hidden-access-denied="hiddenAccessDenied ? 'true' : 'false'"
    :data-mm-works-query-placement="worksQueryPlacement"
    :data-mm-works-layout-ready="worksLayoutReady ? 'true' : 'false'"
    :data-mm-works-layout-mode="worksLayoutProfile.mode"
    :data-mm-works-composition-phase="worksCompositionTelemetry.phase"
    :data-mm-works-composition-probe-count="worksCompositionTelemetry.probeCount"
    :data-mm-works-visible-commit-count="worksCompositionTelemetry.visibleCommitCount"
    :data-mm-works-stale-draft-reject-count="worksCompositionTelemetry.staleDraftRejectCount"
    :data-mm-works-composition-kind="worksPublishedComposition?.composition.kind ?? 'pending'"
    :data-mm-works-commit-id="worksPublishedComposition?.composition.commitId"
    :data-mm-works-card-inline="worksPublishedComposition?.commit?.cardInlinePx ?? 0"
    :data-mm-works-grid-inline="worksPublishedComposition?.commit?.gridInlinePx ?? 0"
    :data-mm-works-composition-failure="worksCompositionTelemetry.lastFailureReason"
    :style="worksLayoutStyle"
  >
    <header class="mm-page__header">
      <p class="mm-label">
        Portfolio
      </p>

      <h1 class="mm-page-title">
        {{ activeGatewayCategory?.title ?? '작업' }}
      </h1>

      <p
        v-if="hiddenCategoryActive"
        class="mm-page__lead"
        data-mm-hidden-category-heading
      >
        브랜드 명판의 더블클릭으로 열린 숨은 작업실
      </p>
    </header>

    <Teleport
      to="#mm-mobile-menu-context-slot"
      :disabled="worksQueryPlacement !== 'mobile-menu'"
      defer
    >
      <div
        class="mm-works-query-host"
        :data-mm-works-query-placement="worksQueryPlacement"
      >
        <WorksFilterBar
          :state="state"
          :category-options="worksCategoryOptions"
          :tag-options="worksTagOptions"
          :year-options="worksYearOptions"
          :has-active-filters="hasActiveFilters"
          :query-ready="queryReady"
          :placement="worksQueryPlacement"
          :layout-mode="worksLayoutProfile.mode"
          @submit-search="submitSearch"
          @change-category="changeCategory"
          @change-tag="changeTag"
          @change-year="changeYear"
          @change-sort="changeSort"
          @reset="resetWorksQuery"
        />
      </div>
    </Teleport>

    <div
      ref="summaryMeasureElement"
      style="min-width: 0"
    >
      <WorksResultSummary
        :total-count="evaluation.totalCount"
        :result-count="evaluation.resultCount"
        :has-active-filters="hasActiveFilters"
        :query-ready="queryReady"
        :current-page="evaluation.currentPage"
        :page-count="evaluation.pageCount"
        :page-start-index="evaluation.pageStartIndex"
        :page-end-index-exclusive="evaluation.pageEndIndexExclusive"
      />
    </div>

    <WorksCompositionProbe
      ref="compositionProbeReader"
      :projects="pageProjects"
      :request="worksProbeRequest"
      :current-page="evaluation.currentPage"
      :page-count="evaluation.pageCount"
    />

    <div
      v-if="!queryReady"
      data-mm-works-composition-stage="pending-query"
      style="min-width: 0"
    >
      <p class="mm-body" data-mm-query-pending>
        작업 목록 확인 중
      </p>
    </div>

    <div
      v-else-if="pageProjects.length > 0"
      data-mm-works-composition-stage="projects"
      style="min-width: 0"
    >
      <ProjectGrid
        v-if="worksPublishedComposition !== null"
        :projects="worksPublishedComposition.projects"
        :composition="worksPublishedComposition.composition"
        @detail-activate="handleDetailActivation"
      />

      <p
        v-else
        class="mm-body"
        data-mm-works-composition-pending
      >
        작업 배치 계산 중
      </p>
    </div>

    <div
      v-else-if="evaluation.totalCount > 0"
      class="mm-works-query-empty"
      data-mm-filtered-empty-state
    >
      <p class="mm-body">
        조건에 맞는 작업이 없습니다.
      </p>

      <button
        class="mm-works-query__button"
        type="button"
        @click="resetWorksQuery"
      >
        조건 초기화
      </button>
    </div>

    <p
      v-else
      class="mm-body"
      data-mm-empty-state
    >
      현재 공개된 작업이 없습니다.
    </p>

    <div
      v-if="worksPublishedComposition !== null && worksPublishedComposition.pageCount > 1"
      data-mm-works-composition-stage="pagination"
      style="min-width: 0"
    >
      <WorksPagination
        :current-page="worksPublishedComposition.currentPage"
        :page-count="worksPublishedComposition.pageCount"
        :query-ready="queryReady"
        placement="in-flow"
        @change-page="changePage"
      />
    </div>
  </section>
</template>
