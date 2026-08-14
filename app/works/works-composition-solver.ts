import type {
  WorksCardDensity,
} from './works-layout-profile'

export const WORKS_ATOMIC_DISPLAY_CLASS_MIN_VIEWPORT = Object.freeze({
  width: 1760,
  height: 840,
} as const)

export const WORKS_COMPOSITION_MAX_PROBES = 8
export const WORKS_COMPOSITION_WIDTH_EPSILON_PX = 2
export const WORKS_COMPOSITION_BOTTOM_SAFETY_PX = 16
export const WORKS_COMPOSITION_GEOMETRY_EPSILON_PX = 1

export type WorksCompositionDensity =
  | 'comfortable'
  | 'compact'
  | 'tight'

export interface WorksCompositionPreset {
  readonly density: WorksCompositionDensity
  readonly cardDensity: WorksCardDensity
  readonly gridGapRem: number
  readonly cardPaddingRem: number
  readonly cardTitleRem: number
  readonly minimumCardInlinePx: number
}

export const WORKS_COMPOSITION_PRESETS: readonly WorksCompositionPreset[] =
  Object.freeze([
    Object.freeze({
      density: 'comfortable',
      cardDensity: 'reference',
      gridGapRem: 0.52,
      cardPaddingRem: 0.47,
      cardTitleRem: 0.9,
      minimumCardInlinePx: 210,
    }),
    Object.freeze({
      density: 'compact',
      cardDensity: 'compact',
      gridGapRem: 0.44,
      cardPaddingRem: 0.43,
      cardTitleRem: 0.86,
      minimumCardInlinePx: 198,
    }),
    Object.freeze({
      density: 'tight',
      cardDensity: 'compact',
      gridGapRem: 0.38,
      cardPaddingRem: 0.4,
      cardTitleRem: 0.84,
      minimumCardInlinePx: 188,
    }),
  ])

export interface WorksCompositionStaticMeasurement {
  readonly key: string
  readonly viewportWidthPx: number
  readonly viewportHeightPx: number
  readonly inlineLimitPx: number
  readonly availableLowerBlockPx: number
  readonly rootFontPx: number
  readonly pageGapRem: number
}

export interface WorksCompositionProbeRequest {
  readonly key: string
  readonly probeId: number
  readonly density: WorksCompositionDensity
  readonly cardDensity: WorksCardDensity
  readonly cardInlinePx: number
  readonly gridInlinePx: number
  readonly gridGapRem: number
  readonly cardPaddingRem: number
  readonly cardTitleRem: number
  readonly pageGapRem: number
}

export interface WorksCompositionProbeReceipt {
  readonly key: string
  readonly probeId: number
  readonly density: WorksCompositionDensity
  readonly cardInlinePx: number
  readonly gridInlinePx: number
  readonly gridBlockPx: number
  readonly paginationBlockPx: number
  readonly lowerCompositionBlockPx: number
  readonly row0MetadataMaxPx: number
  readonly row1MetadataMaxPx: number
  readonly visibleCardCount: number
  readonly stable: boolean
}

export interface WorksCompositionCommit {
  readonly key: string
  readonly mode: 'single-viewport'
  readonly density: WorksCompositionDensity
  readonly cardDensity: WorksCardDensity
  readonly columnCount: 4
  readonly rowCount: 1 | 2
  readonly cardInlinePx: number
  readonly gridInlinePx: number
  readonly gridGapRem: number
  readonly cardPaddingRem: number
  readonly cardTitleRem: number
  readonly gridBlockPx: number
  readonly paginationBlockPx: number
  readonly availableBlockPx: number
  readonly requiredBlockPx: number
  readonly probeCount: number
  readonly verified: true
}

interface WorksCompositionSolveState {
  readonly key: string
  readonly measurement: WorksCompositionStaticMeasurement
  readonly presetIndex: number
  readonly phase: 'max' | 'min' | 'binary'
  readonly probeCount: number
  readonly lowPassPx: number | null
  readonly highFailPx: number | null
  readonly bestReceipt: WorksCompositionProbeReceipt | null
  readonly nextCardInlinePx: number
}

export type WorksCompositionSolveDecision =
  | {
      readonly kind: 'probe-required'
      readonly state: WorksCompositionSolveState
      readonly probe: WorksCompositionProbeRequest
    }
  | {
      readonly kind: 'commit-ready'
      readonly commit: WorksCompositionCommit
    }
  | {
      readonly kind: 'flow-required'
      readonly key: string
      readonly reason:
        | 'probe-budget-exhausted'
        | 'minimum-geometry-does-not-fit'
        | 'invalid-probe-receipt'
    }

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

