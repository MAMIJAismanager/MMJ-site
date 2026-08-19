<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import AudioTimeline from '~/components/player/AudioTimeline.vue'
import { usePlayerStore } from '~/stores/player'
import {
  decideAudioTrackAction,
  formatPlayerTime,
} from '~/utils/global-audio-runtime'

import type { PlayerTrack } from '~~/shared/types/player-store'

interface Props {
  readonly track: PlayerTrack
}

const props = defineProps<Props>()
const player = usePlayerStore()
const {
  bufferedUntilSeconds,
  currentTimeSeconds,
  currentTrack,
  durationSeconds,
  error,
  muted,
  phase,
  volume,
} = storeToRefs(player)

const isCurrentTrack = computed(() => (
  currentTrack.value !== null
  && currentTrack.value.trackId === props.track.trackId
  && currentTrack.value.projectId === props.track.projectId
))

const isPlayingIntent = computed(() => (
  isCurrentTrack.value
  && (phase.value === 'playing' || phase.value === 'play-requested')
))

const presentationDurationSeconds = computed(() => {
  if (isCurrentTrack.value && durationSeconds.value !== null) {
    return durationSeconds.value
  }
  return props.track.declaredDurationMs / 1000
})

const presentationCurrentTimeSeconds = computed(() => (
  isCurrentTrack.value ? currentTimeSeconds.value : 0
))

const bufferedRatio = computed(() => {
  const duration = presentationDurationSeconds.value
  if (!isCurrentTrack.value || duration <= 0) return 0
  return Math.min(1, Math.max(0, bufferedUntilSeconds.value / duration))
})

const currentTimeLabel = computed(() => (
  formatPlayerTime(presentationCurrentTimeSeconds.value)
))

const durationLabel = computed(() => (
  formatPlayerTime(presentationDurationSeconds.value)
))

const volumePercent = computed(() => (
  `${Math.round(Math.min(1, Math.max(0, volume.value)) * 100)}%`
))

const volumeStyle = computed(() => ({
  '--mm-audio-volume': volumePercent.value,
}))

function togglePlayback(): void {
  const decision = decideAudioTrackAction(
    currentTrack.value,
    phase.value,
    props.track,
  )

  switch (decision) {
    case 'select-and-play':
      player.selectTrack(props.track)
      player.requestPlay()
      return
    case 'pause':
      player.requestPause('user')
      return
    case 'play':
      player.requestPlay()
  }
}

function requestSeek(seconds: number): void {
  if (!isCurrentTrack.value) return
  player.requestSeek(seconds)
}

function toggleMuted(): void {
  if (!isCurrentTrack.value) return
  player.toggleMuted()
}

function updateVolume(event: Event): void {
  if (!isCurrentTrack.value) return
  const input = event.currentTarget
  if (!(input instanceof HTMLInputElement)) return
  if (!Number.isFinite(input.valueAsNumber)) return
  player.setVolume(input.valueAsNumber)
}
</script>

<template>
  <section
    class="mm-audio-inline-player"
    data-mm-audio-inline-player
    :data-mm-inline-audio-active="isCurrentTrack ? 'true' : 'false'"
    :aria-label="`${track.label} 오디오 플레이어`"
  >
    <button
      class="mm-audio-inline-player__icon-button"
      type="button"
      :aria-label="isPlayingIntent ? `${track.label} 일시정지` : `${track.label} 재생`"
      @click="togglePlayback"
    >
      <svg
        v-if="isPlayingIntent"
        class="mm-audio-inline-player__icon"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M7 5.5h3.5v13H7zM13.5 5.5H17v13h-3.5z" />
      </svg>
      <svg
        v-else
        class="mm-audio-inline-player__icon"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M8 5.25 18 12 8 18.75z" />
      </svg>
    </button>

    <span class="mm-audio-inline-player__time">
      {{ currentTimeLabel }}
    </span>

    <AudioTimeline
      class="mm-audio-inline-player__timeline"
      :current-time-seconds="presentationCurrentTimeSeconds"
      :duration-seconds="presentationDurationSeconds"
      :buffered-ratio="bufferedRatio"
      :disabled="!isCurrentTrack"
      @seek="requestSeek"
    />

    <span class="mm-audio-inline-player__time">
      {{ durationLabel }}
    </span>

    <button
      class="mm-audio-inline-player__icon-button"
      type="button"
      :disabled="!isCurrentTrack"
      :aria-label="muted ? '음소거 해제' : '음소거'"
      :aria-pressed="muted"
      @click="toggleMuted"
    >
      <svg
        v-if="muted || volume === 0"
        class="mm-audio-inline-player__icon"
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
        class="mm-audio-inline-player__icon"
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
      class="mm-audio-inline-player__volume"
      type="range"
      min="0"
      max="1"
      step="0.05"
      :value="volume"
      :disabled="!isCurrentTrack"
      aria-label="오디오 볼륨"
      :style="volumeStyle"
      @input="updateVolume"
    >

    <p
      v-if="isCurrentTrack && error !== null"
      class="mm-audio-inline-player__error"
      role="status"
    >
      {{ error.message }}
    </p>
  </section>
</template>

<style src="~/assets/css/audio-inline-player.css"></style>
