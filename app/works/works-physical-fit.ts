export const WORKS_PHYSICAL_FIT_SAFETY_PX = 8
export const WORKS_PHYSICAL_STABILITY_EPSILON_PX = 0.75
export const WORKS_PHYSICAL_COLLISION_EPSILON_PX = 1

export const WORKS_PHYSICAL_FIT_STATE_KEY =
  'mmj-works-physical-fit-admission-r2'
export const WORKS_PHYSICAL_FIT_ACTIVE_KEY_STATE_KEY =
  'mmj-works-physical-fit-active-key-r2'

export type WorksPhysicalFitPhase =
  | 'not-applicable'
  | 'unmeasured'
  | 'measuring-natural'
  | 'solving-reference'
  | 'admitted-locked'
  | 'rejected-flow'
  | 'revoked-flow'
  | 'invalid-reference'

export interface WorksPhysicalMeasurementSnapshot {
  readonly fitKey: string
  readonly revision: number

  readonly viewportBlockPx: number
  readonly visualViewportTopPx?: number
  readonly visualViewportBottomPx?: number
  readonly siteHeaderBlockPx: number
  readonly mainAvailableBlockPx: number
  readonly mainClientBlockPx?: number
  readonly mainScrollBlockPx?: number

  readonly documentClientBlockPx?: number
  readonly documentScrollBlockPx?: number
  readonly rootFontPx?: number

  readonly pageClientBlockPx: number
  readonly pageScrollBlockPx: number
  readonly currentContentInlinePx?: number
  readonly currentGridInlinePx?: number

  readonly headerBlockPx: number
  readonly queryBlockPx: number
  readonly summaryBlockPx: number

  readonly gridClientBlockPx: number
  readonly gridScrollBlockPx: number

  readonly paginationBlockPx: number
  readonly paginationBottomPx?: number | null
  readonly paginationBottomSafetyPx?: number
  readonly gridPaginationMinGapPx?: number
  readonly maxMetadataBlockPx?: number
  readonly row0MetadataMaxPx?: number
  readonly row1MetadataMaxPx?: number
  readonly visibleCardCount?: number

  readonly gridBottomPx: number
  readonly paginationTopPx: number | null
}

export interface WorksPhysicalFitReceipt {
  readonly fitKey: string | null
  readonly revision: number
  readonly phase: WorksPhysicalFitPhase
  readonly admitted: boolean
  readonly commitVerified: boolean

  readonly availableBlockPx: number
  readonly requiredBlockPx: number
  readonly spareBlockPx: number

  readonly headerBlockPx: number
  readonly queryBlockPx: number
  readonly summaryBlockPx: number
  readonly gridBlockPx: number
  readonly paginationBlockPx: number

  readonly row0MetadataMaxPx: number
  readonly row1MetadataMaxPx: number

  readonly visualViewportBottomPx: number
  readonly paginationBottomPx: number