function presetAt(index: number): WorksCompositionPreset {
  return WORKS_COMPOSITION_PRESETS[
    Math.min(WORKS_COMPOSITION_PRESETS.length - 1, Math.max(0, index))
  ]!
}

function maxCardInlinePx(
  measurement: WorksCompositionStaticMeasurement,
  preset: WorksCompositionPreset,
): number {
  const gapPx = preset.gridGapRem * measurement.rootFontPx
  return Math.max(
    preset.minimumCardInlinePx,
    Math.floor((measurement.inlineLimitPx - (gapPx * 3)) / 4),
  )
}

function requestForState(
  state: WorksCompositionSolveState,
): WorksCompositionProbeRequest {
  const preset = presetAt(state.presetIndex)
  const gapPx = preset.gridGapRem * state.measurement.rootFontPx
  const cardInlinePx = Math.max(
    preset.minimumCardInlinePx,
    Math.floor(state.nextCardInlinePx),
  )

  return Object.freeze({
    key: state.key,
    probeId: state.probeCount + 1,
    density: preset.density,
    cardDensity: preset.cardDensity,
    cardInlinePx,
    gridInlinePx: round((cardInlinePx * 4) + (gapPx * 3)),
    gridGapRem: preset.gridGapRem,
    cardPaddingRem: preset.cardPaddingRem,
    cardTitleRem: preset.cardTitleRem,
    pageGapRem: state.measurement.pageGapRem,
  })
}

function probeFits(
  measurement: WorksCompositionStaticMeasurement,
  receipt: WorksCompositionProbeReceipt,
): boolean {
  return (
    receipt.stable
    && receipt.visibleCardCount > 0
    && receipt.gridInlinePx
      <= measurement.inlineLimitPx + WORKS_COMPOSITION_GEOMETRY_EPSILON_PX
    && receipt.lowerCompositionBlockPx + WORKS_COMPOSITION_BOTTOM_SAFETY_PX
      <= measurement.availableLowerBlockPx + WORKS_COMPOSITION_GEOMETRY_EPSILON_PX
  )
}

function commitFrom(
  state: WorksCompositionSolveState,
  receipt: WorksCompositionProbeReceipt,
): WorksCompositionCommit {
  const preset = presetAt(state.presetIndex)

  return Object.freeze({
    key: state.key,
    mode: 'single-viewport',
    density: preset.density,
    cardDensity: preset.cardDensity,
    columnCount: 4,
    rowCount: receipt.visibleCardCount > 4 ? 2 : 1,
    cardInlinePx: receipt.cardInlinePx,
    gridInlinePx: receipt.gridInlinePx,
    gridGapRem: preset.gridGapRem,
    cardPaddingRem: preset.cardPaddingRem,
    cardTitleRem: preset.cardTitleRem,
    gridBlockPx: receipt.gridBlockPx,
    paginationBlockPx: receipt.paginationBlockPx,
    availableBlockPx: state.measurement.availableLowerBlockPx,
    requiredBlockPx:
      receipt.lowerCompositionBlockPx + WORKS_COMPOSITION_BOTTOM_SAFETY_PX,
    probeCount: state.probeCount,
    verified: true,
  })
}

function nextPresetState(
  state: WorksCompositionSolveState,
): WorksCompositionSolveDecision {
  const nextPresetIndex = state.presetIndex + 1
  if (nextPresetIndex >= WORKS_COMPOSITION_PRESETS.length) {
    return Object.freeze({
      kind: 'flow-required',
      key: state.key,
      reason: 'minimum-geometry-does-not-fit',
    })
  }

  const preset = presetAt(nextPresetIndex)
  const next: WorksCompositionSolveState = Object.freeze({
    ...state,
    presetIndex: nextPresetIndex,
    phase: 'max',
    lowPassPx: null,
    highFailPx: null,
    bestReceipt: null,
    nextCardInlinePx: maxCardInlinePx(state.measurement, preset),
  })

  return Object.freeze({
    kind: 'probe-required',
    state: next,
    probe: requestForState(next),
  })
}

export function isWorksAtomicDisplayClass(
  viewport: { readonly width: number; readonly height: number },
): boolean {
  return (
    viewport.width >= WORKS_ATOMIC_DISPLAY_CLASS_MIN_VIEWPORT.width
    && viewport.height >= WORKS_ATOMIC_DISPLAY_CLASS_MIN_VIEWPORT.height
  )
}

