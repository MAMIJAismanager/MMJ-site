import {
  createPortfolioSnapshotQueryAuthority,
} from '../query/portfolio-snapshot-query'
import {
  createPortfolioMediaDeliveryConfig,
} from './media-delivery-config'
import {
  resolveWorkDetailImageAccessibility,
} from './accessible-description-resolution'
import {
  createMediaResolutionAuthority,
} from './media-resolution'
import {
  createPlayerTrackPlanningAuthority,
} from './player-track'
import {
  createGlobalAudioArtworkOptions,
} from './player-artwork-options'
import {
  createPortfolioProjectViewResolver,
} from './portfolio-project-view-resolver'
import {
  createResponsiveImagePlanningAuthority,
} from './responsive-image-plan'
import {
  createVideoPlayerPlanningAuthority,
} from './video-player-plan'

import type {
  PortfolioSnapshot,
} from '../types/portfolio-snapshot'
import type {
  ResponsiveImageRenderOptions,
  ResponsiveImageRenderPlan,
} from '../types/responsive-image'
import type {
  WorkDetailImageAccessibilityContext,
} from './accessible-description-resolution'
import type {
  ResolvedAssetReference,
  ResolvedImageAssetReference,
  WorkDetailView,
} from '../view/portfolio-project-view'

export const MM_WORK_DETAIL_IMAGE_SIZES =
  '(min-width: 80rem) 80rem, 100vw'

export type WorkDetailPresentationContext =
  | 'primary'
  | 'gallery'
  | 'video-poster'
  | 'audio-artwork'

export type WorkDetailPresentationPlanner =
  | 'media-resolution'
  | 'responsive-image'
  | 'video-player'
  | 'audio-track'

export interface WorkDetailPresentationPlanReceipt {
  readonly assetId: string
  readonly ownerAssetId: string | null
  readonly assetKind: 'image' | 'video' | 'audio'
  readonly context: WorkDetailPresentationContext
  readonly planner: WorkDetailPresentationPlanner
}

export interface WorkDetailPresentationAdmissionReceipt {
  readonly projectId: string
  readonly route: string
  readonly state: 'admitted'
  readonly plans: readonly WorkDetailPresentationPlanReceipt[]
}

export type WorkDetailPresentationConfigurationErrorCode =
  | 'media-delivery-config-missing'
  | 'media-delivery-config-invalid'
  | 'work-detail-view-missing'

export class WorkDetailPresentationConfigurationError extends Error {
  override readonly name = 'WorkDetailPresentationConfigurationError'

  constructor(
    readonly code: WorkDetailPresentationConfigurationErrorCode,
    readonly projectId: string | null,
    readonly route: string | null,
    readonly underlyingErrorName: string | null,
    readonly underlyingErrorCode: string | null,
  ) {
    super(
      `${code}: projectId=${projectId ?? 'null'}; route=${route ?? 'null'}; ` +
      `underlying=${underlyingErrorName ?? 'null'}/${underlyingErrorCode ?? 'null'}`,
    )
  }
}

export class WorkDetailPresentationPlanningError extends Error {
  override readonly name = 'WorkDetailPresentationPlanningError'
  readonly code = 'work-detail-presentation-planner-failed' as const