  readonly pageOverflowObserved: boolean
  readonly mainOverflowObserved: boolean
  readonly documentOverflowObserved: boolean
  readonly overflowObserved: boolean
  readonly collisionObserved: boolean
  readonly paginationClipped: boolean
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

function optionalOverflow(
  scrollBlockPx: number | undefined,
  clientBlockPx: number | undefined,
): boolean {
  if (
    scrollBlockPx === undefined
    || clientBlockPx === undefined
  ) {
    return false
  }

  return (
    scrollBlockPx
    > clientBlockPx + WORKS_PHYSICAL_STABILITY_EPSILON_PX
  )
}

function collisionObserved(
  snapshot: WorksPhysicalMeasurementSnapshot,
): boolean {
  if (
    snapshot.paginationTopPx === null
    || snapshot.paginationBlockPx <= 0
  ) {
    return false
  }

  return (
    snapshot.gridBottomPx
    + (snapshot.gridPaginationMinGapPx ?? 0)
    + WORKS_PHYSICAL_COLLISION_EPSILON_PX
    > snapshot.paginationTopPx
  )
}

function paginationClipped(
  snapshot: WorksPhysicalMeasurementSnapshot,
): boolean {
  const paginationBottomPx = snapshot.paginationBottomPx
  const visualViewportBottomPx = snapshot.visualViewportBottomPx
  if (
    paginationBottomPx === null
    || paginationBottomPx === undefined
    || visualViewportBottomPx === undefined
    || snapshot.paginationBlockPx <= 0
  ) {
    return false
  }

  return (
    paginationBottomPx
      + (snapshot.paginationBottomSafetyPx ?? 0)
      > visualViewportBottomPx
        + WORKS_PHYSICAL_STABILITY_EPSILON_PX
  )
}

function receiptFromSnapshot(
  snapshot: WorksPhysicalMeasurementSnapshot,
  phase: WorksPhysicalFitPhase,
  admitted: boolean,
  commitVerified: boolean,
): WorksPhysicalFitReceipt {
  const availableBlockPx = round(snapshot.mainAvailableBlockPx)
  const requiredBlockPx = round(Math.max(
    snapshot.pageScrollBlockPx,
    snapshot.mainScrollBlockPx ?? 0,
  ))
  const pageOverflowObserved = (
    snapshot.pageScrollBlockPx
      > snapshot.pageClientBlockPx + WORKS_PHYSICAL_STABILITY_EPSILON_PX
    || snapshot.pageScrollBlockPx
      > snapshot.mainAvailableBlockPx + WORKS_PHYSICAL_STABILITY_EPSILON_PX
  )
  const mainOverflowObserved = optionalOverflow(
    snapshot.mainScrollBlockPx,
    snapshot.mainClientBlockPx,
  )
  const documentOverflowObserved = optionalOverflow(
    snapshot.documentScrollBlockPx,
    snapshot.documentClientBlockPx,
  )
  const gridOverflowObserved = (
    snapshot.gridScrollBlockPx
      > snapshot.gridClientBlockPx + WORKS_PHYSICAL_STABILITY_EPSILON_PX
  )
  const collision = collisionObserved(snapshot)
  const clipped = paginationClipped(snapshot)
  const overflowObserved = (
    pageOverflowObserved
    || mainOverflowObserved
    || documentOverflowObserved
    || gridOverflowObserved
  )

  return Object.freeze({
    fitKey: snapshot.fitKey,
    revision: snapshot.revision,
    phase,
    admitted,
    commitVerified,

    availableBlockPx,
    requiredBlockPx,
    spareBlockPx: round(availableBlockPx - requiredBlockPx),

    headerBlockPx: round(snapshot.headerBlockPx),
    queryBlockPx: round(snapshot.queryBlockPx),
    summaryBlockPx: round(snapshot.summaryBlockPx),
    gridBlockPx: round(Math.max(
      snapshot.gridClientBlockPx,
      snapshot.gridScrollBlockPx,
    )),
    paginationBlockPx: round(snapshot.paginationBlockPx),

    row0MetadataMaxPx: round(snapshot.row0MetadataMaxPx ?? 0),
    row1MetadataMaxPx: round(snapshot.row1MetadataMaxPx ?? 0),

    visualViewportBottomPx: round(snapshot.visualViewportBottomPx ?? 0),
    paginationBottomPx: round(snapshot.paginationBottomPx ?? 0),

    pageOverflowObserved,
    mainOverflowObserved,
    documentOverflowObserved,
    overflowObserved,
    collisionObserved: collision,
    paginationClipped: clipped,
  })
}

export function createInitialWorksPhysicalFitReceipt(
  fitKey: string | null = null,
  revision = 0,
  phase: WorksPhysicalFitPhase = 'unmeasured',
): WorksPhysicalFitReceipt {
  return Object.freeze({
    fitKey,
    revision,
    phase,
    admitted: false,
    commitVerified: false,

    availableBlockPx: 0,
    requiredBlockPx: 0,
    spareBlockPx: 0,

    headerBlockPx: 0,
    queryBlockPx: 0,
    summaryBlockPx: 0,
    gridBlockPx: 0,
    paginationBlockPx: 0,

    row0MetadataMaxPx: 0,
    row1MetadataMaxPx: 0,

    visualViewportBottomPx: 0,
    paginationBottomPx: 0,

    pageOverflowObserved: false,
    mainOverflowObserved: false,
    documentOverflowObserved: false,
    overflowObserved: false,
    collisionObserved: false,
    paginationClipped: false,
  })
}

export function createMeasuringWorksPhysicalFitReceipt(
  snapshot: WorksPhysicalMeasurementSnapshot,
): WorksPhysicalFitReceipt {
  return receiptFromSnapshot(
    snapshot,
    'measuring-natural',
    false,
    false,
  )
}

export function createSolvingWorksPhysicalFitReceipt(
  snapshot: WorksPhysicalMeasurementSnapshot,
): WorksPhysicalFitReceipt {
  return receiptFromSnapshot(
    snapshot,
    'solving-reference',
    false,
    false,
  )
}

export function createInvalidWorksPhysicalFitReceipt(
  snapshot: WorksPhysicalMeasurementSnapshot,
): WorksPhysicalFitReceipt {
  return receiptFromSnapshot(
    snapshot,
    'invalid-reference',
    false,
    false,
  )
}

function comparableMeasurementValues(
  snapshot: WorksPhysicalMeasurementSnapshot,
): readonly number[] {
  return Object.freeze([
    snapshot.viewportBlockPx,
    snapshot.visualViewportTopPx ?? -1,
    snapshot.visualViewportBottomPx ?? -1,
    snapshot.siteHeaderBlockPx,
    snapshot.mainAvailableBlockPx,
    snapshot.mainClientBlockPx ?? -1,
    snapshot.mainScrollBlockPx ?? -1,
    snapshot.documentClientBlockPx ?? -1,
    snapshot.documentScrollBlockPx ?? -1,
    snapshot.rootFontPx ?? -1,
    snapshot.pageClientBlockPx,
    snapshot.pageScrollBlockPx,
    snapshot.currentContentInlinePx ?? -1,
    snapshot.currentGridInlinePx ?? -1,
    snapshot.headerBlockPx,
    snapshot.queryBlockPx,
    snapshot.summaryBlockPx,
    snapshot.gridClientBlockPx,
    snapshot.gridScrollBlockPx,
    snapshot.paginationBlockPx,
    snapshot.paginationBottomPx ?? -1,
    snapshot.paginationBottomSafetyPx ?? -1,
    snapshot.gridPaginationMinGapPx ?? -1,
    snapshot.maxMetadataBlockPx ?? -1,
    snapshot.row0MetadataMaxPx ?? -1,
    snapshot.row1MetadataMaxPx ?? -1,
    snapshot.visibleCardCount ?? -1,
    snapshot.gridBottomPx,
    snapshot.paginationTopPx ?? -1,
  ])
}

export function isStableWorksPhysicalMeasurement(
  previous: WorksPhysicalMeasurementSnapshot,
  next: WorksPhysicalMeasurementSnapshot,
): boolean {
  if (
    previous.fitKey !== next.fitKey
    || previous.revision !== next.revision
  ) {
    return false
  }

  const previousValues = comparableMeasurementValues(previous)
  const nextValues = comparableMeasurementValues(next)

  return previousValues.every((value, index) => {
    const nextValue = nextValues[index]
    return (
      nextValue !== undefined
      && Math.abs(value - nextValue)
        <= WORKS_PHYSICAL_STABILITY_EPSILON_PX
    )
  })
}

export function resolveWorksNaturalPhysicalFit(
  snapshot: WorksPhysicalMeasurementSnapshot,
): WorksPhysicalFitReceipt {
  const pageOverflow = (
    snapshot.pageScrollBlockPx
      > snapshot.mainAvailableBlockPx + WORKS_PHYSICAL_STABILITY_EPSILON_PX
  )
  const gridOverflow = (
    snapshot.gridScrollBlockPx
      > snapshot.gridClientBlockPx + WORKS_PHYSICAL_STABILITY_EPSILON_PX
  )
  const collision = collisionObserved(snapshot)
  const clipped = paginationClipped(snapshot)
  const admitted = !pageOverflow && !gridOverflow && !collision && !clipped

  return receiptFromSnapshot(
    snapshot,
    admitted ? 'admitted-locked' : 'rejected-flow',
    admitted,
    false,
  )
}

export function verifyWorksLockedPhysicalCommit(
  snapshot: WorksPhysicalMeasurementSnapshot,
): WorksPhysicalFitReceipt {
  const pageOverflow = (
    snapshot.pageScrollBlockPx
      > snapshot.pageClientBlockPx + WORKS_PHYSICAL_STABILITY_EPSILON_PX
    || snapshot.pageScrollBlockPx
      > snapshot.mainAvailableBlockPx + WORKS_PHYSICAL_STABILITY_EPSILON_PX
  )
  const mainOverflow = optionalOverflow(
    snapshot.mainScrollBlockPx,
    snapshot.mainClientBlockPx,
  )
  const documentOverflow = optionalOverflow(
    snapshot.documentScrollBlockPx,
    snapshot.documentClientBlockPx,
  )
  const gridOverflow = (
    snapshot.gridScrollBlockPx
      > snapshot.gridClientBlockPx + WORKS_PHYSICAL_STABILITY_EPSILON_PX
  )
  const collision = collisionObserved(snapshot)
  const clipped = paginationClipped(snapshot)
  const admitted = !(
    pageOverflow
    || mainOverflow
    || documentOverflow
    || gridOverflow
    || collision
    || clipped
  )

  return receiptFromSnapshot(
    snapshot,
    admitted ? 'admitted-locked' : 'revoked-flow',
    admitted,
    admitted,
  )
}
