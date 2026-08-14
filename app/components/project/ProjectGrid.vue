<script setup lang="ts">
import { ref } from 'vue'

import type {
  ProjectDetailActivationPayload,
} from '~/types/navigation-restoration'

import type {
  ProjectCardView,
} from '~~/shared/view/portfolio-project-view'

import type {
  WorksLayoutProfile,
} from '~/works/works-layout-profile'
import type {
  WorksCardPhysicalReader,
  WorksCardPhysicalReceipt,
} from '~/works/works-card-physical'

import ProjectCard from './ProjectCard.vue'

interface ProjectGridProps {
  readonly projects: readonly ProjectCardView[]
  readonly layout: WorksLayoutProfile
}

defineProps<ProjectGridProps>()

const emit = defineEmits<{
  detailActivate: [payload: ProjectDetailActivationPayload]
}>()

const cardReaders = ref<WorksCardPhysicalReader[]>([])

function readCardPhysicalReceipts(): readonly WorksCardPhysicalReceipt[] {
  const receipts: WorksCardPhysicalReceipt[] = []
  for (const reader of cardReaders.value) {
    const receipt = reader.readPhysicalReceipt()
    if (receipt !== null) receipts.push(receipt)
  }
  return Object.freeze(receipts)
}

defineExpose({
  readCardPhysicalReceipts,
})
</script>

<template>
  <ul
    class="mm-project-grid"
    data-mm-project-list
    data-mm-project-grid
    :data-mm-project-grid-columns="layout.columnCount"
    :data-mm-project-grid-mode="layout.mode"
    :data-mm-project-grid-rows="layout.pageRowCount"
    :data-mm-project-grid-fit="layout.viewportFit.admission"
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
        ref="cardReaders"
        :project="project"
        :index="index"
        :density="layout.cardDensity"
        @detail-activate="emit('detailActivate', $event)"
      />
    </li>
  </ul>
</template>
