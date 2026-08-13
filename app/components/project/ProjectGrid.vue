<script setup lang="ts">
import type {
  ProjectDetailActivationPayload,
} from '~/types/navigation-restoration'

import type {
  ProjectCardView,
} from '~~/shared/view/portfolio-project-view'

import type {
  WorksLayoutProfile,
} from '~/works/works-layout-profile'

import ProjectCard from './ProjectCard.vue'

interface ProjectGridProps {
  readonly projects: readonly ProjectCardView[]
  readonly layout: WorksLayoutProfile
}

defineProps<ProjectGridProps>()

const emit = defineEmits<{
  detailActivate: [payload: ProjectDetailActivationPayload]
}>()
</script>

<template>
  <ul
    class="mm-project-grid"
    data-mm-project-list
    data-mm-project-grid
    :data-mm-project-grid-columns="layout.columnCount"
    :data-mm-project-grid-mode="layout.mode"
    :style="{
      gridTemplateColumns:
        `repeat(${layout.columnCount}, minmax(0, 1fr))`,
    }"
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
        :density="layout.cardDensity"
        @detail-activate="emit('detailActivate', $event)"
      />
    </li>
  </ul>
</template>
