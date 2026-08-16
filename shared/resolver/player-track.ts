import {
  isAssetMediaTypeFor,
} from '../constants/asset-domain'
import {
  isAssetId,
  isProjectId,
} from '../schema/domain-identifiers'
import type {
  PlayerTrack,
  PlayerTrackSource,
} from '../types/player-store'
import type {
  ResolvedAudioInlinePlan,
  ResolvedAudioSource,
} from '../types/resolved-media'
import type {
  ProjectId,
} from '../types/domain-identifiers'
import type {
  ResponsiveImageRenderPlan,
} from '../types/responsive-image'

export type PlayerTrackPlanningErrorCode =
  | 'player-track-kind-mismatch'
  | 'player-track-empty-source-set'
  | 'player-track-fallback-source-not-member'
  | 'player-track-invalid-project-id'
  | 'player-track-invalid-asset-id'
  | 'player-track-invalid-label'
  | 'player-track-invalid-rendition-id'
  | 'player-track-duplicate-rendition-id'
  | 'player-track-duplicate-media-type'
  | 'player-track-invalid-media-type'
  | 'player-track-invalid-url'
  | 'player-track-invalid-byte-size'
  | 'player-track-invalid-duration'
  | 'player-track-mixed-duration'
  | 'player-track-artwork-plan-missing'
  | 'player-track-artwork-identity-mismatch'
  | 'player-track-generation-conflict'

export class PlayerTrackPlanningError extends Error {
  override readonly name = 'PlayerTrackPlanningError'

  constructor(
    readonly code: PlayerTrackPlanningErrorCode,
    readonly path: string,
    readonly ownerId: string | null,
  ) {
    super(`${code}: ${path}${ownerId === null ? '' : ` (${ownerId})`}`)
  }
}

export interface PlayerTrackPlanningAuthority {
  resolve(
    audioPlan: ResolvedAudioInlinePlan,
    projectId: ProjectId,
    artworkPlan: ResponsiveImageRenderPlan | null,
  ): PlayerTrack
}

interface CachedTrack {
  readonly source: ResolvedAudioInlinePlan
  readonly artworkPlan: ResponsiveImageRenderPlan | null
  readonly output: PlayerTrack
}

function fail(
  code: PlayerTrackPlanningErrorCode,
  path: string,
  ownerId: string | null,
): never {
  throw new PlayerTrackPlanningError(code, path, ownerId)
}

function validateHttpsUrl(
  value: unknown,
  ownerId: string,
  path: string,
): string {
  if (
    typeof value !== 'string'
    || value.length === 0
    || value !== value.trim()
  ) {
    fail('player-track-invalid-url', path, ownerId)
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    fail('player-track-invalid-url', path, ownerId)
  }

  if (
    parsed.protocol !== 'https:'
    || parsed.hostname.length === 0
    || parsed.username.length > 0
    || parsed.password.length > 0
  ) {
    fail('player-track-invalid-url', path, ownerId)
  }

  return value
}

function validateSource(
  source: ResolvedAudioSource,
  ownerId: string,
  index: number,
): PlayerTrackSource {
  const path = `audioPlan.sources[${index}]`

  if (
    typeof source.renditionId !== 'string'
    || source.renditionId.length === 0
    || source.renditionId !== source.renditionId.trim()
  ) {
    fail(
      'player-track-invalid-rendition-id',
      `${path}.renditionId`,
      ownerId,
    )
  }

  if (!isAssetMediaTypeFor('audio', source.mediaType)) {
    fail(
      'player-track-invalid-media-type',
      `${path}.mediaType`,
      ownerId,
    )
  }

  if (!Number.isSafeInteger(source.byteSize) || source.byteSize <= 0) {
    fail(
      'player-track-invalid-byte-size',
      `${path}.byteSize`,
      ownerId,
    )
  }

  const durationMs = source.metadata?.durationMs
  if (!Number.isSafeInteger(durationMs) || durationMs <= 0) {
    fail(
      'player-track-invalid-duration',
      `${path}.metadata.durationMs`,
      ownerId,
    )
  }

  return Object.freeze({
    renditionId: source.renditionId,
    url: validateHttpsUrl(source.url, ownerId, `${path}.url`),
    mediaType: source.mediaType,
    byteSize: source.byteSize,
    declaredDurationMs: durationMs,
  })
}

function validateArtworkPlan(
  audioPlan: ResolvedAudioInlinePlan,
  artworkPlan: ResponsiveImageRenderPlan | null,
  ownerId: string,
): void {
  const artwork = audioPlan.media.artwork
  if (artwork === null) {
    if (artworkPlan !== null) {
      fail(
        'player-track-artwork-identity-mismatch',
        'artworkPlan',
        ownerId,
      )
    }
    return
  }

  if (artworkPlan === null) {
    fail('player-track-artwork-plan-missing', 'artworkPlan', ownerId)
  }

  if (artworkPlan.assetId !== artwork.id) {
    fail(
      'player-track-artwork-identity-mismatch',
      'artworkPlan.assetId',
      ownerId,
    )
  }
}

