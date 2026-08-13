import {
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue'

import {
  createVideoWarmupCoordinator,
} from '~/utils/video-warmup-coordinator'
import {
  VIDEO_WARMUP_ROOT_MARGIN,
  createInitialVideoWarmupState,
  reduceVideoWarmupState,
} from '~/utils/video-warmup-state'

import type {
  Ref,
} from 'vue'
import type {
  VideoWarmupRegistrationHandle,
} from '~/utils/video-warmup-coordinator'
import type {
  VideoWarmupEvent,
  VideoWarmupIntent,
  VideoWarmupState,
} from '~/utils/video-warmup-state'

interface VideoWarmupAuthorityOptions {
  readonly assetId: Readonly<Ref<string>>
  readonly baselinePreload: Readonly<Ref<'metadata'>>
  readonly playerElement: Ref<HTMLElement | null>
  readonly videoElement: Ref<HTMLVideoElement | null>
}

let registrationSerial = 0
const sharedCoordinator = createVideoWarmupCoordinator()

export function useVideoWarmupAuthority(
  options: VideoWarmupAuthorityOptions,
) {
  const state = ref<VideoWarmupState>(
    createInitialVideoWarmupState(
      options.assetId.value,
      options.baselinePreload.value,
    ),
  )
  let registration: VideoWarmupRegistrationHandle | null = null
  let observer: IntersectionObserver | null = null
  const registrationId = `mm-video-warmup-${++registrationSerial}`

  function dispatch(event: VideoWarmupEvent): void {
    state.value = reduceVideoWarmupState(state.value, event)
  }

  function promoteToAuto(): void {
    if (state.value.preload === 'auto') return
    dispatch({ type: 'preload-auto' })
    const video = options.videoElement.value
    if (video === null) return
    video.preload = 'auto'
    const needsSelectionRestart =
      video.readyState < video.HAVE_FUTURE_DATA
      && video.networkState !== video.NETWORK_LOADING
    if (needsSelectionRestart) {
      video.load()
      dispatch({ type: 'load-started' })
    }
  }

  function beginWarmup(): void {
    dispatch({ type: 'admitted' })
    promoteToAuto()
  }

  function request(intent: VideoWarmupIntent): void {
    dispatch({ type: 'intent', intent })
    const disposition = registration?.request(intent)
    if (disposition === 'queued') {
      dispatch({ type: 'queued' })
    } else if (disposition === 'admitted') {
      dispatch({ type: 'admitted' })
    } else if (registration === null && intent === 'direct-play') {
      beginWarmup()
    }
  }

  function requestHover(): void {
    request('hover')
  }

  function requestFocus(): void {
    request('focus')
  }

  function requestPointer(): void {
    request('pointer')
  }

  function requestDirectPlay(): void {
    request('direct-play')
  }

  function noteMetadataReady(): void {
    dispatch({ type: 'metadata-ready' })
  }

  function noteLoadedData(): void {
    dispatch({ type: 'loaded-data' })
  }

  function noteCanPlay(): void {
    dispatch({ type: 'can-play' })
    registration?.markCanPlay()
  }

  function notePlaying(): void {
    dispatch({ type: 'playing' })
    registration?.setPlaybackActive(true)
  }

  function notePaused(): void {
    registration?.setPlaybackActive(false)
  }

  function noteSettled(): void {
    dispatch({ type: 'settled' })
    registration?.setPlaybackActive(false)
  }

  function noteError(message: string): void {
    dispatch({ type: 'error', message })
    registration?.markFailed()
  }

  function noteExplicitLoad(): void {
    dispatch({ type: 'load-started' })
  }

  function resetSource(): void {
    registration?.reset()
    dispatch({
      type: 'source-reset',
      assetId: options.assetId.value,
      baselinePreload: options.baselinePreload.value,
    })
    const video = options.videoElement.value
    if (video !== null) video.preload = options.baselinePreload.value
  }

  onMounted(() => {
    registration = sharedCoordinator.register({
      registrationId,
      assetId: options.assetId.value,
      beginWarmup,
    })

    const target = options.playerElement.value
    if (target !== null && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        entries => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue
            request('near-viewport')
            observer?.unobserve(entry.target)
          }
        },
        {
          root: null,
          rootMargin: VIDEO_WARMUP_ROOT_MARGIN,
          threshold: 0,
        },
      )
      observer.observe(target)
    }
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
    registration?.dispose()
    registration = null
  })

  return Object.freeze({
    state,
    requestHover,
    requestFocus,
    requestPointer,
    requestDirectPlay,
    noteMetadataReady,
    noteLoadedData,
    noteCanPlay,
    notePlaying,
    notePaused,
    noteSettled,
    noteError,
    noteExplicitLoad,
    resetSource,
  })
}
