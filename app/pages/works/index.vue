<script setup lang="ts">
definePageMeta({
  hideSiteFooter: true,
  viewportComposition: 'works',
})

import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue'

import ProjectGrid from '~/components/project/ProjectGrid.vue'
import WorksFilterBar from '~/components/works/WorksFilterBar.vue'
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
  findPortfolioGatewayCategory,
} from '~~/shared/constants/portfolio-gateway-categories'

import type {
  PortfolioGatewayCategoryId,
} from '~~/shared/types/portfolio-gateway-category'

import type {
  WorksSort,
} from '~~/shared/query/works-query-state'

const MOBILE_VIEWPORT_QUERY = '(max-width: 47.999rem)'

const {
  queryReady,
  evaluation,
  projects,
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
  projects,
  activeProject,
  replaceQuery,
})

const worksQueryPlacement = ref<WorksQueryPlacement>('pending')
let mobileViewportQuery: MediaQueryList | null = null

function syncWorksQueryPlacement(
  media: MediaQueryList | MediaQueryListEvent,
): void {
  worksQueryPlacement.value = media.matches
    ? 'mobile-menu'
    : 'inline'
}

onMounted(() => {
  mobileViewportQuery = window.matchMedia(MOBILE_VIEWPORT_QUERY)
  syncWorksQueryPlacement(mobileViewportQuery)
  mobileViewportQuery.addEventListener(
    'change',
    syncWorksQueryPlacement,
  )
})

onBeforeUnmount(() => {
  mobileViewportQuery?.removeEventListener(
    'change',
    syncWorksQueryPlacement,
  )
  mobileViewportQuery = null
})

function submitSearch(
  value: string | null,
): void {
  void patchQuery({ q: value })
}

function changeCategory(
  value: PortfolioGatewayCategoryId | null,
): void {
  void patchQuery({ category: value })
}

function changeTag(
  value: string | null,
): void {
  void patchQuery({ tag: value })
}

function changeYear(
  value: number | null,
): void {
  void patchQuery({ year: value })
}

function changeSort(
  value: WorksSort,
): void {
  void patchQuery({ sort: value })
}

const activeGatewayCategory = computed(() => (
  state.value.category === null
    ? null
    : findPortfolioGatewayCategory(state.value.category)
))

function resetWorksQuery(): void {
  void resetQuery()
}
</script>

<template>
  <section
    class="mm-page mm-works-index"
    data-mm-page="works-index"
    :data-mm-query-ready="queryReady ? 'true' : 'false'"
    :data-mm-result-count="evaluation.resultCount"
    :data-mm-total-count="evaluation.totalCount"
    :data-mm-active-project-id="activeProject?.id"
    :data-mm-navigation-restoration="restorationResult?.status ?? 'pending'"
    :data-mm-hidden-category-active="hiddenCategoryActive ? 'true' : 'false'"
    :data-mm-hidden-access-denied="hiddenAccessDenied ? 'true' : 'false'"
    :data-mm-works-query-placement="worksQueryPlacement"
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
          @submit-search="submitSearch"
          @change-category="changeCategory"
          @change-tag="changeTag"
          @change-year="changeYear"
          @change-sort="changeSort"
          @reset="resetWorksQuery"
        />
      </div>
    </Teleport>

    <WorksResultSummary
      :total-count="evaluation.totalCount"
      :result-count="evaluation.resultCount"
      :has-active-filters="hasActiveFilters"
      :query-ready="queryReady"
    />

    <p
      v-if="!queryReady"
      class="mm-body"
      data-mm-query-pending
    >
      작업 목록 확인 중
    </p>

    <ProjectGrid
      v-else-if="projects.length > 0"
      :projects="projects"
      @detail-activate="handleDetailActivation"
    />

    <div
      v-else-if="queryReady && evaluation.totalCount > 0"
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
  </section>
</template>
