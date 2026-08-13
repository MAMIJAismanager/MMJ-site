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
import { useVideoWarmupAuthority } from '~/composables/useVideoWarmupAuthority'

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

type VideoFrameCallbackVideo = HTMLVideoElement & Readonly<{
  requestVideoFrameCallback?: (
    callback: (now: number, metadata: unknown) => void,
  ) => number
  cancelVideoFrameCallback?: (handle: number) => void
}>

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const arbitration = useCrossMediaArbitration()
const playerElement = ref<HTMLElement | null>(null)
const videoElement = ref<HTMLVideoElement | null>(null)
const muted = ref(false)
const runtimeState = ref<VideoPlayerRuntimeState>(
  createInitialVideoPlayerState(props.presentation.posterPlan !== null),
)
const assetId = computed(() => String(props.presentation.assetId))
const baselinePreload = computed(() => props.presentation.preload)
const sourceIdentity = computed(() => [
  props.presentation.assetId,
  ...props.presentation.sources.map(source => (
    `${source.renditionId}|${source.url}|${source.mediaType}|${source.width}x${source.height}|${source.durationMs}|${source.hasAudio ? 'audio' : 'silent'}|${source.isDefault ? 'default' : 'alternate'}`
  )),
].join('::'))
const warmup = useVideoWarmupAuthority({
  assetId,
  baselinePreload,
  playerElement,
  videoElement,
})
const warmupState = warmup.state
let arbitrationRegistration: CrossMediaVideoRegistration | null = null
let frameCallbackHandle: number | null = null

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

function cancelFirstFrameCallback(): void {
  if (frameCallbackHandle === null) return
  const video = videoElement.value as VideoFrameCallbackVideo | null
  video?.cancelVideoFrameCallback?.(frameCallbackHandle)
  frameCallbackHandle = null
}

function confirmFallbackFirstFrame(): void {
  if (
    runtimeState.value.firstFrame !== 'pending'
    || !runtimeState.value.loadedDataObserved
    || !runtimeState.value.playingObserved
  ) return
  const video = videoElement.value as VideoFrameCallbackVideo | null
  if (video?.requestVideoFrameCallback !== undefined) return
  dispatch({
    type: 'first-frame-presented',
    mode: 'loaded-data-playing',
  })
}

function scheduleFirstFrameReceipt(): void {
  if (runtimeState.value.firstFrame === 'presented') return
  const video = videoElement.value as VideoFrameCallbackVideo | null
  if (video === null) return
  if (typeof video.requestVideoFrameCallback !== 'function') {
    confirmFallbackFirstFrame()
    return
  }
  if (frameCallbackHandle !== null) return

  const generation = warmupState.value.sourceGeneration
  frameCallbackHandle = video.requestVideoFrameCallback(() => {
    frameCallbackHandle = null
    if (
      generation !== warmupState.value.sourceGeneration
      || runtimeState.value.firstFrame === 'presented'
    ) return
    dispatch({
      type: 'first-frame-presented',
      mode: 'video-frame-callback',
    })
  })
}

async function startPlayback(): Promise<void> {
  const video = videoElement.value
  if (video === null || runtimeState.value.activation === 'pending') return

  if (runtimeState.value.activation === 'required') {
    dispatch({ type: 'play-requested' })
    warmup.requestDirectPlay()
  }
  if (runtimeState.value.playback === 'ended') {
    video.currentTime = 0
    dispatch({ type: 'time-update', currentTimeSeconds: 0 })
  }

  try {
    await video.play()
  } catch {
    warmup.noteError('play-rejected')
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
  dispatch({ type: 'native-play' })
  try {
    arbitrationRegistration?.playbackStarted()
  } catch {
    videoElement.value?.pause()
    warmup.noteError('invalid-runtime-observation')
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

function onPlaying(): void {
  dispatch({ type: 'playing' })
  warmup.notePlaying()
  scheduleFirstFrameReceipt()
  confirmFallbackFirstFrame()
}

function onPause(): void {
  dispatch({ type: 'paused' })
  warmup.notePaused()
  arbitrationRegistration?.playbackPaused()
}

function onEnded(): void {
  dispatch({ type: 'ended' })
  warmup.noteSettled()
  arbitrationRegistration?.playbackEnded()
}

function onMetadataObservation(): void {
  const video = videoElement.value
  if (video === null) return
  if (!Number.isFinite(video.duration) || video.duration <= 0) {
    warmup.noteError('invalid-runtime-observation')
    dispatch({
      type: 'media-error',
      code: 'invalid-runtime-observation',
      message: mediaErrorMessage('invalid-runtime-observation'),
    })
    return
  }
  warmup.noteMetadataReady()
  dispatch({ type: 'metadata-ready', durationSeconds: video.duration })
}

function onLoadedData(): void {
  warmup.noteLoadedData()
  dispatch({ type: 'loaded-data' })
  confirmFallbackFirstFrame()
}

function onCanPlay(): void {
  warmup.noteCanPlay()
  dispatch({ type: 'can-play' })
}

function onWaiting(): void {
  dispatch({ type: 'waiting' })
}

function onStalled(): void {
  dispatch({ type: 'stalled' })
}

function onTimeUpdate(): void {
  const video = videoElement.value
  if (video === null) return
  if (!Number.isFinite(video.currentTime) || video.currentTime < 0) {
    warmup.noteError('invalid-runtime-observation')
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
  warmup.noteError(code)
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

function onPlayerPointerEnter(event: PointerEvent): void {
  if (event.pointerType === 'mouse') warmup.requestHover()
}

function onPlayerPointerDown(event: PointerEvent): void {
  if (event.pointerType === 'touch' || event.pointerType === 'pen') {
    warmup.requestPointer()
  }
}

function onPlayerFocusIn(): void {
  warmup.requestFocus()
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
  sourceIdentity,
  async () => {
    cancelFirstFrameCallback()
    arbitrationRegistration?.playbackPaused()
    warmup.notePaused()
    muted.value = false
    warmup.resetSource()
    dispatch({
      type: 'source-reset',
      hasPoster: props.presentation.posterPlan !== null,
    })
    await nextTick()
    const video = videoElement.value
    if (video !== null) {
      video.preload = warmupState.value.preload
      video.load()
      warmup.noteExplicitLoad()
    }
  },
)

onMounted(() => {
  arbitrationRegistration = arbitration.registerVideo(arbitrationEndpoint)
  document.addEventListener('fullscreenchange', onFullscreenChange)
})

onBeforeUnmount(() => {
  cancelFirstFrameCallback()
  warmup.notePaused()
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
    :data-mm-video-buffering="runtimeState.buffering"
    :data-mm-video-first-frame="runtimeState.firstFrame"
    :data-mm-video-frame-receipt-mode="runtimeState.frameReceiptMode ?? 'pending'"
    :data-mm-video-warmup-phase="warmupState.phase"
    :data-mm-video-warmup-intent="warmupState.intent"
    :data-mm-video-preload="warmupState.preload"
    :aria-busy="activationPending ? 'true' : 'false'"
    data-mm-video-download-ui="denied"
    @pointerenter="onPlayerPointerEnter"
    @pointerdown="onPlayerPointerDown"
    @focusin="onPlayerFocusIn"
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
      :preload="warmupState.preload"
      @click="togglePlayback"
      @contextmenu.prevent
      @dragstart.prevent
      @loadedmetadata="onMetadataObservation"
      @durationchange="onMetadataObservation"
      @loadeddata="onLoadedData"
      @canplay="onCanPlay"
      @waiting="onWaiting"
      @stalled="onStalled"
      @playing="onPlaying"
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
