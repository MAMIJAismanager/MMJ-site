<script setup lang="ts">
import {
  computed,
  ref,
  watch,
} from 'vue'

import type {
  PortfolioGatewayCategoryId,
} from '~~/shared/types/portfolio-gateway-category'

import type {
  WorksCategoryOption,
  WorksTagOption,
  WorksYearOption,
} from '~~/shared/query/works-project-query'

import {
  normalizeWorksQueryInput,
} from '~~/shared/query/works-query-state'

import {
  isPublicPortfolioGatewayCategoryId,
} from '~~/shared/constants/portfolio-gateway-categories'

import type {
  WorksQueryState,
  WorksSort,
} from '~~/shared/query/works-query-state'

export type WorksQueryPlacement =
  | 'pending'
  | 'inline'
  | 'mobile-menu'

interface WorksFilterBarProps {
  readonly state: WorksQueryState
  readonly categoryOptions:
    readonly WorksCategoryOption[]
  readonly tagOptions:
    readonly WorksTagOption[]
  readonly yearOptions:
    readonly WorksYearOption[]
  readonly hasActiveFilters: boolean
  readonly queryReady: boolean
  readonly placement: WorksQueryPlacement
}

const props = defineProps<WorksFilterBarProps>()

const emit = defineEmits<{
  'submit-search': [value: string | null]
  'change-category': [value: PortfolioGatewayCategoryId | null]
  'change-tag': [value: string | null]
  'change-year': [value: number | null]
  'change-sort': [value: WorksSort]
  'reset': []
}>()

const qDraft = ref(props.state.q ?? '')

const categorySelectValue = computed(() => (
  isPublicPortfolioGatewayCategoryId(props.state.category)
    ? props.state.category
    : ''
))

const categoryDebugValue = computed(() => (
  props.state.category ?? 'all'
))

watch(
  () => props.state.q,
  value => {
    qDraft.value = value ?? ''
  },
)

function selectValue(event: Event): string {
  const target = event.currentTarget
  if (!(target instanceof HTMLSelectElement)) {
    return ''
  }
  return target.value
}

function submitSearch(): void {
  emit(
    'submit-search',
    normalizeWorksQueryInput(qDraft.value),
  )
}

function changeCategory(event: Event): void {
  const value = selectValue(event)
  emit(
    'change-category',
    value.length > 0
      ? value as PortfolioGatewayCategoryId
      : null,
  )
}

function changeTag(event: Event): void {
  const value = selectValue(event)
  emit('change-tag', value.length > 0 ? value : null)
}

function changeYear(event: Event): void {
  const value = selectValue(event)
  emit(
    'change-year',
    value.length > 0 ? Number(value) : null,
  )
}

function changeSort(event: Event): void {
  emit(
    'change-sort',
    selectValue(event) as WorksSort,
  )
}
</script>

<template>
  <div
    class="mm-works-query"
    data-mm-works-query-controls
    :data-placement="placement"
    :data-mm-works-query-placement="placement"
    :data-mm-works-query-category="categoryDebugValue"
    data-mm-works-role-filter="retired"
  >
    <form
      class="mm-works-query__search"
      role="search"
      @submit.prevent="submitSearch"
    >
      <label
        class="mm-works-query__label"
        for="mm-works-search"
      >
        검색
      </label>

      <div class="mm-works-query__search-row">
        <input
          id="mm-works-search"
          v-model="qDraft"
          class="mm-works-query__control"
          name="q"
          type="search"
          autocomplete="off"
          :disabled="!queryReady || placement === 'pending'"
        >

        <button
          class="mm-works-query__button"
          type="submit"
          :disabled="!queryReady || placement === 'pending'"
        >
          찾기
        </button>
      </div>
    </form>

    <div class="mm-works-query__filters">
      <div class="mm-works-query__field">
        <label
          class="mm-works-query__label"
          for="mm-works-category"
        >
          분야
        </label>

        <select
          id="mm-works-category"
          class="mm-works-query__control"
          name="category"
          :value="categorySelectValue"
          :disabled="!queryReady || placement === 'pending'"
          @change="changeCategory"
        >
          <option value="">
            전체 분야
          </option>
          <option
            v-for="option in categoryOptions"
            :key="option.token"
            :value="option.token"
            :disabled="option.count === 0"
          >
            {{ option.label }} ({{ option.count }})
          </option>
        </select>
      </div>

      <div class="mm-works-query__field">
        <label
          class="mm-works-query__label"
          for="mm-works-tag"
        >
          태그
        </label>

        <select
          id="mm-works-tag"
          class="mm-works-query__control"
          name="tag"
          :value="state.tag ?? ''"
          :disabled="!queryReady || placement === 'pending'"
          @change="changeTag"
        >
          <option value="">
            전체 태그
          </option>
          <option
            v-for="option in tagOptions"
            :key="option.token"
            :value="option.token"
          >
            {{ option.label }} ({{ option.count }})
          </option>
        </select>
      </div>

      <div class="mm-works-query__field">
        <label
          class="mm-works-query__label"
          for="mm-works-year"
        >
          연도
        </label>

        <select
          id="mm-works-year"
          class="mm-works-query__control"
          name="year"
          :value="state.year ?? ''"
          :disabled="!queryReady || placement === 'pending'"
          @change="changeYear"
        >
          <option value="">
            전체 연도
          </option>
          <option
            v-for="option in yearOptions"
            :key="option.year"
            :value="option.year"
          >
            {{ option.year }} ({{ option.count }})
          </option>
        </select>
      </div>

      <div class="mm-works-query__field">
        <label
          class="mm-works-query__label"
          for="mm-works-sort"
        >
          정렬
        </label>

        <select
          id="mm-works-sort"
          class="mm-works-query__control"
          name="sort"
          :value="state.sort"
          :disabled="!queryReady || placement === 'pending'"
          @change="changeSort"
        >
          <option value="order">
            기본 순서
          </option>
          <option value="newest">
            최신순
          </option>
          <option value="oldest">
            오래된순
          </option>
          <option value="title">
            제목순
          </option>
        </select>
      </div>
    </div>

    <button
      class="mm-works-query__reset"
      type="button"
      :disabled="!queryReady || !hasActiveFilters || placement === 'pending'"
      @click="emit('reset')"
    >
      조건 초기화
    </button>
  </div>
</template>