  constructor(
    readonly projectId: string,
    readonly route: string,
    readonly assetId: string,
    readonly ownerAssetId: string | null,
    readonly assetKind: 'image' | 'video' | 'audio',
    readonly context: WorkDetailPresentationContext,
    readonly planner: WorkDetailPresentationPlanner,
    readonly underlyingErrorName: string,
    readonly underlyingErrorCode: string | null,
    readonly underlyingErrorPath: string | null,
  ) {
    super(
      `${planner} failed for ${route}: asset=${assetId}; context=${context}; ` +
      `underlying=${underlyingErrorName}/${underlyingErrorCode ?? 'null'}; ` +
      `path=${underlyingErrorPath ?? 'null'}`,
    )
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : typeof error
}

function errorField(error: unknown, key: string): string | null {
  if (!isRecord(error)) return null
  const value = error[key]
  return typeof value === 'string' ? value : null
}

function planningFailure(
  project: WorkDetailView,
  asset: ResolvedAssetReference,
  ownerAssetId: string | null,
  context: WorkDetailPresentationContext,
  planner: WorkDetailPresentationPlanner,
  error: unknown,
): never {
  if (error instanceof WorkDetailPresentationPlanningError) throw error
  throw new WorkDetailPresentationPlanningError(
    project.id,
    project.href,
    asset.id,
    ownerAssetId,
    asset.kind,
    context,
    planner,
    errorName(error),
    errorField(error, 'code'),
    errorField(error, 'path'),
  )
}

function plan<T>(
  project: WorkDetailView,
  asset: ResolvedAssetReference,
  ownerAssetId: string | null,
  context: WorkDetailPresentationContext,
  planner: WorkDetailPresentationPlanner,
  callback: () => T,
): T {
  try {
    return callback()
  } catch (error) {
    planningFailure(project, asset, ownerAssetId, context, planner, error)
  }
}

function record(
  receipts: WorkDetailPresentationPlanReceipt[],
  asset: ResolvedAssetReference,
  ownerAssetId: string | null,
  context: WorkDetailPresentationContext,
  planner: WorkDetailPresentationPlanner,
): void {
  receipts.push(Object.freeze({
    assetId: asset.id,
    ownerAssetId,
    assetKind: asset.kind,
    context,
    planner,
  }))
}

export function createWorkDetailImageOptions(
  project: WorkDetailView,
  asset: ResolvedImageAssetReference,
  context: WorkDetailImageAccessibilityContext,
  priority: 'primary' | 'gallery',
): ResponsiveImageRenderOptions {
  return Object.freeze({
    sizes: MM_WORK_DETAIL_IMAGE_SIZES,
    accessibility: resolveWorkDetailImageAccessibility(project, asset, context),
    loading: priority === 'primary' ? 'eager' as const : 'lazy' as const,
    fetchPriority: priority === 'primary' ? 'high' as const : 'auto' as const,
    fit: 'contain' as const,
  })
}

export function createWorkDetailVideoPosterOptions(
  asset: ResolvedImageAssetReference,
): ResponsiveImageRenderOptions {
  return Object.freeze({
    sizes: MM_WORK_DETAIL_IMAGE_SIZES,
    accessibility: Object.freeze({ mode: 'decorative' as const }),
    loading: 'lazy' as const,
    fetchPriority: 'auto' as const,
    fit: 'contain' as const,
  })
}

export function admitPortfolioWorkDetailPresentations(
  snapshot: PortfolioSnapshot,
  rawMediaBaseUrl: string | null | undefined,
): readonly WorkDetailPresentationAdmissionReceipt[] {
  let delivery
  try {
    delivery = createPortfolioMediaDeliveryConfig(
      rawMediaBaseUrl,
      'production',
    )
  } catch (error) {
    throw new WorkDetailPresentationConfigurationError(
      'media-delivery-config-invalid',
      null,
      null,
      errorName(error),
      errorField(error, 'code'),
    )
  }

  if (delivery.mode !== 'bound' || delivery.mediaBaseUrl === null) {
    throw new WorkDetailPresentationConfigurationError(
      'media-delivery-config-missing',
      null,
      null,
      null,
      null,
    )
  }

  const queries = createPortfolioSnapshotQueryAuthority(snapshot)
  const views = createPortfolioProjectViewResolver(snapshot, queries)
  const mediaResolution = createMediaResolutionAuthority({
    mediaBaseUrl: delivery.mediaBaseUrl,
  })
  const responsiveImage = createResponsiveImagePlanningAuthority()
  const videoPlayer = createVideoPlayerPlanningAuthority()
  const audioTrack = createPlayerTrackPlanningAuthority()

  const output: WorkDetailPresentationAdmissionReceipt[] = []

  function resolveInformativeImage(
    project: WorkDetailView,
    image: ResolvedImageAssetReference,
    ownerAssetId: string | null,
    context: WorkDetailPresentationContext,
    accessibilityContext: WorkDetailImageAccessibilityContext,
    priority: 'primary' | 'gallery',
    receipts: WorkDetailPresentationPlanReceipt[],
  ): void {
    const inlinePlan = plan(
      project,
      image,
      ownerAssetId,
      context,
      'media-resolution',
      () => mediaResolution.resolveInlinePlan(image, 'primary'),
    )
    record(receipts, image, ownerAssetId, context, 'media-resolution')
    plan(
      project,
      image,
      ownerAssetId,
      context,
      'responsive-image',
      () => responsiveImage.resolve(
        inlinePlan,
        createWorkDetailImageOptions(project, image, accessibilityContext, priority),
      ),
    )
    record(receipts, image, ownerAssetId, context, 'responsive-image')
  }

  function resolvePrimaryAsset(
    project: WorkDetailView,
    asset: ResolvedAssetReference,
    receipts: WorkDetailPresentationPlanReceipt[],
  ): void {
    if (asset.kind === 'image') {
      resolveInformativeImage(
        project,
        asset,
        null,
        'primary',
        'primary-image',
        'primary',
        receipts,
      )
      return
    }

    if (asset.kind === 'video') {
      const videoPlan = plan(
        project,
        asset,
        null,
        'primary',
        'media-resolution',
        () => mediaResolution.resolveInlinePlan(asset, 'primary'),
      )
      record(receipts, asset, null, 'primary', 'media-resolution')

      let posterPlan: ResponsiveImageRenderPlan | null = null
      if (asset.poster !== null) {
        const posterInlinePlan = plan(
          project,
          asset.poster,
          asset.id,
          'video-poster',
          'media-resolution',
          () => mediaResolution.resolveInlinePlan(asset.poster!, 'primary'),
        )
        record(
          receipts,
          asset.poster,
          asset.id,
          'video-poster',
          'media-resolution',
        )
        posterPlan = plan(
          project,
          asset.poster,
          asset.id,
          'video-poster',
          'responsive-image',
          () => responsiveImage.resolve(
            posterInlinePlan,
            createWorkDetailVideoPosterOptions(asset.poster!),
          ),
        )
        record(
          receipts,
          asset.poster,
          asset.id,
          'video-poster',
          'responsive-image',
        )
      }

      plan(
        project,
        asset,
        null,
        'primary',
        'video-player',
        () => videoPlayer.resolve(videoPlan, posterPlan),
      )
      record(receipts, asset, null, 'primary', 'video-player')
      return
    }

    let playerArtworkPlan: ResponsiveImageRenderPlan | null = null
    if (asset.artwork !== null) {
      resolveInformativeImage(
        project,
        asset.artwork,
        asset.id,
        'audio-artwork',
        'primary-audio-artwork',
        'primary',
        receipts,
      )
      const playerArtworkInlinePlan = plan(
        project,
        asset.artwork,
        asset.id,
        'audio-artwork',
        'media-resolution',
        () => mediaResolution.resolveInlinePlan(asset.artwork!, 'primary'),
      )
      playerArtworkPlan = plan(
        project,
        asset.artwork,
        asset.id,
        'audio-artwork',
        'responsive-image',
        () => responsiveImage.resolve(
          playerArtworkInlinePlan,
          createGlobalAudioArtworkOptions(),
        ),
      )
    }

    const audioPlan = plan(
      project,
      asset,
      null,
      'primary',
      'media-resolution',
      () => mediaResolution.resolveInlinePlan(asset, 'primary'),
    )
    record(receipts, asset, null, 'primary', 'media-resolution')
    plan(
      project,
      asset,
      null,
      'primary',
      'audio-track',
      () => audioTrack.resolve(audioPlan, project.id, playerArtworkPlan),
    )
    record(receipts, asset, null, 'primary', 'audio-track')
  }

  function resolveGalleryAsset(
    project: WorkDetailView,
    asset: ResolvedAssetReference,
    receipts: WorkDetailPresentationPlanReceipt[],
  ): void {
    if (asset.kind === 'image') {
      resolveInformativeImage(
        project,
        asset,
        null,
        'gallery',
        'gallery-image',
        'gallery',
        receipts,
      )
      return
    }

    if (asset.kind === 'video') {
      if (asset.poster !== null) {
        resolveInformativeImage(
          project,
          asset.poster,
          asset.id,
          'gallery',
          'gallery-video-poster',
          'gallery',
          receipts,
        )
      }
      return
    }

    if (asset.artwork !== null) {
      resolveInformativeImage(
        project,
        asset.artwork,
        asset.id,
        'gallery',
        'gallery-audio-artwork',
        'gallery',
        receipts,
      )
    }
  }

  for (const sourceProject of snapshot.projects) {
    const project = views.findWorkDetailById(sourceProject.id)
    if (project === null) {
      throw new WorkDetailPresentationConfigurationError(
        'work-detail-view-missing',
        sourceProject.id,
        `/works/${sourceProject.slug}`,
        null,
        null,
      )
    }

    const receipts: WorkDetailPresentationPlanReceipt[] = []
    if (project.assets.primary !== null) {
      resolvePrimaryAsset(project, project.assets.primary, receipts)
    }
    for (const asset of project.assets.gallery) {
      resolveGalleryAsset(project, asset, receipts)
    }

    output.push(Object.freeze({
      projectId: project.id,
      route: project.href,
      state: 'admitted' as const,
      plans: Object.freeze([...receipts]),
    }))
  }

  return Object.freeze(output)
}
