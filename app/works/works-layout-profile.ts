import type {
  WorksPhysicalFitPhase,
  WorksPhysicalFitReceipt,
} from './works-physical-fit'
import type {
  WorksReferenceFitSolution,
} from './works-reference-fit-solver'

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

// Candidate-only sizing hints. These values may shape a natural-flow trial,
// but they never authorize viewport locking. Physical DOM receipts own commit.
const WORKS_CANDIDATE_SITE_HEADER_HINT_PX = 72
const WORKS_CANDIDATE_PAGINATION_HINT_PX = 44
const WORKS_CANDIDATE_SAFETY_HINT_PX = 12

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

export type WorksViewportFitAdmission =
  | 'not-applicable'
  | 'reference'
  | 'compact'
  | 'natural-flow'

export interface WorksViewportSnapshot {
  readonly width: number
  readonly height: number
  readonly layoutWidth?: number
  readonly layoutHeight?: number
  readonly visualOffsetTop?: number
  readonly visualOffsetLeft?: number
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

export interface WorksViewportFitReceipt {
  readonly admitted: boolean
  readonly admission: WorksViewportFitAdmission
  readonly availableBlockPx: number
  readonly requiredBlockPx: number
  readonly gridBlockPx: number
  readonly paginationReservedBlockPx: number
}

export interface WorksLayoutProfile {
  readonly mode: WorksLayoutMode
  readonly columnCount: 1 | 2 | 3 | 4
  readonly pageRowCount: 2 | 3 | 4 | 8
  readonly viewportLocked: boolean
  readonly lockEligible: boolean
  readonly physicalFitPhase: WorksPhysicalFitPhase
  readonly candidateAdmission: 'not-applicable' | 'reference' | 'compact'
  readonly mobileQueryPlacement: boolean
  readonly referenceScale: number
  readonly verticalScale: number
  readonly cardDensity: WorksCardDensity
  readonly paginationPlacement: 'in-flow'
  readonly viewportFit: WorksViewportFitReceipt
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

function freezeFit(receipt: WorksViewportFitReceipt): WorksViewportFitReceipt {
  return Object.freeze({ ...receipt })
}

function freezeProfile(profile: WorksLayoutProfile): WorksLayoutProfile {
  return Object.freeze({
    ...profile,
    viewportFit: freezeFit(profile.viewportFit),
    tokens: freezeTokens(profile.tokens),
  })
}

function referenceTokens(
  referenceScale: number,
  verticalScale: number,
): WorksLayoutTokens {
  return freezeTokens({
    contentMaxRem: round(clamp(84 * referenceScale, 64, 102)),
    pagePaddingBlockRem: round(clamp(0.62 * verticalScale, 0.48, 0.85)),
    pageGapRem: round(clamp(0.5 * verticalScale, 0.38, 0.7)),
    headerGapRem: round(clamp(0.3 * verticalScale, 0.22, 0.42)),
    titleRem: round(clamp(2.4 * referenceScale, 1.98, 2.8)),
    queryGapRem: round(clamp(0.58 * referenceScale, 0.44, 0.78)),
    queryPaddingRem: round(clamp(0.5 * referenceScale, 0.4, 0.7)),
    queryControlHeightRem: round(clamp(2.35 * referenceScale, 2.2, 2.55)),
    gridGapRem: round(clamp(0.58 * referenceScale, 0.44, 0.78)),
    cardPaddingRem: round(clamp(0.5 * referenceScale, 0.43, 0.68)),
    cardTitleRem: round(clamp(0.92 * referenceScale, 0.84, 1.05)),
  })
}

function compactReferenceTokens(
  referenceScale: number,
  verticalScale: number,
): WorksLayoutTokens {
  return freezeTokens({
    contentMaxRem: round(clamp(92 * referenceScale, 52, 100)),
    pagePaddingBlockRem: round(clamp(0.62 * verticalScale, 0.45, 0.8)),
    pageGapRem: round(clamp(0.5 * verticalScale, 0.35, 0.65)),
    headerGapRem: round(clamp(0.3 * verticalScale, 0.22, 0.4)),
    titleRem: round(clamp(2.25 * referenceScale, 1.9, 2.6)),
    queryGapRem: round(clamp(0.58 * referenceScale, 0.45, 0.8)),
    queryPaddingRem: round(clamp(0.5 * referenceScale, 0.42, 0.75)),
    queryControlHeightRem: round(clamp(2.3 * referenceScale, 2.15, 2.5)),
    gridGapRem: round(clamp(0.6 * referenceScale, 0.45, 0.8)),
    cardPaddingRem: round(clamp(0.52 * referenceScale, 0.45, 0.7)),
    cardTitleRem: round(clamp(0.86 * referenceScale, 0.78, 0.98)),
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

function viewportFitFromPhysical(
  physicalFit: WorksPhysicalFitReceipt | null,
  candidateAdmission: 'not-applicable' | 'reference' | 'compact',
): WorksViewportFitReceipt {
  if (physicalFit === null) {
    return freezeFit({
      admitted: false,
      admission: candidateAdmission === 'not-applicable'
        ? 'not-applicable'
        : 'natural-flow',
      availableBlockPx: 0,
      requiredBlockPx: 0,
      gridBlockPx: 0,
      paginationReservedBlockPx: 0,
    })
  }

  const admitted = physicalFit.phase === 'admitted-locked'
  return freezeFit({
    admitted,
    admission: admitted && candidateAdmission !== 'not-applicable'
      ? candidateAdmission
      : candidateAdmission === 'not-applicable'
        ? 'not-applicable'
        : 'natural-flow',
    availableBlockPx: physicalFit.availableBlockPx,
    requiredBlockPx: physicalFit.requiredBlockPx,
    gridBlockPx: physicalFit.gridBlockPx,
    paginationReservedBlockPx: physicalFit.paginationBlockPx,
  })
}

function deriveReferenceCandidateTokens(
  height: number,
  baseTokens: WorksLayoutTokens,
  metadataHintPx: number,
  minimumContentRem: number,
): WorksLayoutTokens {
  const remPx = 16
  const availableBlockHintPx = Math.max(
    0,
    height
      - WORKS_CANDIDATE_SITE_HEADER_HINT_PX
      - WORKS_CANDIDATE_SAFETY_HINT_PX,
  )
  const pagePaddingPx = baseTokens.pagePaddingBlockRem * remPx
  const pageGapPx = baseTokens.pageGapRem * remPx
  const headerGapPx = baseTokens.headerGapRem * remPx
  const titlePx = baseTokens.titleRem * remPx
  const queryPaddingPx = baseTokens.queryPaddingRem * remPx
  const queryControlPx = baseTokens.queryControlHeightRem * remPx
  const gridGapPx = baseTokens.gridGapRem * remPx

  const headerBlockHintPx = 19 + headerGapPx + (titlePx * 1.18)
  const queryBlockHintPx = (queryPaddingPx * 2) + 28 + queryControlPx
  const staticBlockHintPx = (
    (pagePaddingPx * 2)
    + headerBlockHintPx
    + queryBlockHintPx
    + 22
    + WORKS_CANDIDATE_PAGINATION_HINT_PX
    + (pageGapPx * 4)
  )
  const gridAvailableHintPx = Math.max(
    0,
    availableBlockHintPx - staticBlockHintPx,
  )
  const rowAvailableHintPx = Math.max(
    0,
    (gridAvailableHintPx - gridGapPx) / 2,
  )
  const mediaAvailableHintPx = Math.max(
    0,
    rowAvailableHintPx - metadataHintPx,
  )
  const cardInlineByHeightHintPx = mediaAvailableHintPx * (4 / 3)
  const heightBoundContentHintPx = (
    (cardInlineByHeightHintPx * 4)
    + (gridGapPx * 3)
  )
  const desiredContentPx = baseTokens.contentMaxRem * remPx
  const minimumContentPx = minimumContentRem * remPx
  const contentMaxPx = Math.max(
    minimumContentPx,
    Math.min(desiredContentPx, heightBoundContentHintPx),
  )

  return freezeTokens({
    ...baseTokens,
    contentMaxRem: round(contentMaxPx / remPx),
  })
}

export const WORKS_PENDING_LAYOUT_PROFILE = freezeProfile({
  mode: 'pending',
  columnCount: 3,
  pageRowCount: 3,
  viewportLocked: false,
  lockEligible: false,
  physicalFitPhase: 'not-applicable',
  candidateAdmission: 'not-applicable',
  mobileQueryPlacement: false,
  referenceScale: 1,
  verticalScale: 1,
  cardDensity: 'balanced',
  paginationPlacement: 'in-flow',
  viewportFit: viewportFitFromPhysical(null, 'not-applicable'),
  tokens: flowTokens('pending'),
})

export function resolveWorksLayoutProfile(
  viewport: WorksViewportSnapshot,
  physicalFit: WorksPhysicalFitReceipt | null = null,
  referenceFit: WorksReferenceFitSolution | null = null,
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
      lockEligible: false,
      physicalFitPhase: 'not-applicable',
      candidateAdmission: 'not-applicable',
      mobileQueryPlacement: true,
      referenceScale,
      verticalScale,
      cardDensity: 'compact',
      paginationPlacement: 'in-flow',
      viewportFit: viewportFitFromPhysical(null, 'not-applicable'),
      tokens: flowTokens('mobile-single'),
    })
  }

  if (width <= WORKS_MOBILE_MAX_WIDTH) {
    return freezeProfile({
      mode: 'mobile-checkerboard',
      columnCount: 2,
      pageRowCount: 4,
      viewportLocked: false,
      lockEligible: false,
      physicalFitPhase: 'not-applicable',
      candidateAdmission: 'not-applicable',
      mobileQueryPlacement: true,
      referenceScale,
      verticalScale,
      cardDensity: 'compact',
      paginationPlacement: 'in-flow',
      viewportFit: viewportFitFromPhysical(null, 'not-applicable'),
      tokens: flowTokens('mobile-checkerboard'),
    })
  }

  if (width <= WORKS_TABLET_MAX_WIDTH) {
    return freezeProfile({
      mode: 'tablet-flow',
      columnCount: 2,
      pageRowCount: 4,
      viewportLocked: false,
      lockEligible: false,
      physicalFitPhase: 'not-applicable',
      candidateAdmission: 'not-applicable',
      mobileQueryPlacement: false,
      referenceScale,
      verticalScale,
      cardDensity: 'balanced',
      paginationPlacement: 'in-flow',
      viewportFit: viewportFitFromPhysical(null, 'not-applicable'),
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
      lockEligible: false,
      physicalFitPhase: 'not-applicable',
      candidateAdmission: 'not-applicable',
      mobileQueryPlacement: false,
      referenceScale,
      verticalScale,
      cardDensity: 'balanced',
      paginationPlacement: 'in-flow',
      viewportFit: viewportFitFromPhysical(null, 'not-applicable'),
      tokens: flowTokens('desktop-flow'),
    })
  }

  const wide = width >= WORKS_ULTRAWIDE_MIN_WIDTH
  const compactCandidate = verticalScale < 0.9
  const candidateAdmission = compactCandidate
    ? 'compact' as const
    : 'reference' as const
  const candidateBaseTokens = compactCandidate
    ? deriveReferenceCandidateTokens(
        height,
        compactReferenceTokens(referenceScale, verticalScale),
        60,
        52,
      )
    : deriveReferenceCandidateTokens(
        height,
        referenceTokens(referenceScale, verticalScale),
        wide && referenceScale > 1.05 ? 76 : 70,
        64,
      )
  const candidateTokens = (
    referenceFit?.hardReference === true
    && referenceFit.tokens !== null
  )
    ? referenceFit.tokens
    : candidateBaseTokens
  const solvedDensity = referenceFit?.hardReference === true
    ? referenceFit.density
    : null
  const cardDensity: WorksCardDensity = (
    solvedDensity === 'compact'
    || solvedDensity === 'tight'
  )
    ? 'compact'
    : compactCandidate
      ? 'compact'
      : wide && referenceScale > 1.05
        ? 'relaxed'
        : 'reference'
  const physicalFitPhase = physicalFit?.phase ?? 'unmeasured'
  const viewportLocked = physicalFitPhase === 'admitted-locked'

  return freezeProfile({
    mode: wide ? 'desktop-wide' : 'desktop-reference',
    columnCount: 4,
    pageRowCount: 2,
    viewportLocked,
    lockEligible: true,
    physicalFitPhase,
    candidateAdmission,
    mobileQueryPlacement: false,
    referenceScale,
    verticalScale,
    cardDensity,
    paginationPlacement: 'in-flow',
    viewportFit: viewportFitFromPhysical(
      physicalFit,
      candidateAdmission,
    ),
    tokens: candidateTokens,
  })
}
