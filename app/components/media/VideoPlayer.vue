<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'

import ResponsiveImage from './ResponsiveImage.vue'

import { useCrossMediaArbitration } from '~/composables/useCrossMediaArbitration'

import {
  createInitialVideoPlayerState,
  mapMediaErrorCode,
  reduceVideoPlayerState,
} from '~/utils/video-player-state'

import type {
  CrossMediaVideoRegistration,
} from '~/types/cross-media-arbitration'
import type {
  ResponsiveImageLoadState,
} from '~~/shared/types/responsive-image'
import type {
  VideoPlayerPresentation,
} from '~~/shared/types/video-player'
import type {
  VideoPlayerRuntimeEvent,
  VideoPlayerRuntimeState,
} from '~/utils/video-player-state'

interface Props {
  readonly presentation: VideoPlayerPresentation
}

interface Emits {
  (event: 'playback-started'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const arbitration = useCrossMediaArbitration()
const playerElement = ref<HTMLElement | null>(null)
const videoElement = ref<HTMLVideoElement | null>(null)
const muted = ref(false)
const runtimeState = ref<VideoPlayerRuntimeState>(
  createInitialVideoPlayerState(props.presentation.posterPlan !== null),
)
let arbitrationRegistration: CrossMediaVideoRegistration | null = null

function pauseForAudioPlayback(): void {
  const video = videoElement.value
  if (video === null || video.paused) return
  video.pause()
}

const arbitrationEndpoint = Object.freeze({
  get assetId(): string {
    return props.presentation.assetId
  },
  pauseForAudioPlayback,
})

const controlsVisible = computed(() => (
  runtimeState.value.activation === 'complete'
))
const activationVisible = computed(() => (
  runtimeState.value.activation !== 'complete'
))
const activationPending = computed(() => (
  runtimeState.value.activation === 'pending'
))
const isPlaying = computed(() => runtimeState.value.playback === 'playing')
const seekMaximum = computed(() => runtimeState.value.durationSeconds ?? 0)
const frameStyle = computed(() => ({
  '--mm-video-player-ratio': `${props.presentation.intrinsicSize.width} / ${props.presentation.intrinsicSize.height}`,
}))

function formatTime(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value < 0) return '--:--'
  const totalSeconds = Math.floor(value)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const currentTimeLabel = computed(() => formatTime(runtimeState.value.currentTimeSeconds))
const durationLabel = computed(() => formatTime(runtimeState.value.durationSeconds))

function dispatch(event: VideoPlayerRuntimeEvent): void {
  runtimeState.value = reduceVideoPlayerState(runtimeState.value, event)
}

function mediaErrorMessage(code: ReturnType<typeof mapMediaErrorCode>): string {
  switch (code) {
    case 'aborted':
      return '영상 불러오기가 중단되었습니다.'
    case 'network':
      return '네트워크 문제로 영상을 불러오지 못했습니다.'
    case 'decode':
      return '영상 디코딩에 실패했습니다.'
    case 'source-not-supported':
      return '이 브라우저에서 지원하는 영상 소스가 없습니다.'
    case 'play-rejected':
      return '브라우저가 영상 재생 요청을 허용하지 않았습니다.'
    case 'invalid-runtime-observation':
      return '영상 재생 상태를 올바르게 확인하지 못했습니다.'
    case 'unknown-media-error':
      return '영상을 재생하지 못했습니다.'
  }
}

function onPosterStateChange(state: ResponsiveImageLoadState): void {
  dispatch({ type: 'poster-state', state })
}

async function startPlayback(): Promise<void> {
  const video = videoElement.value
  if (video === null || runtimeState.value.activation === 'pending') return

  if (runtimeState.value.activation === 'required') {
    dispatch({ type: 'play-requested' })
  }
  if (runtimeState.value.playback === 'ended') {
    video.currentTime = 0
    dispatch({ type: 'time-update', currentTimeSeconds: 0 })
  }

  try {
    await video.play()
  } catch {
    dispatch({
      type: 'media-error',
      code: 'play-rejected',
      message: mediaErrorMessage('play-rejected'),
    })
  }
}

async function requestPlayback(): Promise<void> {
  if (runtimeState.value.activation !== 'required') return
  await startPlayback()
}

function togglePlayback(): void {
  const video = videoElement.value
  if (video === null) return
  if (runtimeState.value.playback === 'playing') {
    video.pause()
    return
  }
  void startPlayback()
}

function onSeekInput(event: Event): void {
  const video = videoElement.value
  const input = event.currentTarget
  if (video === null || !(input instanceof HTMLInputElement)) return
  const nextTime = Number(input.value)
  const duration = runtimeState.value.durationSeconds
  if (
    duration === null
    || !Number.isFinite(nextTime)
    || nextTime < 0
    || nextTime > duration
  ) return
  video.currentTime = nextTime
  dispatch({ type: 'time-update', currentTimeSeconds: nextTime })
}

function toggleMute(): void {
  const video = videoElement.value
  if (video === null) return
  video.muted = !video.muted
  muted.value = video.muted || video.volume === 0
}

function onVolumeChange(): void {
  const video = videoElement.value
  if (video === null) return
  muted.value = video.muted || video.volume === 0
}

async function toggleFullscreen(): Promise<void> {
  const player = playerElement.value
  if (player === null) return
  try {
    if (document.fullscreenElement === player) {
      await document.exitFullscreen()
    } else if (player.requestFullscreen) {
      await player.requestFullscreen()
    }
  } catch {
    // Fullscreen is optional; playback remains authoritative when denied.
  }
}

function onPlay(): void {
  dispatch({ type: 'play-started' })
  try {
    arbitrationRegistration?.playbackStarted()
  } catch {
    videoElement.value?.pause()
    dispatch({
      type: 'media-error',
      code: 'invalid-runtime-observation',
      message: mediaErrorMessage('invalid-runtime-observation'),
    })
    return
  }
  emit('playback-started')
  void nextTick(() => {
    videoElement.value?.focus({ preventScroll: true })
  })
}

function onPause(): void {
  dispatch({ type: 'paused' })
  arbitrationRegistration?.playbackPaused()
}

function onEnded(): void {
  dispatch({ type: 'ended' })
  arbitrationRegistration?.playbackEnded()
}

function onMetadataObservation(): void {
  const video = videoElement.value
  if (video === null) return
  if (!Number.isFinite(video.duration) || video.duration <= 0) {
    dispatch({
      type: 'media-error',
      code: 'invalid-runtime-observation',
      message: mediaErrorMessage('invalid-runtime-observation'),
    })
    return
  }
  dispatch({ type: 'metadata-ready', durationSeconds: video.duration })
}

function onTimeUpdate(): void {
  const video = videoElement.value
  if (video === null) return
  if (!Number.isFinite(video.currentTime) || video.currentTime < 0) {
    dispatch({
      type: 'media-error',
      code: 'invalid-runtime-observation',
      message: mediaErrorMessage('invalid-runtime-observation'),
    })
    return
  }
  dispatch({ type: 'time-update', currentTimeSeconds: video.currentTime })
}

function onMediaError(): void {
  const code = mapMediaErrorCode(videoElement.value?.error?.code ?? null)
  dispatch({
    type: 'media-error',
    code,
    message: mediaErrorMessage(code),
  })
}

function onFullscreenChange(): void {
  dispatch({
    type: 'fullscreen-change',
    fullscreen: document.fullscreenElement === playerElement.value,
  })
}

function releaseVideoSources(): void {
  const video = videoElement.value
  if (video === null) return
  video.pause()
  for (const source of video.querySelectorAll('source')) {
    source.removeAttribute('src')
  }
  video.removeAttribute('src')
  video.load()
}

watch(
  () => props.presentation,
  presentation => {
    arbitrationRegistration?.playbackPaused()
    releaseVideoSources()
    muted.value = false
    dispatch({
      type: 'source-reset',
      hasPoster: presentation.posterPlan !== null,
    })
    void nextTick(() => {
      videoElement.value?.load()
    })
  },
)

onMounted(() => {
  arbitrationRegistration = arbitration.registerVideo(arbitrationEndpoint)
  document.addEventListener('fullscreenchange', onFullscreenChange)
})

onBeforeUnmount(() => {
  arbitrationRegistration?.dispose()
  arbitrationRegistration = null
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  releaseVideoSources()
})
</script>

<template>
  <div
    ref="playerElement"
    class="mm-video-player"
    :style="frameStyle"
    :data-mm-video-player-state="runtimeState.playback"
    :data-mm-video-player-activation="runtimeState.activation"
    :data-mm-video-player-readiness="runtimeState.readiness"
    data-mm-video-download-ui="denied"
    @contextmenu.prevent
  >
    <video
      ref="videoElement"
      class="mm-video-player__video"
      :aria-label="presentation.label"
      :controls="false"
      controlslist="nodownload noplaybackrate noremoteplayback"
      disablepictureinpicture
      disableremoteplayback
      :playsinline="presentation.playsInline"
      preload="none"
      @click="togglePlayback"
      @contextmenu.prevent
      @dragstart.prevent
      @loadedmetadata="onMetadataObservation"
      @durationchange="onMetadataObservation"
      @timeupdate="onTimeUpdate"
      @volumechange="onVolumeChange"
      @play="onPlay"
      @pause="onPause"
      @ended="onEnded"
      @error="onMediaError"
    >
      <source
        v-for="source in presentation.sources"
        :key="source.renditionId"
        :src="source.url"
        :type="source.mediaType"
      >
      이 브라우저는 HTML 비디오를 지원하지 않습니다.
    </video>

    <div
      v-if="activationVisible"
      class="mm-video-player__activation"
      data-mm-video-player-activation-overlay
      @contextmenu.prevent
    >
      <ResponsiveImage
        v-if="presentation.posterPlan !== null"
        class="mm-video-player__poster"
        :plan="presentation.posterPlan"
        @state-change="onPosterStateChange"
      />
      <div
        v-else
        class="mm-video-player__poster-placeholder mm-dark-surface"
        aria-hidden="true"
      />
      <button
        class="mm-video-player__play"
        type="button"
        :disabled="activationPending"
        @click="requestPlayback"
      >
        {{ presentation.label }} 재생
      </button>
    </div>

    <div
      v-if="controlsVisible"
      class="mm-video-player__controls"
      data-mm-video-custom-controls
      @click.stop
      @contextmenu.prevent
    >
      <button
        class="mm-video-player__control-button"
        type="button"
        :aria-label="isPlaying ? '일시정지' : '재생'"
        :title="isPlaying ? '일시정지' : '재생'"
        @click="togglePlayback"
      >
        <span aria-hidden="true">{{ isPlaying ? 'Ⅱ' : '▶' }}</span>
      </button>

      <label class="mm-video-player__timeline">
        <span class="mm-video-player__sr-only">재생 위치</span>
        <input
          class="mm-video-player__range"
          type="range"
          min="0"
          :max="seekMaximum"
          step="0.05"
          :value="runtimeState.currentTimeSeconds"
          :disabled="runtimeState.durationSeconds === null"
          @input="onSeekInput"
        >
      </label>

      <output class="mm-video-player__time" aria-live="off">
        {{ currentTimeLabel }} / {{ durationLabel }}
      </output>

      <button
        class="mm-video-player__control-button mm-video-player__control-button--text"
        type="button"
        :aria-label="muted ? '음소거 해제' : '음소거'"
        :title="muted ? '음소거 해제' : '음소거'"
        @click="toggleMute"
      >
        {{ muted ? '소리 켜기' : '음소거' }}
      </button>

      <button
        class="mm-video-player__control-button mm-video-player__control-button--text"
        type="button"
        :aria-label="runtimeState.fullscreen ? '전체화면 종료' : '전체화면'"
        :title="runtimeState.fullscreen ? '전체화면 종료' : '전체화면'"
        @click="toggleFullscreen"
      >
        {{ runtimeState.fullscreen ? '화면 복귀' : '전체화면' }}
      </button>
    </div>

    <p
      v-if="runtimeState.error !== null"
      class="mm-video-player__error"
      role="status"
    >
      {{ runtimeState.error.message }}
    </p>
  </div>
</template>

<style src="~/assets/css/video-player.css"></style>
