import type {
  AssetMediaTypeFor,
} from '../constants/asset-domain'
import type {
  AssetId,
  ProjectId,
} from './domain-identifiers'
import type {
  ResponsiveImageRenderPlan,
} from './responsive-image'

export interface PlayerTrackSource {
  readonly renditionId: string
  readonly url: string
  readonly mediaType: AssetMediaTypeFor<'audio'>
  readonly byteSize: number
  readonly declaredDurationMs: number
}

export interface PlayerTrack {
  readonly trackId: AssetId
  readonly projectId: ProjectId
  readonly label: string
  readonly sources: readonly PlayerTrackSource[]
  readonly defaultSource: PlayerTrackSource
  readonly declaredDurationMs: number
  readonly artworkPlan: ResponsiveImageRenderPlan | null
}

export type PlayerSourceCapability =
  | 'probably'
  | 'maybe'

export type PlayerSourceAdmissionReason =
  | 'default-supported'
  | 'mp3-compatibility-fallback'
  | 'ordered-supported-fallback'

export interface PlayerSourceAdmission {
  readonly trackEpoch: number
  readonly source: PlayerTrackSource
  readonly capability: PlayerSourceCapability
  readonly reason: PlayerSourceAdmissionReason
}

export type PlayerPhase =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'play-requested'
  | 'playing'
  | 'pause-requested'
  | 'paused'
  | 'ended'
  | 'error'

export type PlayerPauseReason =
  | 'user'
  | 'video-started'

export type PlayerTransportRequest =
  | Readonly<{
      requestId: number
      trackEpoch: number
      kind: 'play'
      reason: 'user'
    }>
  | Readonly<{
      requestId: number
      trackEpoch: number
      kind: 'pause'
      reason: PlayerPauseReason
    }>

export interface PlayerSeekRequest {
  readonly requestId: number
  readonly trackEpoch: number
  readonly timeSeconds: number
}

export type PlayerRuntimeErrorCode =
  | 'aborted'
  | 'network'
  | 'decode'
  | 'source-not-supported'
  | 'no-playable-audio-source'
  | 'play-rejected'
  | 'invalid-runtime-observation'
  | 'unknown-media-error'

export interface PlayerRuntimeError {
  readonly code: PlayerRuntimeErrorCode
  readonly message: string
}

export interface PlayerStoreState {
  readonly schemaVersion: 2
  readonly currentTrack: PlayerTrack | null
  readonly trackEpoch: number
  readonly sourceAdmission: PlayerSourceAdmission | null
  readonly phase: PlayerPhase
  readonly currentTimeSeconds: number
  readonly durationSeconds: number | null
  readonly bufferedUntilSeconds: number
  readonly volume: number
  readonly muted: boolean
  readonly pendingTransport: PlayerTransportRequest | null
  readonly pendingSeek: PlayerSeekRequest | null
  readonly requestSequence: number
  readonly error: PlayerRuntimeError | null
}

export type PlayerStateTransition =
  | Readonly<{
      kind: 'select-track'
      track: PlayerTrack
    }>
  | Readonly<{
      kind: 'clear-track'
    }>
  | Readonly<{
      kind: 'admit-source'
      admission: PlayerSourceAdmission
    }>
  | Readonly<{
      kind: 'request-play'
    }>
  | Readonly<{
      kind: 'request-pause'
      reason: PlayerPauseReason
    }>
  | Readonly<{
      kind: 'request-seek'
      timeSeconds: number
    }>
  | Readonly<{
      kind: 'set-volume'
      value: number
    }>
  | Readonly<{
      kind: 'set-muted'
      value: boolean
    }>
  | Readonly<{
      kind: 'observe-metadata'
      trackEpoch: number
      durationSeconds: number
    }>
  | Readonly<{
      kind: 'observe-playing'
      trackEpoch: number
    }>
  | Readonly<{
      kind: 'observe-paused'
      trackEpoch: number
    }>
  | Readonly<{
      kind: 'observe-ended'
      trackEpoch: number
    }>
  | Readonly<{
      kind: 'observe-time'
      trackEpoch: number
      currentTimeSeconds: number
    }>
  | Readonly<{
      kind: 'observe-buffered'
      trackEpoch: number
      bufferedUntilSeconds: number
    }>
  | Readonly<{
      kind: 'observe-volume'
      trackEpoch: number
      volume: number
      muted: boolean
    }>
  | Readonly<{
      kind: 'observe-error'
      trackEpoch: number
      code: PlayerRuntimeErrorCode
      message: string
    }>
  | Readonly<{
      kind: 'acknowledge-transport'
      trackEpoch: number
      requestId: number
    }>
  | Readonly<{
      kind: 'acknowledge-seek'
      trackEpoch: number
      requestId: number
    }>
