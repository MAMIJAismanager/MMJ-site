import {
  WORKS_R6_BOTTOM_SAFETY_PX,
  WORKS_R6_GEOMETRY_EPSILON_PX,
  WORKS_R6_MOBILE_MAX_WIDTH,
  WORKS_R6_TABLET_MAX_WIDTH,
  isWorksR6DisplayClass,
  type WorksPageCompositionCandidate,
  type WorksPageCompositionCommit,
  type WorksPageProbeReceipt,
  type WorksPageSolveInput,
} from './works-page-composition'

interface WorksPageSolveState {
  readonly input: WorksPageSolveInput
  readonly candidates: readonly WorksPageCompositionCandidate[]
  readonly candidateIndex: number
  readonly probeCount: number
}

export type WorksPageSolveDecision =
  | {
      readonly kind: 'probe-required'
      readonly state: WorksPageSolveState
      readonly candidate: WorksPageCompositionCandidate
    }
  | {
      readonly kind: 'commit-ready'
      readonly commit: WorksPageCompositionCommit
    }
  | {
      readonly kind: 'failed'
      readonly key: string
      readonly reason:
        | 'no-candidate'
        | 'invalid-receipt'
        | 'all-candidates-rejected'
    }

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

function candidate(
  input: WorksPageSolveInput,
  probeId: number,
  shape: Omit<WorksPageCompositionCandidate, 'key' | 'probeId' | 'railInlinePx'> & {
    readonly railCapPx: number
  },
): WorksPageCompositionCandidate {
  const railInlinePx = Math.max(
    1,
    Math.min(input.availableInlinePx, shape.railCapPx),
  )

  return Object.freeze({
    key: input.key,
    probeId,
    presetId: shape.presetId,
    mode: shape.mode,
    layoutMode: shape.layoutMode,
    queryPlacement: shape.queryPlacement,
    railInlinePx: round(railInlinePx),
    columnCount: shape.columnCount,
    cardDensity: shape.cardDensity,
    pagePaddingBlockPx: shape.pagePaddingBlockPx,
    pageGapPx: shape.pageGapPx,
    headerGapPx: shape.headerGapPx,
    titlePx: shape.titlePx,
    queryGapPx: shape.queryGapPx,
    queryPaddingPx: shape.queryPaddingPx,
    queryControlBlockPx: shape.queryControlBlockPx,
    gridGapPx: shape.gridGapPx,
    cardPaddingPx: shape.cardPaddingPx,
    cardTitlePx: shape.cardTitlePx,
    minimumCardInlinePx: shape.minimumCardInlinePx,
    requireSingleViewport: shape.requireSingleViewport,
  })
}

