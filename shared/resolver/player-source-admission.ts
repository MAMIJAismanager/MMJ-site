import type {
  PlayerSourceAdmission,
  PlayerSourceCapability,
  PlayerTrack,
  PlayerTrackSource,
} from '../types/player-store'

export type PlayerSourceAdmissionErrorCode =
  | 'invalid-audio-track-epoch'
  | 'audio-capability-probe-unavailable'
  | 'no-playable-audio-source'

export class PlayerSourceAdmissionError extends Error {
  override readonly name = 'PlayerSourceAdmissionError'

  constructor(
    readonly code: PlayerSourceAdmissionErrorCode,
    readonly path: string,
  ) {
    super(`${code}: ${path}`)
  }
}

export type AudioCodecCapabilityProbe = (
  mediaType: PlayerTrackSource['mediaType'],
) => string

function fail(
  code: PlayerSourceAdmissionErrorCode,
  path: string,
): never {
  throw new PlayerSourceAdmissionError(code, path)
}

function probeAudioSourceCapability(
  source: PlayerTrackSource,
  canPlayType: AudioCodecCapabilityProbe,
): PlayerSourceCapability | null {
  let result: string
  try {
    result = canPlayType(source.mediaType)
  } catch {
    fail('audio-capability-probe-unavailable', source.mediaType)
  }

  if (result === 'probably' || result === 'maybe') return result
  if (result === '') return null
  fail('audio-capability-probe-unavailable', source.mediaType)
}

export function selectPlayableAudioSource(
  track: PlayerTrack,
  trackEpoch: number,
  canPlayType: AudioCodecCapabilityProbe,
): PlayerSourceAdmission {
  if (!Number.isSafeInteger(trackEpoch) || trackEpoch < 0) {
    fail('invalid-audio-track-epoch', 'trackEpoch')
  }

  const capabilities = new Map<PlayerTrackSource, PlayerSourceCapability | null>()
  const capability = (source: PlayerTrackSource): PlayerSourceCapability | null => {
    const cached = capabilities.get(source)
    if (cached !== undefined || capabilities.has(source)) return cached ?? null
    const observed = probeAudioSourceCapability(source, canPlayType)
    capabilities.set(source, observed)
    return observed
  }

  const defaultCapability = capability(track.defaultSource)
  if (defaultCapability !== null) {
    return Object.freeze({
      trackEpoch,
      source: track.defaultSource,
      capability: defaultCapability,
      reason: 'default-supported' as const,
    })
  }

  const mp3 = track.sources.find(source => source.mediaType === 'audio/mpeg')
  if (mp3 !== undefined && mp3 !== track.defaultSource) {
    const mp3Capability = capability(mp3)
    if (mp3Capability !== null) {
      return Object.freeze({
        trackEpoch,
        source: mp3,
        capability: mp3Capability,
        reason: 'mp3-compatibility-fallback' as const,
      })
    }
  }

  for (const source of track.sources) {
    if (source === track.defaultSource || source === mp3) continue
    const sourceCapability = capability(source)
    if (sourceCapability !== null) {
      return Object.freeze({
        trackEpoch,
        source,
        capability: sourceCapability,
        reason: 'ordered-supported-fallback' as const,
      })
    }
  }

  fail('no-playable-audio-source', 'track.sources')
}
