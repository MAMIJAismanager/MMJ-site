<script setup lang="ts">
interface WorksResultSummaryProps {
  readonly totalCount: number
  readonly resultCount: number
  readonly hasActiveFilters: boolean
  readonly queryReady: boolean
  readonly currentPage: number
  readonly pageCount: number
  readonly pageStartIndex: number
  readonly pageEndIndexExclusive: number
}

defineProps<WorksResultSummaryProps>()
</script>

<template>
  <p
    class="mm-works-result-summary"
    data-mm-works-result-summary
    aria-live="polite"
    aria-atomic="true"
  >
    <template v-if="hasActiveFilters">
      총 {{ totalCount }}개 중 {{ resultCount }}개의 작업
    </template>
    <template v-else>
      총 {{ totalCount }}개의 작업
    </template>
    <template v-if="queryReady && resultCount > 0">
      · {{ pageStartIndex + 1 }}–{{ pageEndIndexExclusive }} 표시
      <template v-if="pageCount > 1">
        · {{ currentPage }}/{{ pageCount }} 페이지
      </template>
    </template>
    <span class="mm-works-result-summary__status">
      {{ queryReady ? '' : ' · 조건을 불러오는 중' }}
    </span>
  </p>
</template>
