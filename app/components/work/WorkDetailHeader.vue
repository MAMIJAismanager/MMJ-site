<script setup lang="ts">
import type {
  WorkDetailView,
} from '~~/shared/view/portfolio-project-view'

interface Props {
  readonly project: WorkDetailView
}

defineProps<Props>()
</script>

<template>
  <header
    class="mm-work-detail-header"
    data-mm-work-detail-header
  >
    <p class="mm-label mm-work-detail-header__eyebrow">
      Work · {{ project.category.label }}
    </p>

    <h1 class="mm-page-title mm-work-detail-header__title">
      {{ project.title }}
    </h1>

    <p class="mm-work-detail-header__summary">
      {{ project.summary }}
    </p>

    <ul
      v-if="project.tags.length > 0"
      class="mm-work-detail-header__tags"
      aria-label="태그"
      data-mm-work-tags
    >
      <li
        v-for="tag in project.tags"
        :key="tag.token"
      >
        {{ tag.label }}
      </li>
    </ul>
  </header>
</template>