function displayCandidates(
  input: WorksPageSolveInput,
): readonly WorksPageCompositionCandidate[] {
  const wide = input.viewportWidthPx >= 2304
  const layoutMode = wide ? 'desktop-wide' : 'desktop-reference'
  const referenceRail = wide ? 1408 : 1248
  const compactRail = wide ? 1280 : 1120
  const tightRail = wide ? 1184 : 1008

  return Object.freeze([
    candidate(input, 1, {
      presetId: 'display-reference',
      mode: 'display-single-viewport',
      layoutMode,
      queryPlacement: 'inline',
      railCapPx: referenceRail,
      columnCount: 4,
      cardDensity: wide ? 'relaxed' : 'reference',
      pagePaddingBlockPx: 10,
      pageGapPx: 8,
      headerGapPx: 5,
      titlePx: wide ? 42 : 38,
      queryGapPx: 9,
      queryPaddingPx: 8,
      queryControlBlockPx: 38,
      gridGapPx: 8,
      cardPaddingPx: 8,
      cardTitlePx: wide ? 15.5 : 14.5,
      minimumCardInlinePx: 230,
      requireSingleViewport: true,
    }),
    candidate(input, 2, {
      presetId: 'display-compact',
      mode: 'display-single-viewport',
      layoutMode,
      queryPlacement: 'inline',
      railCapPx: compactRail,
      columnCount: 4,
      cardDensity: 'compact',
      pagePaddingBlockPx: 8,
      pageGapPx: 7,
      headerGapPx: 4,
      titlePx: 34,
      queryGapPx: 8,
      queryPaddingPx: 7,
      queryControlBlockPx: 36,
      gridGapPx: 7,
      cardPaddingPx: 7,
      cardTitlePx: 13.75,
      minimumCardInlinePx: 205,
      requireSingleViewport: true,
    }),
    candidate(input, 3, {
      presetId: 'display-tight',
      mode: 'display-single-viewport',
      layoutMode,
      queryPlacement: 'inline',
      railCapPx: tightRail,
      columnCount: 4,
      cardDensity: 'compact',
      pagePaddingBlockPx: 7,
      pageGapPx: 6,
      headerGapPx: 4,
      titlePx: 32,
      queryGapPx: 7,
      queryPaddingPx: 6,
      queryControlBlockPx: 34,
      gridGapPx: 6,
      cardPaddingPx: 6.5,
      cardTitlePx: 13.5,
      minimumCardInlinePx: 188,
      requireSingleViewport: true,
    }),
    candidate(input, 4, {
      presetId: 'display-flow-3col',
      mode: 'flow',
      layoutMode: 'desktop-flow',
      queryPlacement: 'inline',
      railCapPx: Math.min(input.availableInlinePx, 1180),
      columnCount: 3,
      cardDensity: 'balanced',
      pagePaddingBlockPx: 24,
      pageGapPx: 20,
      headerGapPx: 8,
      titlePx: 40,
      queryGapPx: 12,
      queryPaddingPx: 12,
      queryControlBlockPx: 44,
      gridGapPx: 14,
      cardPaddingPx: 12,
      cardTitlePx: 16,
      minimumCardInlinePx: 220,
      requireSingleViewport: false,
    }),
    candidate(input, 5, {
      presetId: 'display-flow-2col',
      mode: 'flow',
      layoutMode: 'tablet-flow',
      queryPlacement: 'inline',
      railCapPx: Math.min(input.availableInlinePx, 960),
      columnCount: 2,
      cardDensity: 'balanced',
      pagePaddingBlockPx: 24,
      pageGapPx: 20,
      headerGapPx: 8,
      titlePx: 38,
      queryGapPx: 12,
      queryPaddingPx: 12,
      queryControlBlockPx: 44,
      gridGapPx: 14,
      cardPaddingPx: 12,
      cardTitlePx: 16,
      minimumCardInlinePx: 220,
      requireSingleViewport: false,
    }),
  ])
}

function mobileCandidates(
  input: WorksPageSolveInput,
): readonly WorksPageCompositionCandidate[] {
  const gapPx = 9
  const twoColumnCardPx = (
    Math.min(input.availableInlinePx, 736) - gapPx
  ) / 2
  const candidates: WorksPageCompositionCandidate[] = []
  let probeId = 1

  if (input.viewportWidthPx >= 336 && twoColumnCardPx >= 160) {
    candidates.push(candidate(input, probeId, {
      presetId: 'mobile-2col',
      mode: 'flow',
      layoutMode: 'mobile-checkerboard',
      queryPlacement: input.queryPlacement,
      railCapPx: 736,
      columnCount: 2,
      cardDensity: 'compact',
      pagePaddingBlockPx: 18,
      pageGapPx: 16,
      headerGapPx: 5,
      titlePx: clamp(input.viewportWidthPx * 0.084, 30, 34),
      queryGapPx: 12,
      queryPaddingPx: 0,
      queryControlBlockPx: 44,
      gridGapPx: gapPx,
      cardPaddingPx: 8,
      cardTitlePx: 14,
      minimumCardInlinePx: 160,
      requireSingleViewport: false,
    }))
    probeId += 1
  }

  candidates.push(candidate(input, probeId, {
    presetId: 'mobile-1col',
    mode: 'flow',
    layoutMode: 'mobile-single',
    queryPlacement: input.queryPlacement,
    railCapPx: 736,
    columnCount: 1,
    cardDensity: 'compact',
    pagePaddingBlockPx: 18,
    pageGapPx: 16,
    headerGapPx: 5,
    titlePx: clamp(input.viewportWidthPx * 0.084, 30, 34),
    queryGapPx: 12,
    queryPaddingPx: 0,
    queryControlBlockPx: 44,
    gridGapPx: 10,
    cardPaddingPx: 10,
    cardTitlePx: 15,
    minimumCardInlinePx: 248,
    requireSingleViewport: false,
  }))

  return Object.freeze(candidates)
}

