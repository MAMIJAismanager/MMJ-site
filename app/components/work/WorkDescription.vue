<script setup lang="ts">
import { computed } from 'vue'

import {
  segmentWorkDescriptionInline,
} from '~/utils/work-description-inline'

interface Props {
  readonly description: string
}

const props = defineProps<Props>()
const segments = computed(() => segmentWorkDescriptionInline(props.description))
</script>

<template>
  <section
    class="mm-work-section mm-work-description"
    data-mm-work-description
  >
    <h2 class="mm-work-section__title">
      프로젝트 소개
    </h2>
    <p class="mm-work-description__body">
      <template
        v-for="(segment, index) in segments"
        :key="`${segment.kind}:${index}`"
      >
        <a
          v-if="segment.kind === 'external-link'"
          class="mm-work-description__link"
          :href="segment.href"
          target="_blank"
          rel="noopener noreferrer"
        >{{ segment.value }}</a><span v-else>{{ segment.value }}</span>
      </template>
    </p>
  </section>
</template>
