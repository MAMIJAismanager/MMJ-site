import type {
  WorksLayoutTokens,
  WorksViewportSnapshot,
} from './works-layout-profile'

// R3 compatibility marker: the product/design target is still a 1920x1080 display.
export const WORKS_HARD_REFERENCE_VIEWPORT = Object.freeze({
  width: 1920,
  height: 1080,
} as const)

export const WORKS_HARD_REFERENCE_TOLERANCE_PX = 1

// R4 runtime authority: the browser's visible viewport inside a 1920-class desktop.
export const WORKS_DISPLAY_CLASS_MIN_VIEWPORT = Object.freeze({
  width: 1760,
  height: 840,
} as const)

export const WORKS_REFERENCE_MAX_FIT_PASSES = 4
export const WORKS_REFERENCE_PHYSICAL_SAFETY_PX = 8
export const WORKS_PAGINATION_BOTTOM_SAFETY_PX = 16
export const WORKS_GRID_PAGINATION_MIN_GAP_PX = 12
export const WORKS_REFERENCE_STABILITY_EPSILON_PX = 1

export const WORKS_REFERENCE_FIT_STATE_KEY =
  'mmj-works-reference-full-viewport-r4'

export type WorksReferenceFitPhase =
  | 'pending'
  | 'measure'
  | 'solving'
  | 'stabilizing'
  | 'committed'
  | 'unsatisfied'

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

  readonly row0MetadataMaxPx: number
  readonly row1MetadataMaxPx: number
  readonly maxMetadataBlockPx: number

  readonly paginationReservedBlockPx: number
  readonly gridAvailableBlockPx: number

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

  readonly headerBlockPx: number
  readonly queryBlockPx: number
  readonly summaryBlockPx: number

  readonly paginationBlockPx: number
  readonly row0MetadataMaxPx: number
  readonly row1MetadataMaxPx: number

  readonly currentTokens: WorksLayoutTokens
  readonly currentContentInlinePx: number
  readonly currentGridInlinePx: number
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
  const width = finitePositive(viewport.width, 0)
  const height = finitePositive(viewport.height, 0)

  return (
    width >= WORKS_DISPLAY_CLASS_MIN_VIEWPORT.width
    && height >= WORKS_DISPLAY_CLASS_MIN_VIEWPORT.height
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

    row0MetadataMaxPx: 0,
    row1MetadataMaxPx: 0,
    maxMetadataBlockPx: 0,

    paginationReservedBlockPx: 0,
    gridAvailableBlockPx: 0,

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
        contentMinRem: 70,
        pagePaddingBlockRem: 0.48,
        pageGapRem: 0.42,
        headerGapRem: 0.24,
        titleRem: 2.2,
        queryGapRem: 0.5,
        queryPaddingRem: 0.44,
        queryControlHeightRem: 2.25,
        gridGapRem: 0.52,
        cardPaddingRem: 0.47,
        cardTitleRem: 0.9,
      })
    case 'compact':
      return Object.freeze({
        contentMinRem: 62,
        pagePaddingBlockRem: 0.4,
        pageGapRem: 0.34,
        headerGapRem: 0.22,
        titleRem: 2.02,
        queryGapRem: 0.44,
        queryPaddingRem: 0.38,
        queryControlHeightRem: 2.2,
        gridGapRem: 0.44,
        cardPaddingRem: 0.43,
        cardTitleRem: 0.86,
      })
    case 'tight':
      return Object.freeze({
        contentMinRem: 54,
        pagePaddingBlockRem: 0.34,
        pageGapRem: 0.28,
        headerGapRem: 0.2,
        titleRem: 1.9,
        queryGapRem: 0.38,
        queryPaddingRem: 0.34,
        queryControlHeightRem: 2.15,
        gridGapRem: 0.38,
        cardPaddingRem: 0.4,
        cardTitleRem: 0.84,
      })
  }
}

function measuredNonGridBlockPx(input: WorksReferenceFitInput): number {
  const explicitBlocks = Math.max(0,
    input.headerBlockPx
      + input.queryBlockPx
      + input.summaryBlockPx,
  )
  const residual = Math.max(
    0,
    input.pageRequiredBlockPx
      - input.gridRequiredBlockPx
      - input.paginationBlockPx
      - explicitBlocks,
  )

  return explicitBlocks + residual
}

