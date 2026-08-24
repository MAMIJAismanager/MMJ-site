import type {
  ResolvedAssetReference,
  WorkDetailView,
} from '../view/portfolio-project-view'

export interface WorkDetailGalleryPresentationR1 {
  readonly canonicalHero: ResolvedAssetReference
  readonly thumbnails: readonly ResolvedAssetReference[]
}

export type WorkDetailGalleryPresentationErrorCode =
  | 'work-detail-gallery-too-many-secondary-assets'
  | 'work-detail-gallery-primary-duplicated-in-secondary'
  | 'work-detail-gallery-secondary-duplicate'

export class WorkDetailGalleryPresentationError extends Error {
  override readonly name = 'WorkDetailGalleryPresentationError'
  readonly code: WorkDetailGalleryPresentationErrorCode
  readonly projectId: string
  readonly assetId: string | null

  constructor(
    code: WorkDetailGalleryPresentationErrorCode,
    projectId: string,
    assetId: string | null,
  ) {
    super(`${code}: projectId=${projectId}; assetId=${assetId ?? 'null'}`)
    this.code = code
    this.projectId = projectId
    this.assetId = assetId
  }
}

export function createWorkDetailGalleryPresentationR1(
  project: WorkDetailView,
): WorkDetailGalleryPresentationR1 | null {
  const canonicalHero = project.assets.primary
  if (canonicalHero === null) return null

  const thumbnails = project.assets.gallery
  if (thumbnails.length > 3) {
    throw new WorkDetailGalleryPresentationError(
      'work-detail-gallery-too-many-secondary-assets',
      project.id,
      null,
    )
  }

  const seen = new Set<string>([canonicalHero.id])
  for (const asset of thumbnails) {
    if (asset.id === canonicalHero.id) {
      throw new WorkDetailGalleryPresentationError(
        'work-detail-gallery-primary-duplicated-in-secondary',
        project.id,
        asset.id,
      )
    }
    if (seen.has(asset.id)) {
      throw new WorkDetailGalleryPresentationError(
        'work-detail-gallery-secondary-duplicate',
        project.id,
        asset.id,
      )
    }
    seen.add(asset.id)
  }

  return Object.freeze({
    canonicalHero,
    thumbnails: Object.freeze([...thumbnails]),
  })
}
