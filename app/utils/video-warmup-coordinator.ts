import {
  VIDEO_WARMUP_INTENT_PRIORITY,
} from './video-warmup-state'

import type {
  VideoWarmupIntent,
} from './video-warmup-state'

export type VideoWarmupDisposition =
  | 'admitted'
  | 'queued'
  | 'ignored'

export interface VideoWarmupRegistration {
  readonly registrationId: string
  readonly assetId: string
  readonly beginWarmup: () => void
}

export interface VideoWarmupRegistrationHandle {
  request(intent: VideoWarmupIntent): VideoWarmupDisposition
  markCanPlay(): void
  markFailed(): void
  setPlaybackActive(active: boolean): void
  reset(): void
  dispose(): void
}

export interface VideoWarmupCoordinator {
  register(
    registration: VideoWarmupRegistration,
  ): VideoWarmupRegistrationHandle
  readonly backgroundActiveCount: number
  readonly queuedCount: number
  readonly playbackActiveCount: number
}

interface RegistrationState {
  readonly registration: VideoWarmupRegistration
  disposed: boolean
  completed: boolean
  playbackActive: boolean
  intent: VideoWarmupIntent
  serial: number
}

function validateRegistration(
  registration: VideoWarmupRegistration,
): void {
  if (
    registration === null
    || typeof registration !== 'object'
    || typeof registration.registrationId !== 'string'
    || registration.registrationId.length === 0
    || typeof registration.assetId !== 'string'
    || registration.assetId.length === 0
    || typeof registration.beginWarmup !== 'function'
  ) {
    throw new TypeError('invalid video warmup registration')
  }
}

export function createVideoWarmupCoordinator(): VideoWarmupCoordinator {
  const registrations = new Map<string, RegistrationState>()
  const queue = new Set<string>()
  let requestSerial = 0
  let activeBackgroundId: string | null = null

  function activePlaybackCount(): number {
    let count = 0
    for (const state of registrations.values()) {
      if (!state.disposed && state.playbackActive) count += 1
    }
    return count
  }

  function eligibleQueuedStates(): RegistrationState[] {
    const states: RegistrationState[] = []
    for (const registrationId of queue) {
      const state = registrations.get(registrationId)
      if (
        state === undefined
        || state.disposed
        || state.completed
        || state.playbackActive
      ) {
        queue.delete(registrationId)
        continue
      }
      states.push(state)
    }
    states.sort((left, right) => {
      const priorityDelta = VIDEO_WARMUP_INTENT_PRIORITY[right.intent]
        - VIDEO_WARMUP_INTENT_PRIORITY[left.intent]
      if (priorityDelta !== 0) return priorityDelta
      const serialDelta = left.serial - right.serial
      if (serialDelta !== 0) return serialDelta
      return left.registration.registrationId.localeCompare(
        right.registration.registrationId,
      )
    })
    return states
  }

  function drain(): void {
    if (activeBackgroundId !== null || activePlaybackCount() > 0) return
    const next = eligibleQueuedStates()[0]
    if (next === undefined) return
    queue.delete(next.registration.registrationId)
    activeBackgroundId = next.registration.registrationId
    next.registration.beginWarmup()
  }

  function releaseBackground(registrationId: string): void {
    if (activeBackgroundId === registrationId) {
      activeBackgroundId = null
    }
  }

  function register(
    registration: VideoWarmupRegistration,
  ): VideoWarmupRegistrationHandle {
    validateRegistration(registration)
    if (registrations.has(registration.registrationId)) {
      throw new Error(`duplicate video warmup registration: ${registration.registrationId}`)
    }

    const state: RegistrationState = {
      registration,
      disposed: false,
      completed: false,
      playbackActive: false,
      intent: 'baseline',
      serial: 0,
    }
    registrations.set(registration.registrationId, state)

    function assertLive(): boolean {
      return !state.disposed
    }

    function request(intent: VideoWarmupIntent): VideoWarmupDisposition {
      if (!assertLive()) return 'ignored'
      if (VIDEO_WARMUP_INTENT_PRIORITY[intent] > VIDEO_WARMUP_INTENT_PRIORITY[state.intent]) {
        state.intent = intent
      }

      if (intent === 'direct-play') {
        queue.delete(registration.registrationId)
        releaseBackground(registration.registrationId)
        registration.beginWarmup()
        drain()
        return 'admitted'
      }

      if (state.completed) return 'ignored'
      if (activeBackgroundId === registration.registrationId) return 'admitted'

      requestSerial += 1
      state.serial = state.serial === 0 ? requestSerial : state.serial
      queue.add(registration.registrationId)
      drain()
      return activeBackgroundId === registration.registrationId
        ? 'admitted'
        : 'queued'
    }

    function markCanPlay(): void {
      if (!assertLive()) return
      state.completed = true
      queue.delete(registration.registrationId)
      releaseBackground(registration.registrationId)
      drain()
    }

    function markFailed(): void {
      if (!assertLive()) return
      state.completed = true
      state.playbackActive = false
      queue.delete(registration.registrationId)
      releaseBackground(registration.registrationId)
      drain()
    }

    function setPlaybackActive(active: boolean): void {
      if (!assertLive()) return
      state.playbackActive = active
      if (active) {
        queue.delete(registration.registrationId)
        releaseBackground(registration.registrationId)
      }
      drain()
    }

    function reset(): void {
      if (!assertLive()) return
      queue.delete(registration.registrationId)
      releaseBackground(registration.registrationId)
      state.completed = false
      state.playbackActive = false
      state.intent = 'baseline'
      state.serial = 0
      drain()
    }

    function dispose(): void {
      if (!assertLive()) return
      state.disposed = true
      queue.delete(registration.registrationId)
      releaseBackground(registration.registrationId)
      registrations.delete(registration.registrationId)
      drain()
    }

    return Object.freeze({
      request,
      markCanPlay,
      markFailed,
      setPlaybackActive,
      reset,
      dispose,
    })
  }

  return Object.freeze({
    register,
    get backgroundActiveCount(): number {
      return activeBackgroundId === null ? 0 : 1
    },
    get queuedCount(): number {
      return eligibleQueuedStates().length
    },
    get playbackActiveCount(): number {
      return activePlaybackCount()
    },
  })
}
