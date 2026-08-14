<script setup lang="ts">
import { ref } from 'vue'

import type {
  ProjectCardView,
} from '~~/shared/view/portfolio-project-view'

interface ProjectCardMetadataProps {
  readonly project: ProjectCardView
}

defineProps<ProjectCardMetadataProps>()

const metadataElement = ref<HTMLElement | null>(null)

function readMetadataBlockPx(): number {
  const element = metadataElement.value
  if (!(element instanceof HTMLElement)) return 0
  return Math.max(
    element.clientHeight,
    element.getBoundingClientRect().height,
  )
}

defineExpose({
  readMetadataBlockPx,
})
</script>

<template>
  <div
    ref="metadataElement"
    class="mm-project-card-metadata"
  >
    <div class="mm-project-card-metadata__context">
      <p class="mm-project-card-metadata__category">
        {{ project.category.label }}
      </p>

      <p
        v-if="project.displayMeta.metaLine !== null"
        class="mm-project-card-metadata__meta"
      >
        {{ project.displayMeta.metaLine }}
      </p>
    </div>

    <h2 class="mm-project-card-metadata__title">
      {{ project.title }}
    </h2>

    <ul
      class="mm-project-card-metadata__roles"
      aria-label="담당 역할"
    >
      <li
        v-for="role in project.roles"
        :key="role.token"
        class="mm-project-card-metadata__role"
      >
        {{ role.label }}
      </li>
    </ul>
  </div>
</template>