export function createPlayerTrackPlanningAuthority(): PlayerTrackPlanningAuthority {
  const outputByPlan = new WeakMap<ResolvedAudioInlinePlan, Map<string, CachedTrack>>()
  const ownerByIdentity = new Map<string, CachedTrack>()

  return Object.freeze({
    resolve(
      audioPlan: ResolvedAudioInlinePlan,
      projectId: ProjectId,
      artworkPlan: ResponsiveImageRenderPlan | null,
    ): PlayerTrack {
      if (!isProjectId(projectId)) {
        fail('player-track-invalid-project-id', 'projectId', String(projectId))
      }

      const plan = audioPlan as ResolvedAudioInlinePlan
      const media = plan?.media
      const ownerId = typeof media?.id === 'string' ? media.id : null

      if (
        media?.kind !== 'audio'
        || !Array.isArray(plan.sources)
        || plan.fallbackSource?.kind !== 'audio'
        || plan.sources.some(source => source.kind !== 'audio')
      ) {
        fail('player-track-kind-mismatch', 'audioPlan', ownerId)
      }

      if (!isAssetId(media.id)) {
        fail('player-track-invalid-asset-id', 'audioPlan.media.id', ownerId)
      }

      if (
        typeof media.label !== 'string'
        || media.label.length === 0
        || media.label !== media.label.trim()
      ) {
        fail('player-track-invalid-label', 'audioPlan.media.label', media.id)
      }

      if (plan.sources.length === 0) {
        fail('player-track-empty-source-set', 'audioPlan.sources', media.id)
      }

      if (!plan.sources.includes(plan.fallbackSource)) {
        fail(
          'player-track-fallback-source-not-member',
          'audioPlan.fallbackSource',
          media.id,
        )
      }

      validateArtworkPlan(plan, artworkPlan, media.id)

      const sources = Object.freeze(
        plan.sources.map((source, index) => validateSource(source, media.id, index)),
      )

      const renditionIds = new Set<string>()
      const mediaTypes = new Set<string>()
      const declaredDurationMs = sources[0]!.declaredDurationMs

      for (let index = 0; index < sources.length; index += 1) {
        const source = sources[index]!
        if (renditionIds.has(source.renditionId)) {
          fail(
            'player-track-duplicate-rendition-id',
            `audioPlan.sources[${index}].renditionId`,
            media.id,
          )
        }
        renditionIds.add(source.renditionId)

        if (mediaTypes.has(source.mediaType)) {
          fail(
            'player-track-duplicate-media-type',
            `audioPlan.sources[${index}].mediaType`,
            media.id,
          )
        }
        mediaTypes.add(source.mediaType)

        if (source.declaredDurationMs !== declaredDurationMs) {
          fail(
            'player-track-mixed-duration',
            `audioPlan.sources[${index}].declaredDurationMs`,
            media.id,
          )
        }
      }

      const fallbackIndex = plan.sources.indexOf(plan.fallbackSource)
      const defaultSource = sources[fallbackIndex]
      if (defaultSource === undefined) {
        fail(
          'player-track-fallback-source-not-member',
          'audioPlan.fallbackSource',
          media.id,
        )
      }

      const identity = `${media.id}\u0000${projectId}`
      const existingOwner = ownerByIdentity.get(identity)
      if (
        existingOwner !== undefined
        && (
          existingOwner.source !== plan
          || existingOwner.artworkPlan !== artworkPlan
        )
      ) {
        fail('player-track-generation-conflict', 'audioPlan', media.id)
      }

      const projectCache = outputByPlan.get(plan)
      const existingCached = projectCache?.get(projectId)
      if (existingCached !== undefined) {
        if (existingCached.artworkPlan !== artworkPlan) {
          fail('player-track-generation-conflict', 'artworkPlan', media.id)
        }
        return existingCached.output
      }

      const output: PlayerTrack = Object.freeze({
        trackId: media.id,
        projectId,
        label: media.label,
        sources,
        defaultSource,
        declaredDurationMs,
        artworkPlan,
      })

      const cached = Object.freeze({
        source: plan,
        artworkPlan,
        output,
      })
      const nextProjectCache = projectCache ?? new Map<string, CachedTrack>()
      nextProjectCache.set(projectId, cached)
      if (projectCache === undefined) outputByPlan.set(plan, nextProjectCache)
      ownerByIdentity.set(identity, cached)
      return output
    },
  })
}
