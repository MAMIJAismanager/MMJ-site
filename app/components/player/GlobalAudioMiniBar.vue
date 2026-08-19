<script setup lang="ts">
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'

import AudioTimeline from '~/components/player/AudioTimeline.vue'
import { useGlobalAudioQueue } from '~/composables/useGlobalAudioQueue'
import { usePlayerStore } from '~/stores/player'
import { formatPlayerTime } from '~/utils/global-audio-runtime'

const player = usePlayerStore()
const {
  bufferedUntilSeconds,
  currentTimeSeconds,
  durationSeconds,
  error,
  muted,
  phase,
  volume,
} = storeToRefs(player)

const {
  currentQueueEntry,
  previousEntry,
  nextEntry,
  playPrevious,
  playNext,
} = useGlobalAudioQueue()

const isPlayingIntent = computed(() => (
  phase.value === 'playing'
  || phase.value === 'play-requested'
))

const presentationDurationSeconds = computed(() => (
  durationSeconds.value
  ?? (currentQueueEntry.value?.track.declaredDurationMs ?? 0) / 1000
))

const currentTimeLabel = computed(() => (
  formatPlayerTime(currentTimeSeconds.value)
))

const durationLabel = computed(() => (
  formatPlayerTime(presentationDurationSeconds.value)
))

const bufferedRatio = computed(() => {
  const duration = presentationDurationSeconds.value
  if (duration <= 0) return 0
  return Math.min(
    1,
    Math.max(0, bufferedUntilSeconds.value / duration),
  )
})

const volumeStyle = computed(() => ({
  '--mm-global-audio-volume': `${Math.round(
    Math.min(1, Math.max(0, volume.value)) * 100,
  )}%`,
}))

function togglePlayback(): void {
  if (isPlayingIntent.value) {
    player.requestPause('user')
    return
  }
  player.requestPlay()
}

function requestSeek(seconds: number): void {
  if (
    currentQueueEntry.value === null
    || durationSeconds.value === null
  ) {
    return
  }
  player.requestSeek(seconds)
}

function toggleMuted(): void {
  player.toggleMuted()
}

function updateVolume(event: Event): void {
  const input = event.currentTarget
  if (!(input instanceof HTMLInputElement)) return
  if (!Number.isFinite(input.valueAsNumber)) return
  player.setVolume(input.valueAsNumber)
}

// R2 relay policy reads the authoritative Player Store phase and reuses the
// same derived queue navigation path as the manual next-track control.
watch(phase, (nextPhase, previousPhase) => {
  if (
    nextPhase !== 'ended'
    || previousPhase === 'ended'
    || nextEntry.value === null
  ) {
    return
  }

  playNext()
})
</script>

<template>
  <section
    v-if="currentQueueEntry !== null"
    class="mm-global-audio-mini-bar"
    data-mm-global-audio-mini-bar
    aria-label="전역 오디오 플레이어"
  >
    <p
      class="mm-global-audio-mini-bar__title"
      aria-live="polite"
    >
      {{ currentQueueEntry.projectTitle }}
    </p>

    <div class="mm-global-audio-mini-bar__transport">
      <button
        class="mm-global-audio-mini-bar__icon-button"
        type="button"
        :disabled="previousEntry === null"
        aria-label="이전 곡"
        @click="playPrevious"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M6 5.5h2.25v13H6zM18 6.2 9.5 12l8.5 5.8z" />
        </svg>
      </button>

      <button
        class="mm-global-audio-mini-bar__icon-button mm-global-audio-mini-bar__icon-button--primary"
        type="button"
        :aria-label="isPlayingIntent ? '일시정지' : '재생'"
        @click="togglePlayback"
      >
        <svg
          v-if="isPlayingIntent"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M7 5.5h3.5v13H7zM13.5 5.5H17v13h-3.5z" />
        </svg>
        <svg
          v-else
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M8 5.25 18 12 8 18.75z" />
        </svg>
      </button>

      <button
        class="mm-global-audio-mini-bar__icon-button"
        type="button"
        :disabled="nextEntry === null"
        aria-label="다음 곡"
        @click="playNext"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M15.75 5.5H18v13h-2.25zM6 6.2l8.5 5.8L6 17.8z" />
        </svg>
      </button>
    </div>

    <div class="mm-global-audio-mini-bar__timeline-row">
      <AudioTimeline
        class="mm-global-audio-mini-bar__timeline"
        :current-time-seconds="currentTimeSeconds"
        :duration-seconds="presentationDurationSeconds"
        :buffered-ratio="bufferedRatio"
        :disabled="durationSeconds === null"
        @seek="requestSeek"
      />
    </div>

    <div class="mm-global-audio-mini-bar__meta-row">
      <div class="mm-global-audio-mini-bar__time-group">
        <span class="mm-global-audio-mini-bar__time">
          {{ currentTimeLabel }}
        </span>
        <span
          class="mm-global-audio-mini-bar__time-separator"
          aria-hidden="true"
        >
          /
        </span>
        <span class="mm-global-audio-mini-bar__time">
          {{ durationLabel }}
        </span>
      </div>

      <div class="mm-global-audio-mini-bar__volume-group">
        <button
          class="mm-global-audio-mini-bar__icon-button mm-global-audio-mini-bar__icon-button--volume"
          type="button"
          :aria-label="muted ? '음소거 해제' : '음소거'"
          :aria-pressed="muted"
          @click="toggleMuted"
        >
          <svg
            v-if="muted || volume === 0"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M4.5 9.25v5.5h3.25L12 18V6L7.75 9.25z" />
            <path
              d="m15.25 9.25 4.5 5.5m0-5.5-4.5 5.5"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-width="1.8"
            />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M4.5 9.25v5.5h3.25L12 18V6L7.75 9.25z" />
            <path
              d="M15.25 9.25c1.45 1.45 1.45 4.05 0 5.5m2.4-7.9c2.8 2.8 2.8 7.5 0 10.3"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-width="1.7"
            />
          </svg>
        </button>

        <input
          class="mm-global-audio-mini-bar__volume"
          type="range"
          min="0"
          max="1"
          step="0.05"
          :value="volume"
          aria-label="오디오 볼륨"
          :style="volumeStyle"
          @input="updateVolume"
        >
      </div>
    </div>

    <p
      v-if="error !== null"
      class="mm-global-audio-mini-bar__error"
      role="status"
    >
      {{ error.message }}
    </p>
  </section>
</template>

<style src="~/assets/css/global-audio-mini-bar.css"></style>
