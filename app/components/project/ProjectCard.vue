<script setup lang="ts">
import { ref } from 'vue'

import {
  isEligibleSameTabDetailActivation,
} from '~/utils/navigation-restoration'

import type {
  ProjectDetailActivationPayload,
} from '~/types/navigation-restoration'

import type {
  ProjectCardView,
} from '~~/shared/view/portfolio-project-view'

import type {
  WorksCardDensity,
} from '~/works/works-layout-profile'
import type {
  WorksCardPhysicalReceipt,
} from '~/works/works-card-physical'

import ProjectCardMedia from './ProjectCardMedia.vue'
import ProjectCardMetadata from './ProjectCardMetadata.vue'

interface ProjectCardProps {
  readonly project: ProjectCardView
  readonly index: number
  readonly density: WorksCardDensity
}

type NuxtNavigate = (event?: MouseEvent) => Promise<unknown>

interface ProjectCardMetadataReader {
  readMetadataBlockPx(): number
}

const props = defineProps<ProjectCardProps>()

const emit = defineEmits<{
  detailActivate: [payload: ProjectDetailActivationPayload]
}>()

const cardElement = ref<HTMLElement | null>(null)
const metadataReader = ref<ProjectCardMetadataReader | null>(null)

function readPhysicalReceipt(): WorksCardPhysicalReceipt | null {
  const element = cardElement.value
  if (!(element instanceof HTMLElement)) return null

  return Object.freeze({
    projectId: props.project.id,
    cardBlockPx: Math.max(
      element.clientHeight,
      element.getBoundingClientRect().height,
    ),
    metadataBlockPx: metadataReader.value?.readMetadataBlockPx() ?? 0,
  })
}

defineExpose({
  readPhysicalReceipt,
})

function onDetailActivate(event: MouseEvent): void {
  emit('detailActivate', {
    event,
    projectId: props.project.id,
    href: props.project.href,
  })
}

function onControlledNuxtFallback(
  event: MouseEvent,
  navigate: NuxtNavigate,
): void {
  if (!isEligibleSameTabDetailActivation(event)) return
  void navigate(event)
}
</script>

<template>
  <article
    ref="cardElement"
    class="mm-project-card"
    data-mm-project-card
    :data-mm-project-card-density="density"
  >
    <NuxtLink
      v-slot="{ href, navigate }"
      :to="project.href"
      custom
    >
      <a
        class="mm-project-card__link mm-dark-surface"
        :href="href"
        data-mm-project-card-link
        :data-mm-project-id="project.id"
        :data-mm-project-slug="project.slug"
        @click.capture="onDetailActivate"
        @click="onControlledNuxtFallback($event, navigate)"
      >
        <ProjectCardMedia
          :cover="project.cover"
          :index="index"
        />
        <ProjectCardMetadata
          ref="metadataReader"
          :project="project"
        />
      </a>
    </NuxtLink>
  </article>
</template>
