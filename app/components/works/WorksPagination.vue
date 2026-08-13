<script setup lang="ts">
import { computed } from 'vue'

interface WorksPaginationProps {
  readonly currentPage: number
  readonly pageCount: number
  readonly queryReady: boolean
  readonly placement: 'in-flow'
}

type PaginationToken =
  | number
  | 'ellipsis-left'
  | 'ellipsis-right'

const props = defineProps<WorksPaginationProps>()

const emit = defineEmits<{
  changePage: [page: number]
}>()

const tokens = computed<readonly PaginationToken[]>(() => {
  if (props.pageCount <= 7) {
    return Object.freeze(
      Array.from(
        { length: props.pageCount },
        (_, index) => index + 1,
      ),
    )
  }

  const pages = new Set<number>([
    1,
    props.pageCount,
    props.currentPage - 1,
    props.currentPage,
    props.currentPage + 1,
  ])
  const ordered = [...pages]
    .filter(page => page >= 1 && page <= props.pageCount)
    .sort((left, right) => left - right)

  const output: PaginationToken[] = []
  let previous: number | null = null

  for (const page of ordered) {
    if (previous !== null && page - previous > 1) {
      output.push(previous === 1 ? 'ellipsis-left' : 'ellipsis-right')
    }
    output.push(page)
    previous = page
  }

  return Object.freeze(output)
})

function activatePage(page: number): void {
  if (
    !props.queryReady
    || page === props.currentPage
    || page < 1
    || page > props.pageCount
  ) {
    return
  }

  emit('changePage', page)
}
</script>

<template>
  <nav
    v-if="pageCount > 1"
    class="mm-works-pagination"
    aria-label="작업 페이지"
    data-mm-works-pagination
    :data-mm-current-page="currentPage"
    :data-mm-page-count="pageCount"
    :data-mm-pagination-placement="placement"
  >
    <ol class="mm-works-pagination__list">
      <li
        v-for="token in tokens"
        :key="token"
        class="mm-works-pagination__item"
      >
        <span
          v-if="typeof token !== 'number'"
          class="mm-works-pagination__ellipsis"
          aria-hidden="true"
        >
          …
        </span>

        <button
          v-else
          class="mm-works-pagination__button"
          type="button"
          :disabled="!queryReady || token === currentPage"
          :aria-current="token === currentPage ? 'page' : undefined"
          :aria-label="`${token}페이지`"
          @click="activatePage(token)"
        >
          {{ token }}
        </button>
      </li>
    </ol>
  </nav>
</template>
