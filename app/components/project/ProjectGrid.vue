<script setup lang="ts">
import { computed } from 'vue'

import type {
  ProjectDetailActivationPayload,
} from '~/types/navigation-restoration'
import type {
  ProjectCardView,
} from '~~/shared/view/portfolio-project-view'
import type {
  WorksPageGridComposition,
} from '~/works/works-page-composition'

import ProjectCard from './ProjectCard.vue'

interface ProjectGridProps {
  readonly projects: readonly ProjectCardView[]
  readonly composition: WorksPageGridComposition
}

const props = defineProps<ProjectGridProps>()

const emit = defineEmits<{
  detailActivate: [payload: ProjectDetailActivationPayload]
}>()

const gridStyle = computed<Readonly<Record<string, string>>>(() => Object.freeze({
  gridTemplateColumns:
    `repeat(${props.composition.columnCount}, minmax(0, 1fr))`,
  width: '100%',
}))
</script>

<template>
  <ul
    class="mm-project-grid"
    data-mm-project-list
    data-mm-project-grid
    :data-mm-project-grid-columns="composition.columnCount"
    :data-mm-project-grid-mode="composition.kind"
    :data-mm-works-commit-id="composition.commitId"
    :style="gridStyle"
  >
    <li
      v-for="(project, index) in projects"
      :key="project.id"
      class="mm-project-grid__item"
      data-mm-project-grid-item
      :data-mm-project-slug="project.slug"
    >
      <ProjectCard
        :project="project"
        :index="index"
        :density="composition.cardDensity"
        @detail-activate="emit('detailActivate', $event)"
      />
    </li>
  </ul>
</template>
