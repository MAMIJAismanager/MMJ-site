export type VideoRuntimePreload = 'metadata' | 'auto'

export type VideoWarmupPhase =
  | 'cold'
  | 'metadata'
  | 'queued'
  | 'warming'
  | 'can-play'
  | 'playing'
  | 'settled'
  | 'error'

export type VideoWarmupIntent =
  | 'baseline'
  | 'near-viewport'
  | 'hover'
  | 'focus'
  | 'pointer'
  | 'direct-play'

export type VideoWarmupQueueState =
  | 'none'
  | 'waiting'
  | 'admitted'

export interface VideoWarmupState {
  readonly assetId: string
  readonly phase: VideoWarmupPhase
  readonly intent: VideoWarmupIntent
  readonly preload: VideoRuntimePreload
  readonly sourceGeneration: number
  readonly loadGeneration: number
  readonly queueState: VideoWarmupQueueState
  readonly metadataObserved: boolean
  readonly loadedDataObserved: boolean
  readonly canPlayObserved: boolean
  readonly error: string | null
}

export type VideoWarmupEvent =
  | Readonly<{ type: 'source-reset'; assetId: string; baselinePreload: 'metadata' }>
  | Readonly<{ type: 'intent'; intent: VideoWarmupIntent }>
  | Readonly<{ type: 'queued' }>
  | Readonly<{ type: 'admitted' }>
  | Readonly<{ type: 'preload-auto' }>
  | Readonly<{ type: 'load-started' }>
  | Readonly<{ type: 'metadata-ready' }>
  | Readonly<{ type: 'loaded-data' }>
  | Readonly<{ type: 'can-play' }>
  | Readonly<{ type: 'playing' }>
  | Readonly<{ type: 'settled' }>
  | Readonly<{ type: 'error'; message: string }>

export const VIDEO_WARMUP_ROOT_MARGIN = '640px 0px' as const

export const VIDEO_WARMUP_INTENT_PRIORITY = Object.freeze({
  baseline: 0,
  'near-viewport': 1,
  hover: 2,
  focus: 2,
  pointer: 3,
  'direct-play': 4,
} as const satisfies Readonly<Record<VideoWarmupIntent, number>>)

function freezeState(state: VideoWarmupState): VideoWarmupState {
  return Object.freeze(state)
}

export function createInitialVideoWarmupState(
  assetId: string,
  baselinePreload: 'metadata',
): VideoWarmupState {
  if (typeof assetId !== 'string' || assetId.length === 0) {
    throw new TypeError('assetId must be a non-empty string')
  }
  if (baselinePreload !== 'metadata') {
    throw new TypeError('baselinePreload must be metadata')
  }
  return freezeState({
    assetId,
    phase: 'cold',
    intent: 'baseline',
    preload: baselinePreload,
    sourceGeneration: 0,
    loadGeneration: 0,
    queueState: 'none',
    metadataObserved: false,
    loadedDataObserved: false,
    canPlayObserved: false,
    error: null,
  })
}

export function compareVideoWarmupIntent(
  left: VideoWarmupIntent,
  right: VideoWarmupIntent,
): number {
  return VIDEO_WARMUP_INTENT_PRIORITY[left]
    - VIDEO_WARMUP_INTENT_PRIORITY[right]
}

export function reduceVideoWarmupState(
  state: VideoWarmupState,
  event: VideoWarmupEvent,
): VideoWarmupState {
  switch (event.type) {
    case 'source-reset':
      if (typeof event.assetId !== 'string' || event.assetId.length === 0) {
        throw new TypeError('source-reset assetId must be a non-empty string')
      }
      if (event.baselinePreload !== 'metadata') {
        throw new TypeError('source-reset baselinePreload must be metadata')
      }
      return freezeState({
        assetId: event.assetId,
        phase: 'metadata',
        intent: 'baseline',
        preload: event.baselinePreload,
        sourceGeneration: state.sourceGeneration + 1,
        loadGeneration: 0,
        queueState: 'none',
        metadataObserved: false,
        loadedDataObserved: false,
        canPlayObserved: false,
        error: null,
      })

    case 'intent': {
      const intent = compareVideoWarmupIntent(event.intent, state.intent) > 0
        ? event.intent
        : state.intent
      return intent === state.intent
        ? state
        : freezeState({ ...state, intent })
    }

    case 'queued':
      return freezeState({
        ...state,
        phase: 'queued',
        queueState: 'waiting',
      })

    case 'admitted':
      return freezeState({
        ...state,
        phase: state.canPlayObserved ? 'can-play' : 'warming',
        queueState: 'admitted',
      })

    case 'preload-auto':
      if (state.preload === 'auto') return state
      return freezeState({
        ...state,
        preload: 'auto',
        phase: state.canPlayObserved ? 'can-play' : 'warming',
      })

    case 'load-started':
      return freezeState({
        ...state,
        loadGeneration: state.loadGeneration + 1,
      })

    case 'metadata-ready':
      return freezeState({
        ...state,
        phase: state.preload === 'auto' ? state.phase : 'metadata',
        metadataObserved: true,
      })

    case 'loaded-data':
      return freezeState({
        ...state,
        loadedDataObserved: true,
      })

    case 'can-play':
      return freezeState({
        ...state,
        phase: 'can-play',
        queueState: 'none',
        canPlayObserved: true,
      })

    case 'playing':
      return freezeState({
        ...state,
        phase: 'playing',
        queueState: 'none',
      })

    case 'settled':
      return freezeState({
        ...state,
        phase: 'settled',
        queueState: 'none',
      })

    case 'error':
      if (typeof event.message !== 'string' || event.message.length === 0) {
        throw new TypeError('warmup error message must be non-empty')
      }
      return freezeState({
        ...state,
        phase: 'error',
        queueState: 'none',
        error: event.message,
      })
  }
}
