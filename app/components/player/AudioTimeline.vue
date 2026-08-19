<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface Props {
  readonly currentTimeSeconds: number
  readonly durationSeconds: number
  readonly bufferedRatio: number
  readonly disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

const emit = defineEmits<{
  seek: [seconds: number]
}>()

const editing = ref(false)
const draftSeconds = ref(props.currentTimeSeconds)

function clampToDuration(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  if (!Number.isFinite(props.durationSeconds) || props.durationSeconds <= 0) return 0
  return Math.min(props.durationSeconds, value)
}

watch(
  () => props.currentTimeSeconds,
  value => {
    if (!editing.value) draftSeconds.value = clampToDuration(value)
  },
)

watch(
  () => props.durationSeconds,
  () => {
    if (!editing.value) {
      draftSeconds.value = clampToDuration(props.currentTimeSeconds)
    }
  },
)

const progressPercent = computed(() => {
  if (props.durationSeconds <= 0) return 0
  const seconds = editing.value
    ? draftSeconds.value
    : props.currentTimeSeconds
  return Math.min(100, Math.max(0, seconds / props.durationSeconds * 100))
})

const bufferedPercent = computed(() => (
  Math.min(
    100,
    Math.max(
      progressPercent.value,
      Math.max(0, props.bufferedRatio) * 100,
    ),
  )
))

const trackStyle = computed(() => ({
  '--mm-audio-progress': `${progressPercent.value}%`,
  '--mm-audio-buffered': `${bufferedPercent.value}%`,
}))

function beginEditing(): void {
  if (props.disabled) return
  editing.value = true
  draftSeconds.value = clampToDuration(props.currentTimeSeconds)
}

function updateDraft(event: Event): void {
  const input = event.currentTarget
  if (!(input instanceof HTMLInputElement)) return
  if (!Number.isFinite(input.valueAsNumber)) return
  editing.value = true
  draftSeconds.value = clampToDuration(input.valueAsNumber)
}

function commitSeek(): void {
  if (props.disabled) return
  const next = clampToDuration(draftSeconds.value)
  editing.value = false
  emit('seek', next)
}

function cancelEditing(): void {
  editing.value = false
  draftSeconds.value = clampToDuration(props.currentTimeSeconds)
}
</script>

<template>
  <input
    class="mm-audio-inline-player__seek"
    type="range"
    min="0"
    :max="durationSeconds"
    step="0.1"
    :value="editing ? draftSeconds : currentTimeSeconds"
    :disabled="disabled || durationSeconds <= 0"
    aria-label="오디오 재생 위치"
    :aria-valuetext="`${Math.floor(editing ? draftSeconds : currentTimeSeconds)}초 / ${Math.floor(durationSeconds)}초`"
    :style="trackStyle"
    @pointerdown="beginEditing"
    @focus="beginEditing"
    @input="updateDraft"
    @change="commitSeek"
    @blur="cancelEditing"
  >
</template>