function flowCandidates(
  input: WorksPageSolveInput,
): readonly WorksPageCompositionCandidate[] {
  if (input.viewportWidthPx <= WORKS_R6_MOBILE_MAX_WIDTH) {
    return mobileCandidates(input)
  }

  if (input.viewportWidthPx <= WORKS_R6_TABLET_MAX_WIDTH) {
    return Object.freeze([
      candidate(input, 1, {
        presetId: 'tablet-2col',
        mode: 'flow',
        layoutMode: 'tablet-flow',
        queryPlacement: 'inline',
        railCapPx: 960,
        columnCount: 2,
        cardDensity: 'balanced',
        pagePaddingBlockPx: 26,
        pageGapPx: 22,
        headerGapPx: 8,
        titlePx: 40,
        queryGapPx: 12,
        queryPaddingPx: 12,
        queryControlBlockPx: 44,
        gridGapPx: 14,
        cardPaddingPx: 12,
        cardTitlePx: 16,
        minimumCardInlinePx: 220,
        requireSingleViewport: false,
      }),
      candidate(input, 2, {
        presetId: 'tablet-1col',
        mode: 'flow',
        layoutMode: 'mobile-single',
        queryPlacement: 'inline',
        railCapPx: 736,
        columnCount: 1,
        cardDensity: 'balanced',
        pagePaddingBlockPx: 26,
        pageGapPx: 22,
        headerGapPx: 8,
        titlePx: 40,
        queryGapPx: 12,
        queryPaddingPx: 12,
        queryControlBlockPx: 44,
        gridGapPx: 14,
        cardPaddingPx: 12,
        cardTitlePx: 16,
        minimumCardInlinePx: 260,
        requireSingleViewport: false,
      }),
    ])
  }

  return Object.freeze([
    candidate(input, 1, {
      presetId: 'desktop-flow-3col',
      mode: 'flow',
      layoutMode: 'desktop-flow',
      queryPlacement: 'inline',
      railCapPx: 1180,
      columnCount: 3,
      cardDensity: 'balanced',
      pagePaddingBlockPx: 28,
      pageGapPx: 24,
      headerGapPx: 9,
      titlePx: 42,
      queryGapPx: 13,
      queryPaddingPx: 13,
      queryControlBlockPx: 44,
      gridGapPx: 15,
      cardPaddingPx: 13,
      cardTitlePx: 16.5,
      minimumCardInlinePx: 220,
      requireSingleViewport: false,
    }),
    candidate(input, 2, {
      presetId: 'desktop-flow-2col',
      mode: 'flow',
      layoutMode: 'tablet-flow',
      queryPlacement: 'inline',
      railCapPx: 960,
      columnCount: 2,
      cardDensity: 'balanced',
      pagePaddingBlockPx: 28,
      pageGapPx: 24,
      headerGapPx: 9,
      titlePx: 42,
      queryGapPx: 13,
      queryPaddingPx: 13,
      queryControlBlockPx: 44,
      gridGapPx: 15,
      cardPaddingPx: 13,
      cardTitlePx: 16.5,
      minimumCardInlinePx: 240,
      requireSingleViewport: false,
    }),
  ])
}

export function createWorksPageCandidates(
  input: WorksPageSolveInput,
): readonly WorksPageCompositionCandidate[] {
  return isWorksR6DisplayClass({
    width: input.viewportWidthPx,
    height: input.viewportHeightPx,
  })
    ? displayCandidates(input)
    : flowCandidates(input)
}

function cardInlineFromCandidate(
  candidate: WorksPageCompositionCandidate,
): number {
  return (
    candidate.railInlinePx
    - candidate.gridGapPx * (candidate.columnCount - 1)
  ) / candidate.columnCount
}

function receiptMatches(
  candidate: WorksPageCompositionCandidate,
  receipt: WorksPageProbeReceipt,
): boolean {
  return (
    receipt.key === candidate.key
    && receipt.probeId === candidate.probeId
    && receipt.presetId === candidate.presetId
  )
}

