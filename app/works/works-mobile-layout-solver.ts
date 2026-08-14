import type {
  WorksMobileCompositionCommit,
  WorksMobileCompositionFailureReason,
  WorksMobileProbeReceipt,
  WorksMobileProbeRequest,
  WorksMobileStaticMeasurement,
} from './works-mobile-composition'

export const WORKS_MOBILE_ABSOLUTE_CARD_INLINE_FLOOR_PX = 120
export const WORKS_MOBILE_GEOMETRY_EPSILON_PX = 1

interface WorksMobileSolveState {
  readonly key: string
  readonly measurement: WorksMobileStaticMeasurement
  readonly probeCount: number
}

export type WorksMobileSolveDecision =
  | {
      readonly kind: 'probe-required'
      readonly state: WorksMobileSolveState
      readonly probe: WorksMobileProbeRequest
    }
  | {
      readonly kind: 'commit-ready'
      readonly commit: WorksMobileCompositionCommit
    }
  | {
      readonly kind: 'failed'
      readonly key: string
      readonly reason: WorksMobileCompositionFailureReason
    }

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

function cardInlineFor(
  measurement: WorksMobileStaticMeasurement,
  columns: 1 | 2,
): number {
  const gapPx = measurement.gridGapRem * measurement.rootFontPx
  return Math.max(
    0,
    Math.floor(
      (
        measurement.railInlinePx
        - (gapPx * Math.max(0, columns - 1))
      ) / columns,
    ),
  )
}

function request(
  state: WorksMobileSolveState,
  columns: 1 | 2,
): WorksMobileProbeRequest {
  const measurement = state.measurement
  return Object.freeze({
    key: state.key,
    probeId: state.probeCount + 1,
    columns,
    railInlinePx: measurement.railInlinePx,
    cardInlinePx: cardInlineFor(measurement, columns),
    gridGapRem: measurement.gridGapRem,
    cardPaddingRem: measurement.cardPaddingRem,
    cardTitleRem: measurement.cardTitleRem,
    cardDensity: measurement.cardDensity,
  })
}

function receiptIsReadable(receipt: WorksMobileProbeReceipt): boolean {
  return (
    receipt.latinTokenFragmentedCount === 0
    && receipt.singleGraphemeCollapseCount === 0
    && receipt.metadataClipCount === 0
  )
}

function receiptFits(
  measurement: WorksMobileStaticMeasurement,
  receipt: WorksMobileProbeReceipt,
): boolean {
  return (
    receipt.stable
    && receipt.projectCount > 0
    && receipt.gridOverflowPx <= WORKS_MOBILE_GEOMETRY_EPSILON_PX
    && receipt.gridInlinePx
      <= measurement.railInlinePx + WORKS_MOBILE_GEOMETRY_EPSILON_PX
    && receiptIsReadable(receipt)
  )
}

function commitFrom(
  state: WorksMobileSolveState,
  receipt: WorksMobileProbeReceipt,
): WorksMobileCompositionCommit {
  const measurement = state.measurement
  return Object.freeze({
    key: state.key,
    mode: 'mobile-flow',
    columns: receipt.columns,
    railInlinePx: round(measurement.railInlinePx),
    cardInlinePx: round(receipt.cardInlinePx),
    gridGapRem: measurement.gridGapRem,
    cardPaddingRem: measurement.cardPaddingRem,
    cardTitleRem: measurement.cardTitleRem,
    cardDensity: measurement.cardDensity,
    probeCount: state.probeCount,
    readabilityVerified: true,
    overflowVerified: true,
    verified: true,
  })
}

export function beginWorksMobileSolve(
  measurement: WorksMobileStaticMeasurement,
): WorksMobileSolveDecision {
  const state: WorksMobileSolveState = Object.freeze({
    key: measurement.key,
    measurement,
    probeCount: 0,
  })
  const twoColumnCardInlinePx = cardInlineFor(measurement, 2)
  const initialColumns: 1 | 2 = twoColumnCardInlinePx
    >= WORKS_MOBILE_ABSOLUTE_CARD_INLINE_FLOOR_PX
    ? 2
    : 1

  return Object.freeze({
    kind: 'probe-required',
    state,
    probe: request(state, initialColumns),
  })
}

export function advanceWorksMobileSolve(
  previous: Extract<WorksMobileSolveDecision, { readonly kind: 'probe-required' }>,
  receipt: WorksMobileProbeReceipt,
): WorksMobileSolveDecision {
  const state = previous.state
  const probe = previous.probe
  if (
    receipt.key !== state.key
    || receipt.probeId !== probe.probeId
    || receipt.columns !== probe.columns
  ) {
    return Object.freeze({
      kind: 'failed',
      key: state.key,
      reason: 'invalid-probe-receipt',
    })
  }

  const nextState: WorksMobileSolveState = Object.freeze({
    ...state,
    probeCount: state.probeCount + 1,
  })

  if (receiptFits(state.measurement, receipt)) {
    return Object.freeze({
      kind: 'commit-ready',
      commit: commitFrom(nextState, receipt),
    })
  }

  if (probe.columns === 2) {
    return Object.freeze({
      kind: 'probe-required',
      state: nextState,
      probe: request(nextState, 1),
    })
  }

  return Object.freeze({
    kind: 'failed',
    key: state.key,
    reason: receipt.gridOverflowPx > WORKS_MOBILE_GEOMETRY_EPSILON_PX
      ? 'single-column-overflow-failed'
      : 'single-column-readability-failed',
  })
}
