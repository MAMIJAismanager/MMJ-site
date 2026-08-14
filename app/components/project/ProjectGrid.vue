<script setup lang="ts">
import { computed } from 'vue'

import type {
  ProjectDetailActivationPayload,
} from '~/types/navigation-restoration'
import type {
  ProjectCardView,
} from '~~/shared/view/portfolio-project-view'
import type {
  WorksGridComposition,
} from '~/works/works-composition-transaction'

import ProjectCard from './ProjectCard.vue'

interface ProjectGridProps {
  readonly projects: readonly ProjectCardView[]
  readonly composition: WorksGridComposition
}

const props = defineProps<ProjectGridProps>()

const emit = defineEmits<{
  detailActivate: [payload: ProjectDetailActivationPayload]
}>()

const gridStyle = computed<Readonly<Record<string, string>>>(() => {
  const composition = props.composition
  if (composition.kind === 'flow') {
    return Object.freeze({
      gridTemplateColumns:
        `repeat(${composition.columnCount}, minmax(0, 1fr))`,
      width: '100%',
    })
  }

  if (composition.kind === 'mobile-committed') {
    return Object.freeze({
      gridTemplateColumns:
        `repeat(${composition.columnCount}, minmax(0, 1fr))`,
      width: '100%',
      '--mm-works-grid-gap': `${composition.gridGapRem}rem`,
      '--mm-works-card-padding': `${composition.cardPaddingRem}rem`,
      '--mm-works-card-title-size': `${composition.cardTitleRem}rem`,
    })
  }

  return Object.freeze({
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    width: `${composition.inlinePx}px`,
    justifySelf: 'center',
    marginInline: 'auto',
    '--mm-works-grid-gap': `${composition.gridGapRem}rem`,
    '--mm-works-card-padding': `${composition.cardPaddingRem}rem`,
    '--mm-works-card-title-size': `${composition.cardTitleRem}rem`,
  })
})
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
