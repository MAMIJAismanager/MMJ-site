export const WORK_DETAIL_REFERENCE_VIEWPORT = Object.freeze({
  width: 1920,
  height: 1080,
})

export const WORK_DETAIL_HEADER_BLOCK_PX = 72

export type WorkDetailLayoutMode =
  | 'document-flow'
  | 'mobile-stack'
  | 'compact-stack'
  | 'reference-split'
  | 'wide-split'

export type WorkDetailDensity =
  | 'compact'
  | 'reference'
  | 'relaxed'

export interface WorkDetailViewportSnapshot {
  readonly width: number
  readonly height: number
}

export interface WorkDetailPrimaryMediaGeometry {
  readonly width: number
  readonly height: number
}

export interface WorkDetailLayoutInput {
  readonly viewport: WorkDetailViewportSnapshot
  readonly hasPrimaryMedia: boolean
  readonly primaryMedia: WorkDetailPrimaryMediaGeometry | null
}

export interface WorkDetailLayoutProfile {
  readonly mode: WorkDetailLayoutMode
  readonly composition: 'stack' | 'split'
  readonly density: WorkDetailDensity
  readonly coreViewportFit: boolean
  readonly titlePx: number
  readonly sectionTitlePx: number
  readonly copyColumnPx: number | null
  readonly compositionGapPx: number
  readonly sectionGapPx: number
  readonly contentMaxPx: number
  readonly mediaMaxInlinePx: number
  readonly mediaMaxBlockPx: number
  readonly corePaddingBlockPx: number
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function finitePositive(value: number): number | null {
  return Number.isFinite(value) && value > 0 ? value : null
}

function resolveAspectRatio(
  media: WorkDetailPrimaryMediaGeometry | null,
): number {
  if (media === null) return 16 / 9
  const width = finitePositive(media.width)
  const height = finitePositive(media.height)
  if (width === null || height === null) return 16 / 9
  return clamp(width / height, 0.4, 3.2)
}

function resolveMediaInlineBudget(
  viewportWidth: number,
  mediaMaxBlockPx: number,
  aspectRatio: number,
  mode: WorkDetailLayoutMode,
): number {
  const heightBound = mediaMaxBlockPx * aspectRatio
  const modeBound = mode === 'wide-split'
    ? 1040
    : mode === 'reference-split'
      ? 920
      : mode === 'compact-stack'
        ? 840
        : Math.max(288, viewportWidth - 32)
  return Math.round(Math.max(288, Math.min(modeBound, heightBound)))
}

export function resolveWorkDetailLayoutProfile(
  input: WorkDetailLayoutInput,
): WorkDetailLayoutProfile {
  const width = finitePositive(input.viewport.width) ?? 0
  const height = finitePositive(input.viewport.height) ?? 0
  const aspectRatio = resolveAspectRatio(input.primaryMedia)

  if (width === 0 || height === 0) {
    return Object.freeze({
      mode: 'document-flow',
      composition: 'stack',
      density: 'compact',
      coreViewportFit: false,
      titlePx: 36,
      sectionTitlePx: 20,
      copyColumnPx: null,
      compositionGapPx: 24,
      sectionGapPx: 20,
      contentMaxPx: 1184,
      mediaMaxInlinePx: 720,
      mediaMaxBlockPx: 520,
      corePaddingBlockPx: 28,
    })
  }

  if (width < 768) {
    const titlePx = Math.round(clamp(width * 0.09, 32, 38))
    const mediaMaxBlockPx = Math.round(clamp(height * 0.56, 300, 520))
    return Object.freeze({
      mode: 'mobile-stack',
      composition: 'stack',
      density: 'compact',
      coreViewportFit: false,
      titlePx,
      sectionTitlePx: 18,
      copyColumnPx: null,
      compositionGapPx: 24,
      sectionGapPx: 14,
      contentMaxPx: Math.max(288, width - 32),
      mediaMaxInlinePx: resolveMediaInlineBudget(
        width,
        mediaMaxBlockPx,
        aspectRatio,
        'mobile-stack',
      ),
      mediaMaxBlockPx,
      corePaddingBlockPx: 24,
    })
  }

  if (width < 1440 || height < 800 || !input.hasPrimaryMedia) {
    const titlePx = Math.round(clamp(Math.min(width / 30, height / 18), 36, 44))
    const mediaMaxBlockPx = Math.round(clamp(height * 0.62, 360, 620))
    return Object.freeze({
      mode: 'compact-stack',
      composition: 'stack',
      density: 'compact',
      coreViewportFit: false,
      titlePx,
      sectionTitlePx: 20,
      copyColumnPx: null,
      compositionGapPx: 28,
      sectionGapPx: 18,
      contentMaxPx: Math.round(clamp(width - 64, 720, 1184)),
      mediaMaxInlinePx: resolveMediaInlineBudget(
        width,
        mediaMaxBlockPx,
        aspectRatio,
        'compact-stack',
      ),
      mediaMaxBlockPx,
      corePaddingBlockPx: 28,
    })
  }

  const referenceScale = Math.min(
    width / WORK_DETAIL_REFERENCE_VIEWPORT.width,
    height / WORK_DETAIL_REFERENCE_VIEWPORT.height,
  )
  const mode: WorkDetailLayoutMode = width >= 2300
    ? 'wide-split'
    : 'reference-split'
  const density: WorkDetailDensity = mode === 'wide-split'
    ? 'relaxed'
    : 'reference'
  const titlePx = Math.round(clamp(48 * referenceScale, 44, 52))
  const copyColumnPx = Math.round(clamp(width * 0.255, 440, mode === 'wide-split' ? 512 : 488))
  const compositionGapPx = Math.round(clamp(width * 0.025, 32, 48))
  const corePaddingBlockPx = Math.round(clamp(height * 0.034, 28, 40))
  const mediaMaxBlockPx = Math.round(clamp(
    height - WORK_DETAIL_HEADER_BLOCK_PX - (corePaddingBlockPx * 2) - 56,
    480,
    mode === 'wide-split' ? 760 : 680,
  ))

  return Object.freeze({
    mode,
    composition: 'split',
    density,
    coreViewportFit: true,
    titlePx,
    sectionTitlePx: mode === 'wide-split' ? 22 : 21,
    copyColumnPx,
    compositionGapPx,
    sectionGapPx: mode === 'wide-split' ? 20 : 18,
    contentMaxPx: mode === 'wide-split' ? 1568 : 1480,
    mediaMaxInlinePx: resolveMediaInlineBudget(
      width,
      mediaMaxBlockPx,
      aspectRatio,
      mode,
    ),
    mediaMaxBlockPx,
    corePaddingBlockPx,
  })
}