function receiptFits(
  input: WorksPageSolveInput,
  candidate: WorksPageCompositionCandidate,
  receipt: WorksPageProbeReceipt,
): boolean {
  const expectedCardInlinePx = cardInlineFromCandidate(candidate)
  const basePhysicalFit = (
    receipt.stable
    && Math.abs(receipt.railInlinePx - candidate.railInlinePx)
      <= WORKS_R6_GEOMETRY_EPSILON_PX
    && Math.abs(receipt.gridInlinePx - candidate.railInlinePx)
      <= WORKS_R6_GEOMETRY_EPSILON_PX
    && receipt.cardInlinePx + WORKS_R6_GEOMETRY_EPSILON_PX
      >= Math.min(candidate.minimumCardInlinePx, expectedCardInlinePx)
    && receipt.horizontalOverflowPx <= WORKS_R6_GEOMETRY_EPSILON_PX
    && receipt.metadataClipCount === 0
    && receipt.latinTokenFragmentedCount === 0
    && receipt.singleGraphemeCollapseCount === 0
    && (
      candidate.queryPlacement !== 'inline'
      || receipt.queryRowCount <= 1
    )
  )

  if (!basePhysicalFit) return false
  if (!candidate.requireSingleViewport) return true

  return (
    receipt.totalPageBlockPx + WORKS_R6_BOTTOM_SAFETY_PX
      <= input.availableBlockPx + WORKS_R6_GEOMETRY_EPSILON_PX
  )
}

function commitFrom(
  state: WorksPageSolveState,
  candidate: WorksPageCompositionCandidate,
  receipt: WorksPageProbeReceipt,
): WorksPageCompositionCommit {
  const commitId = [
    'works-r6',
    candidate.presetId,
    Math.round(candidate.railInlinePx),
    `${candidate.columnCount}col`,
    state.probeCount + 1,
  ].join('-')

  return Object.freeze({
    key: state.input.key,
    commitId,
    presetId: candidate.presetId,
    mode: candidate.mode,
    layoutMode: candidate.layoutMode,
    queryPlacement: candidate.queryPlacement,
    pageRailInlinePx: candidate.railInlinePx,
    columnCount: candidate.columnCount,
    cardDensity: candidate.cardDensity,
    pagePaddingBlockPx: candidate.pagePaddingBlockPx,
    pageGapPx: candidate.pageGapPx,
    headerGapPx: candidate.headerGapPx,
    titlePx: candidate.titlePx,
    queryGapPx: candidate.queryGapPx,
    queryPaddingPx: candidate.queryPaddingPx,
    queryControlBlockPx: candidate.queryControlBlockPx,
    gridGapPx: candidate.gridGapPx,
    cardInlinePx: receipt.cardInlinePx,
    cardPaddingPx: candidate.cardPaddingPx,
    cardTitlePx: candidate.cardTitlePx,
    gridBlockPx: receipt.gridBlockPx,
    paginationBlockPx: receipt.paginationBlockPx,
    requiredBlockPx:
      receipt.totalPageBlockPx + WORKS_R6_BOTTOM_SAFETY_PX,
    availableBlockPx: state.input.availableBlockPx,
    probeCount: state.probeCount + 1,
    verified: true,
    singleViewportVerified: candidate.requireSingleViewport,
  })
}

export function beginWorksPageSolve(
  input: WorksPageSolveInput,
): WorksPageSolveDecision {
  const candidates = createWorksPageCandidates(input)
  const first = candidates[0]
  if (first === undefined) {
    return Object.freeze({
      kind: 'failed',
      key: input.key,
      reason: 'no-candidate',
    })
  }

  const state: WorksPageSolveState = Object.freeze({
    input,
    candidates,
    candidateIndex: 0,
    probeCount: 0,
  })

  return Object.freeze({
    kind: 'probe-required',
    state,
    candidate: first,
  })
}

export function advanceWorksPageSolve(
  previous: Extract<WorksPageSolveDecision, { readonly kind: 'probe-required' }>,
  receipt: WorksPageProbeReceipt,
): WorksPageSolveDecision {
  const { state, candidate } = previous
  if (!receiptMatches(candidate, receipt)) {
    return Object.freeze({
      kind: 'failed',
      key: state.input.key,
      reason: 'invalid-receipt',
    })
  }

  if (receiptFits(state.input, candidate, receipt)) {
    return Object.freeze({
      kind: 'commit-ready',
      commit: commitFrom(state, candidate, receipt),
    })
  }

  const nextIndex = state.candidateIndex + 1
  const nextCandidate = state.candidates[nextIndex]
  if (nextCandidate === undefined) {
    return Object.freeze({
      kind: 'failed',
      key: state.input.key,
      reason: 'all-candidates-rejected',
    })
  }

  const nextState: WorksPageSolveState = Object.freeze({
    ...state,
    candidateIndex: nextIndex,
    probeCount: state.probeCount + 1,
  })

  return Object.freeze({
    kind: 'probe-required',
    state: nextState,
    candidate: nextCandidate,
  })
}
