import type {
  WorksLayoutTokens,
  WorksViewportSnapshot,
} from './works-layout-profile'

export const WORKS_HARD_REFERENCE_VIEWPORT = Object.freeze({
  width: 1920,
  height: 1080,
} as const)

export const WORKS_HARD_REFERENCE_TOLERANCE_PX = 1
export const WORKS_REFERENCE_MAX_FIT_PASSES = 3
export const WORKS_REFERENCE_PHYSICAL_SAFETY_PX = 8

export const WORKS_REFERENCE_FIT_STATE_KEY =
  'mmj-works-reference-hard-fit-r3'

export type WorksReferenceFitPhase =
  | 'pending'
  | 'measure'
  | 'solving'
  | 'committed'
  | 'invalid'

export type WorksReferenceDensity =
  | 'comfortable'
  | 'compact'
  | 'tight'

export interface WorksReferenceFitSolution {
  readonly revision: number
  readonly fitKey: string | null
  readonly phase: WorksReferenceFitPhase
  readonly pass: number
  readonly density: WorksReferenceDensity
  readonly hardReference: boolean
  readonly admitted: boolean

  readonly availableBlockPx: number
  readonly requiredBlockPx: number
  readonly spareBlockPx: number

  readonly maxMetadataBlockPx: number
  readonly contentInlinePx: number
  readonly cardInlinePx: number
  readonly mediaBlockPx: number
  readonly gridBlockPx: number

  readonly tokens: WorksLayoutTokens | null
}

export interface WorksReferenceFitInput {
  readonly revision: number
  readonly fitKey: string
  readonly viewport: WorksViewportSnapshot

  readonly rootFontPx: number
  readonly mainAvailableBlockPx: number
  readonly pageRequiredBlockPx: number
  readonly gridRequiredBlockPx: number
  readonly paginationBlockPx: number
  readonly maxMetadataBlockPx: number