function calculateGeometry(
  input: WorksReferenceFitInput,
  tokens: WorksLayoutTokens,
) {
  const rootFontPx = finitePositive(input.rootFontPx, 16)
  const gridGapPx = tokens.gridGapRem * rootFontPx
  const paginationReservedBlockPx = Math.max(
    0,
    input.paginationBlockPx
      + WORKS_GRID_PAGINATION_MIN_GAP_PX
      + WORKS_PAGINATION_BOTTOM_SAFETY_PX,
  )
  const nonGridBlockPx = measuredNonGridBlockPx(input)
  const gridAvailableBlockPx = Math.max(
    0,
    input.mainAvailableBlockPx
      - nonGridBlockPx
      - paginationReservedBlockPx
      - WORKS_REFERENCE_PHYSICAL_SAFETY_PX,
  )

  const rowMetadataPx = Math.max(0, input.row0MetadataMaxPx)
    + Math.max(0, input.row1MetadataMaxPx)
  const mediaBlockByHeightPx = Math.max(
    0,
    (
      gridAvailableBlockPx
      - rowMetadataPx
      - gridGapPx
    ) / 2,
  )
  const cardInlineByHeightPx = mediaBlockByHeightPx * (4 / 3)

  const currentGridInlinePx = finitePositive(
    input.currentGridInlinePx,
    finitePositive(
      input.currentContentInlinePx,
      tokens.contentMaxRem * rootFontPx,
    ),
  )
  const cardInlineByWidthPx = Math.max(
    0,
    (currentGridInlinePx - (gridGapPx * 3)) / 4,
  )
  const cardInlinePx = Math.min(
    cardInlineByHeightPx > 0 ? cardInlineByHeightPx : cardInlineByWidthPx,
    cardInlineByWidthPx,
  )
  const contentInlinePx = Math.max(
    0,
    (cardInlinePx * 4) + (gridGapPx * 3),
  )
  const mediaBlockPx = cardInlinePx * 0.75
  const gridBlockPx = Math.max(
    0,
    (mediaBlockPx * 2)
      + rowMetadataPx
      + gridGapPx,
  )

  return Object.freeze({
    paginationReservedBlockPx: round(paginationReservedBlockPx),
    gridAvailableBlockPx: round(gridAvailableBlockPx),
    contentInlinePx: round(contentInlinePx),
    cardInlinePx: round(cardInlinePx),
    mediaBlockPx: round(mediaBlockPx),
    gridBlockPx: round(gridBlockPx),
  })
}

function solveNextTokens(
  input: WorksReferenceFitInput,
  pass: number,
): WorksLayoutTokens {
  const nextDensity = densityForPass(pass)
  const bounds = densityTokenBounds(nextDensity)
  const current = input.currentTokens

  const mix = nextDensity === 'compact' ? 0.86 : 0.78
  const reduce = (value: number, floor: number): number => (
    round(clamp(value * mix, floor, value))
  )

  // R4 keeps the query/header page width stable. Only the grid gets the
  // height-bound inline solution, preventing filter controls from wrapping
  // merely to make room for cards.
  return freezeTokens({
    contentMaxRem: current.contentMaxRem,
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
  const geometry = calculateGeometry(input, input.currentTokens)
  const safetyAdjustedRequiredPx = Math.max(
    requiredBlockPx + WORKS_PAGINATION_BOTTOM_SAFETY_PX,
    measuredNonGridBlockPx(input)
      + geometry.gridBlockPx
      + geometry.paginationReservedBlockPx
      + WORKS_REFERENCE_PHYSICAL_SAFETY_PX,
  )
  const admitted = (
    hardReference
    && safetyAdjustedRequiredPx
      <= availableBlockPx + WORKS_REFERENCE_STABILITY_EPSILON_PX
  )

  const maxMetadataBlockPx = Math.max(
    input.row0MetadataMaxPx,
    input.row1MetadataMaxPx,
  )

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
      row0MetadataMaxPx: round(input.row0MetadataMaxPx),
      row1MetadataMaxPx: round(input.row1MetadataMaxPx),
      maxMetadataBlockPx: round(maxMetadataBlockPx),
      ...geometry,
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
      row0MetadataMaxPx: round(input.row0MetadataMaxPx),
      row1MetadataMaxPx: round(input.row1MetadataMaxPx),
      maxMetadataBlockPx: round(maxMetadataBlockPx),
      ...geometry,
      tokens: freezeTokens(input.currentTokens),
    })
  }

  const nextPass = input.previousPass + 1
  if (nextPass > WORKS_REFERENCE_MAX_FIT_PASSES) {
    return freezeSolution({
      revision: input.revision,
      fitKey: input.fitKey,
      phase: 'unsatisfied',
      pass: input.previousPass,
      density: densityForPass(input.previousPass),
      hardReference: true,
      admitted: false,
      availableBlockPx,
      requiredBlockPx,
      spareBlockPx,
      row0MetadataMaxPx: round(input.row0MetadataMaxPx),
      row1MetadataMaxPx: round(input.row1MetadataMaxPx),
      maxMetadataBlockPx: round(maxMetadataBlockPx),
      ...geometry,
      tokens: freezeTokens(input.currentTokens),
    })
  }

  const nextTokens = solveNextTokens(input, nextPass)
  const nextGeometry = calculateGeometry(input, nextTokens)
  const stableWidth = Math.abs(
    nextGeometry.contentInlinePx - geometry.contentInlinePx,
  ) <= WORKS_REFERENCE_STABILITY_EPSILON_PX

  return freezeSolution({
    revision: input.revision,
    fitKey: input.fitKey,
    phase: stableWidth ? 'stabilizing' : 'solving',
    pass: nextPass,
    density: densityForPass(nextPass),
    hardReference: true,
    admitted: false,
    availableBlockPx,
    requiredBlockPx,
    spareBlockPx,
    row0MetadataMaxPx: round(input.row0MetadataMaxPx),
    row1MetadataMaxPx: round(input.row1MetadataMaxPx),
    maxMetadataBlockPx: round(maxMetadataBlockPx),
    ...nextGeometry,
    tokens: nextTokens,
  })
}
