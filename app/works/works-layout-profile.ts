export const WORKS_REFERENCE_VIEWPORT = Object.freeze({
  width: 1920,
  height: 1080,
} as const)

export const WORKS_REFERENCE_MIN_VIEWPORT = Object.freeze({
  width: 1440,
  height: 760,
} as const)

export const WORKS_ULTRAWIDE_MIN_WIDTH = 2304
export const WORKS_MOBILE_MIN_CHECKERBOARD_WIDTH = 336
export const WORKS_MOBILE_MAX_WIDTH = 767
export const WORKS_TABLET_MAX_WIDTH = 1179

export type WorksLayoutMode =
  | 'pending'
  | 'mobile-single'
  | 'mobile-checkerboard'
  | 'tablet-flow'
  | 'desktop-flow'
  | 'desktop-reference'
  | 'desktop-wide'

export type WorksCardDensity =
  | 'compact'
  | 'balanced'
  | 'reference'
  | 'relaxed'

export interface WorksViewportSnapshot {
  readonly width: number
  readonly height: number
}

export interface WorksLayoutTokens {
  readonly contentMaxRem: number
  readonly pagePaddingBlockRem: number
  readonly pageGapRem: number
  readonly headerGapRem: number
  readonly titleRem: number
  readonly queryGapRem: number
  readonly queryPaddingRem: number
  readonly queryControlHeightRem: number
  readonly gridGapRem: number
  readonly cardPaddingRem: number
  readonly cardTitleRem: number
}