  readonly currentTokens: WorksLayoutTokens
  readonly currentContentInlinePx: number
  readonly previousPass: number
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function finitePositive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

function freezeTokens(tokens: WorksLayoutTokens): WorksLayoutTokens {
  return Object.freeze({ ...tokens })
}

function freezeSolution(
  solution: WorksReferenceFitSolution,
): WorksReferenceFitSolution {
  return Object.freeze({
    ...solution,
    tokens: solution.tokens === null
      ? null
      : freezeTokens(solution.tokens),
  })
}

export function isHardWorksReferenceViewport(
  viewport: WorksViewportSnapshot,
): boolean {
  return (
    Math.abs(viewport.width - WORKS_HARD_REFERENCE_VIEWPORT.width)
      <= WORKS_HARD_REFERENCE_TOLERANCE_PX
    && Math.abs(viewport.height - WORKS_HARD_REFERENCE_VIEWPORT.height)
      <= WORKS_HARD_REFERENCE_TOLERANCE_PX
  )
}

export function createInitialWorksReferenceFitSolution(
  revision = 0,
  fitKey: string | null = null,
  hardReference = false,
): WorksReferenceFitSolution {
  return freezeSolution({
    revision,
    fitKey,
    phase: hardReference ? 'measure' : 'pending',
    pass: 0,
    density: 'comfortable',
    hardReference,
    admitted: false,

    availableBlockPx: 0,
    requiredBlockPx: 0,
    spareBlockPx: 0,

    maxMetadataBlockPx: 0,
    contentInlinePx: 0,
    cardInlinePx: 0,
    mediaBlockPx: 0,
    gridBlockPx: 0,

    tokens: null,
  })
}

function densityForPass(pass: number): WorksReferenceDensity {
  if (pass <= 0) return 'comfortable'
  if (pass === 1) return 'compact'
  return 'tight'
}

function densityTokenBounds(density: WorksReferenceDensity) {
  switch (density) {
    case 'comfortable':
      return Object.freeze({
        contentMinRem: 76,
        pagePaddingBlockRem: 0.55,
        pageGapRem: 0.48,
        headerGapRem: 0.28,
        titleRem: 2.35,
        queryGapRem: 0.55,
        queryPaddingRem: 0.48,
        queryControlHeightRem: 2.3,
        gridGapRem: 0.58,
        cardPaddingRem: 0.5,
        cardTitleRem: 0.92,
      })
    case 'compact':
      return Object.freeze({
        contentMinRem: 70,
        pagePaddingBlockRem: 0.48,
        pageGapRem: 0.42,
        headerGapRem: 0.24,
        titleRem: 2.15,
        queryGapRem: 0.48,
        queryPaddingRem: 0.43,
        queryControlHeightRem: 2.25,
        gridGapRem: 0.5,
        cardPaddingRem: 0.46,
        cardTitleRem: 0.88,
      })
    case 'tight':
      return Object.freeze({
        contentMinRem: 64,
        pagePaddingBlockRem: 0.42,
        pageGapRem: 0.36,
        headerGapRem: 0.22,
        titleRem: 1.98,
        queryGapRem: 0.44,
        queryPaddingRem: 0.4,
        queryControlHeightRem: 2.2,
        gridGapRem: 0.44,
        cardPaddingRem: 0.43,
        cardTitleRem: 0.84,
      })
  }
}

function solveNextTokens(
  input: WorksReferenceFitInput,
  pass: number,
): WorksLayoutTokens {
  const rootFontPx = finitePositive(input.rootFontPx, 16)
  const nextDensity = densityForPass(pass)
  const bounds = densityTokenBounds(nextDensity)
  const current = input.currentTokens

  const paginationReservedBlockPx = Math.max(0, input.paginationBlockPx)
  const nonGridNonPaginationBlockPx = Math.max(
    0,
    input.pageRequiredBlockPx
      - input.gridRequiredBlockPx
      - paginationReservedBlockPx,
  )
  const fixedBlockPx = (
    nonGridNonPaginationBlockPx
    + paginationReservedBlockPx
  )
  const gridAvailableBlockPx = Math.max(
    0,
    input.mainAvailableBlockPx
      - fixedBlockPx
      - WORKS_REFERENCE_PHYSICAL_SAFETY_PX,
  )
  const currentGridGapPx = current.gridGapRem * rootFontPx
  const rowAvailableBlockPx = Math.max(
    0,
    (gridAvailableBlockPx - currentGridGapPx) / 2,
  )
  const mediaAvailableBlockPx = Math.max(
    0,
    rowAvailableBlockPx - input.maxMetadataBlockPx,
  )
  const cardInlineByVerticalPx = mediaAvailableBlockPx * (4 / 3)
  const contentInlineByVerticalPx = (
    (cardInlineByVerticalPx * 4)
    + (currentGridGapPx * 3)
  )

  const overflowScale = clamp(
    input.mainAvailableBlockPx
      / Math.max(input.pageRequiredBlockPx, 1),
    0.72,
    1,
  )
  const measuredContentInlinePx = finitePositive(
    input.currentContentInlinePx,
    current.contentMaxRem * rootFontPx,
  )
  const scaledContentInlinePx = measuredContentInlinePx * overflowScale
  const verticalBoundInlinePx = contentInlineByVerticalPx > 0
    ? contentInlineByVerticalPx
    : scaledContentInlinePx
  const targetContentInlinePx = Math.min(
    measuredContentInlinePx,
    scaledContentInlinePx,
    verticalBoundInlinePx,
  )
  const contentMaxRem = clamp(
    targetContentInlinePx / rootFontPx,
    bounds.contentMinRem,
    current.contentMaxRem,
  )

  const mix = nextDensity === 'compact' ? 0.88 : 0.78
  const reduce = (value: number, floor: number): number => (
    round(clamp(value * mix, floor, value))
  )

  return freezeTokens({
    contentMaxRem: round(contentMaxRem),
    pagePaddingBlockRem: reduce(
      current.pagePaddingBlockRem,
      bounds.pagePaddingBlockRem,
    ),
    pageGapRem: reduce(current.pageGapRem, bounds.pageGapRem),
    headerGapRem: reduce(current.headerGapRem, bounds.headerGapRem),
    titleRem: reduce(current.titleRem, bounds.titleRem),
    queryGapRem: reduce(current.queryGapRem, bounds.queryGapRem),
    queryPaddingRem: reduce(
      current.queryPaddingRem,
      bounds.queryPaddingRem,
    ),
    queryControlHeightRem: reduce(
      current.queryControlHeightRem,
      bounds.queryControlHeightRem,
    ),
    gridGapRem: reduce(current.gridGapRem, bounds.gridGapRem),
    cardPaddingRem: reduce(
      current.cardPaddingRem,
      bounds.cardPaddingRem,
    ),
    cardTitleRem: reduce(current.cardTitleRem, bounds.cardTitleRem),
  })
}

export function resolveWorksReferenceFitSolution(
  input: WorksReferenceFitInput,
): WorksReferenceFitSolution {
  const hardReference = isHardWorksReferenceViewport(input.viewport)
  const availableBlockPx = round(Math.max(0, input.mainAvailableBlockPx))
  const requiredBlockPx = round(Math.max(0, input.pageRequiredBlockPx))
  const spareBlockPx = round(availableBlockPx - requiredBlockPx)
  const admitted = (
    hardReference
    && requiredBlockPx + WORKS_REFERENCE_PHYSICAL_SAFETY_PX
      <= availableBlockPx
  )

  const rootFontPx = finitePositive(input.rootFontPx, 16)
  const contentInlinePx = round(finitePositive(
    input.currentContentInlinePx,
    input.currentTokens.contentMaxRem * rootFontPx,
  ))
  const gapPx = input.currentTokens.gridGapRem * rootFontPx
  const cardInlinePx = round(Math.max(
    0,
    (contentInlinePx - (gapPx * 3)) / 4,
  ))
  const mediaBlockPx = round(cardInlinePx * 0.75)

  if (!hardReference) {
    return freezeSolution({
      revision: input.revision,
      fitKey: input.fitKey,
      phase: 'pending',
      pass: input.previousPass,
      density: densityForPass(input.previousPass),
      hardReference: false,
      admitted: false,
      availableBlockPx,
      requiredBlockPx,
      spareBlockPx,
      maxMetadataBlockPx: round(input.maxMetadataBlockPx),
      contentInlinePx,
      cardInlinePx,
      mediaBlockPx,
      gridBlockPx: round(input.gridRequiredBlockPx),
      tokens: null,
    })
  }

  if (admitted) {
    return freezeSolution({
      revision: input.revision,
      fitKey: input.fitKey,
      phase: 'committed',
      pass: input.previousPass,
      density: densityForPass(input.previousPass),
      hardReference: true,
      admitted: true,
      availableBlockPx,
      requiredBlockPx,
      spareBlockPx,
      maxMetadataBlockPx: round(input.maxMetadataBlockPx),
      contentInlinePx,
      cardInlinePx,
      mediaBlockPx,
      gridBlockPx: round(input.gridRequiredBlockPx),
      tokens: freezeTokens(input.currentTokens),
    })
  }

  const nextPass = input.previousPass + 1
  if (nextPass > WORKS_REFERENCE_MAX_FIT_PASSES) {
    return freezeSolution({
      revision: input.revision,
      fitKey: input.fitKey,
      phase: 'invalid',
      pass: input.previousPass,
      density: densityForPass(input.previousPass),
      hardReference: true,
      admitted: false,
      availableBlockPx,
      requiredBlockPx,
      spareBlockPx,
      maxMetadataBlockPx: round(input.maxMetadataBlockPx),
      contentInlinePx,
      cardInlinePx,
      mediaBlockPx,
      gridBlockPx: round(input.gridRequiredBlockPx),
      tokens: freezeTokens(input.currentTokens),
    })
  }

  const nextTokens = solveNextTokens(input, nextPass)
  return freezeSolution({
    revision: input.revision,
    fitKey: input.fitKey,
    phase: 'solving',
    pass: nextPass,
    density: densityForPass(nextPass),
    hardReference: true,
    admitted: false,
    availableBlockPx,
    requiredBlockPx,
    spareBlockPx,
    maxMetadataBlockPx: round(input.maxMetadataBlockPx),
    contentInlinePx: round(nextTokens.contentMaxRem * rootFontPx),
    cardInlinePx,
    mediaBlockPx,
    gridBlockPx: round(input.gridRequiredBlockPx),
    tokens: nextTokens,
  })
}