export function beginWorksCompositionSolve(
  measurement: WorksCompositionStaticMeasurement,
): WorksCompositionSolveDecision {
  const preset = presetAt(0)
  const state: WorksCompositionSolveState = Object.freeze({
    key: measurement.key,
    measurement,
    presetIndex: 0,
    phase: 'max',
    probeCount: 0,
    lowPassPx: null,
    highFailPx: null,
    bestReceipt: null,
    nextCardInlinePx: maxCardInlinePx(measurement, preset),
  })

  return Object.freeze({
    kind: 'probe-required',
    state,
    probe: requestForState(state),
  })
}

export function advanceWorksCompositionSolve(
  previous: Extract<WorksCompositionSolveDecision, { readonly kind: 'probe-required' }>,
  receipt: WorksCompositionProbeReceipt,
): WorksCompositionSolveDecision {
  const state = previous.state
  if (
    receipt.key !== state.key
    || receipt.probeId !== previous.probe.probeId
    || receipt.density !== previous.probe.density
  ) {
    return Object.freeze({
      kind: 'flow-required',
      key: state.key,
      reason: 'invalid-probe-receipt',
    })
  }

  const probeCount = state.probeCount + 1
  const fits = probeFits(state.measurement, receipt)
  const preset = presetAt(state.presetIndex)

  if (fits && state.phase === 'max') {
    return Object.freeze({
      kind: 'commit-ready',
      commit: commitFrom(
        Object.freeze({ ...state, probeCount }),
        receipt,
      ),
    })
  }

  if (probeCount >= WORKS_COMPOSITION_MAX_PROBES) {
    const best = fits ? receipt : state.bestReceipt
    return best === null
      ? Object.freeze({
          kind: 'flow-required',
          key: state.key,
          reason: 'probe-budget-exhausted',
        })
      : Object.freeze({
          kind: 'commit-ready',
          commit: commitFrom(
            Object.freeze({ ...state, probeCount }),
            best,
          ),
        })
  }

  if (state.phase === 'max') {
    const next: WorksCompositionSolveState = Object.freeze({
      ...state,
      phase: 'min',
      probeCount,
      highFailPx: receipt.cardInlinePx,
      bestReceipt: fits ? receipt : null,
      nextCardInlinePx: preset.minimumCardInlinePx,
    })

    return Object.freeze({
      kind: 'probe-required',
      state: next,
      probe: requestForState(next),
    })
  }

  if (state.phase === 'min') {
    if (!fits) {
      return nextPresetState(Object.freeze({ ...state, probeCount }))
    }

    const highFailPx = state.highFailPx
      ?? maxCardInlinePx(state.measurement, preset)
    if (
      highFailPx - receipt.cardInlinePx
      <= WORKS_COMPOSITION_WIDTH_EPSILON_PX
    ) {
      return Object.freeze({
        kind: 'commit-ready',
        commit: commitFrom(
          Object.freeze({ ...state, probeCount }),
          receipt,
        ),
      })
    }

    const next: WorksCompositionSolveState = Object.freeze({
      ...state,
      phase: 'binary',
      probeCount,
      lowPassPx: receipt.cardInlinePx,
      highFailPx,
      bestReceipt: receipt,
      nextCardInlinePx: Math.floor(
        (receipt.cardInlinePx + highFailPx) / 2,
      ),
    })

    return Object.freeze({
      kind: 'probe-required',
      state: next,
      probe: requestForState(next),
    })
  }

  const previousLow = state.lowPassPx ?? preset.minimumCardInlinePx
  const previousHigh = state.highFailPx
    ?? maxCardInlinePx(state.measurement, preset)
  const lowPassPx = fits ? receipt.cardInlinePx : previousLow
  const highFailPx = fits ? previousHigh : receipt.cardInlinePx
  const bestReceipt = fits ? receipt : state.bestReceipt

  if (
    bestReceipt !== null
    && highFailPx - lowPassPx <= WORKS_COMPOSITION_WIDTH_EPSILON_PX
  ) {
    return Object.freeze({
      kind: 'commit-ready',
      commit: commitFrom(
        Object.freeze({ ...state, probeCount }),
        bestReceipt,
      ),
    })
  }

  const next: WorksCompositionSolveState = Object.freeze({
    ...state,
    probeCount,
    lowPassPx,
    highFailPx,
    bestReceipt,
    nextCardInlinePx: Math.floor((lowPassPx + highFailPx) / 2),
  })

  return Object.freeze({
    kind: 'probe-required',
    state: next,
    probe: requestForState(next),
  })
}