export interface WorksLayoutProfile {
  readonly mode: WorksLayoutMode
  readonly columnCount: 1 | 2 | 3 | 4
  readonly pageRowCount: 2 | 3 | 4 | 8
  readonly viewportLocked: boolean
  readonly mobileQueryPlacement: boolean
  readonly referenceScale: number
  readonly verticalScale: number
  readonly cardDensity: WorksCardDensity
  readonly tokens: WorksLayoutTokens
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

function freezeTokens(tokens: WorksLayoutTokens): WorksLayoutTokens {
  return Object.freeze({ ...tokens })
}

function freezeProfile(profile: WorksLayoutProfile): WorksLayoutProfile {
  return Object.freeze({
    ...profile,
    tokens: freezeTokens(profile.tokens),
  })
}

function referenceTokens(
  referenceScale: number,
  verticalScale: number,
): WorksLayoutTokens {
  return freezeTokens({
    contentMaxRem: round(clamp(92 * referenceScale, 68, 108)),
    pagePaddingBlockRem: round(clamp(0.8 * verticalScale, 0.5, 1.05)),
    pageGapRem: round(clamp(0.68 * verticalScale, 0.45, 0.85)),
    headerGapRem: round(clamp(0.38 * verticalScale, 0.24, 0.5)),
    titleRem: round(clamp(2.7 * referenceScale, 2.05, 3.15)),
    queryGapRem: round(clamp(0.75 * referenceScale, 0.55, 0.95)),
    queryPaddingRem: round(clamp(0.72 * referenceScale, 0.55, 0.9)),
    queryControlHeightRem: round(clamp(2.5 * referenceScale, 2.25, 2.7)),
    gridGapRem: round(clamp(0.78 * referenceScale, 0.55, 1)),
    cardPaddingRem: round(clamp(0.72 * referenceScale, 0.52, 0.9)),
    cardTitleRem: round(clamp(1.02 * referenceScale, 0.84, 1.15)),
  })
}

function flowTokens(mode: WorksLayoutMode): WorksLayoutTokens {
  switch (mode) {
    case 'mobile-single':
      return freezeTokens({
        contentMaxRem: 46,
        pagePaddingBlockRem: 1.2,
        pageGapRem: 1.1,
        headerGapRem: 0.35,
        titleRem: 2,
        queryGapRem: 0.75,
        queryPaddingRem: 0,
        queryControlHeightRem: 2.75,
        gridGapRem: 0.7,
        cardPaddingRem: 0.62,
        cardTitleRem: 0.92,
      })
    case 'mobile-checkerboard':
      return freezeTokens({
        contentMaxRem: 46,
        pagePaddingBlockRem: 1.1,
        pageGapRem: 1,
        headerGapRem: 0.3,
        titleRem: 2.1,
        queryGapRem: 0.75,
        queryPaddingRem: 0,
        queryControlHeightRem: 2.75,
        gridGapRem: 0.58,
        cardPaddingRem: 0.52,
        cardTitleRem: 0.86,
      })
    case 'tablet-flow':
      return freezeTokens({
        contentMaxRem: 68,
        pagePaddingBlockRem: 2,
        pageGapRem: 1.75,
        headerGapRem: 0.55,
        titleRem: 2.65,
        queryGapRem: 0.9,
        queryPaddingRem: 0.9,
        queryControlHeightRem: 2.75,
        gridGapRem: 0.9,
        cardPaddingRem: 0.8,
        cardTitleRem: 1,
      })
    case 'desktop-flow':
    case 'pending':
    default:
      return freezeTokens({
        contentMaxRem: 84,
        pagePaddingBlockRem: 2.25,
        pageGapRem: 1.85,
        headerGapRem: 0.55,
        titleRem: 2.8,
        queryGapRem: 0.9,
        queryPaddingRem: 0.9,
        queryControlHeightRem: 2.75,
        gridGapRem: 1,
        cardPaddingRem: 0.85,
        cardTitleRem: 1.05,
      })
  }
}

export const WORKS_PENDING_LAYOUT_PROFILE = freezeProfile({
  mode: 'pending',
  columnCount: 3,
  pageRowCount: 3,
  viewportLocked: false,
  mobileQueryPlacement: false,
  referenceScale: 1,
  verticalScale: 1,
  cardDensity: 'balanced',
  tokens: flowTokens('pending'),
})

export function resolveWorksLayoutProfile(
  viewport: WorksViewportSnapshot,
): WorksLayoutProfile {
  const width = Math.max(1, Math.round(viewport.width))
  const height = Math.max(1, Math.round(viewport.height))

  const referenceScale = round(clamp(
    Math.min(
      width / WORKS_REFERENCE_VIEWPORT.width,
      height / WORKS_REFERENCE_VIEWPORT.height,
    ),
    0.72,
    1.18,
  ))

  const verticalScale = round(clamp(
    height / WORKS_REFERENCE_VIEWPORT.height,
    0.72,
    1.12,
  ))

  if (width < WORKS_MOBILE_MIN_CHECKERBOARD_WIDTH) {
    return freezeProfile({
      mode: 'mobile-single',
      columnCount: 1,
      pageRowCount: 8,
      viewportLocked: false,
      mobileQueryPlacement: true,
      referenceScale,
      verticalScale,
      cardDensity: 'compact',
      tokens: flowTokens('mobile-single'),
    })
  }

  if (width <= WORKS_MOBILE_MAX_WIDTH) {
    return freezeProfile({
      mode: 'mobile-checkerboard',
      columnCount: 2,
      pageRowCount: 4,
      viewportLocked: false,
      mobileQueryPlacement: true,
      referenceScale,
      verticalScale,
      cardDensity: 'compact',
      tokens: flowTokens('mobile-checkerboard'),
    })
  }

  if (width <= WORKS_TABLET_MAX_WIDTH) {
    return freezeProfile({
      mode: 'tablet-flow',
      columnCount: 2,
      pageRowCount: 4,
      viewportLocked: false,
      mobileQueryPlacement: false,
      referenceScale,
      verticalScale,
      cardDensity: 'balanced',
      tokens: flowTokens('tablet-flow'),
    })
  }

  const referenceCapable = (
    width >= WORKS_REFERENCE_MIN_VIEWPORT.width
    && height >= WORKS_REFERENCE_MIN_VIEWPORT.height
  )

  if (!referenceCapable) {
    return freezeProfile({
      mode: 'desktop-flow',
      columnCount: 3,
      pageRowCount: 3,
      viewportLocked: false,
      mobileQueryPlacement: false,
      referenceScale,
      verticalScale,
      cardDensity: 'balanced',
      tokens: flowTokens('desktop-flow'),
    })
  }

  const wide = width >= WORKS_ULTRAWIDE_MIN_WIDTH
  return freezeProfile({
    mode: wide ? 'desktop-wide' : 'desktop-reference',
    columnCount: 4,
    pageRowCount: 2,
    viewportLocked: true,
    mobileQueryPlacement: false,
    referenceScale,
    verticalScale,
    cardDensity: wide && referenceScale > 1.05
      ? 'relaxed'
      : 'reference',
    tokens: referenceTokens(referenceScale, verticalScale),
  })
}
