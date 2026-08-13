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
  | 'admitted-locked'
  | 'rejected-flow'
  | 'revoked-flow'

export interface WorksPhysicalMeasurementSnapshot {
  readonly fitKey: string
  readonly revision: number

  readonly viewportBlockPx: number
  readonly siteHeaderBlockPx: number
  readonly mainAvailableBlockPx: number

  readonly pageClientBlockPx: number
  readonly pageScrollBlockPx: number

  readonly headerBlockPx: number
  readonly queryBlockPx: number
  readonly summaryBlockPx: number

  readonly gridClientBlockPx: number
  readonly gridScrollBlockPx: number

  readonly paginationBlockPx: number

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

  readonly overflowObserved: boolean
  readonly collisionObserved: boolean
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
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
    + WORKS_PHYSICAL_COLLISION_EPSILON_PX
    > snapshot.paginationTopPx
  )
}

function receiptFromSnapshot(
  snapshot: WorksPhysicalMeasurementSnapshot,
  phase: WorksPhysicalFitPhase,
  admitted: boolean,
  commitVerified: boolean,
  overflowObserved: boolean,
  collision: boolean,
): WorksPhysicalFitReceipt {
  const availableBlockPx = round(snapshot.mainAvailableBlockPx)
  const requiredBlockPx = round(snapshot.pageScrollBlockPx)

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

    overflowObserved,
    collisionObserved: collision,
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

    overflowObserved: false,
    collisionObserved: false,
  })
}

export function createMeasuringWorksPhysicalFitReceipt(
  snapshot: WorksPhysicalMeasurementSnapshot,
): WorksPhysicalFitReceipt {
  const collision = collisionObserved(snapshot)
  const overflow = (
    snapshot.gridScrollBlockPx
    > snapshot.gridClientBlockPx + WORKS_PHYSICAL_STABILITY_EPSILON_PX
  )

  return receiptFromSnapshot(
    snapshot,
    'measuring-natural',
    false,
    false,
    overflow,
    collision,
  )
}

function comparableMeasurementValues(
  snapshot: WorksPhysicalMeasurementSnapshot,
): readonly number[] {
  return Object.freeze([
    snapshot.viewportBlockPx,
    snapshot.siteHeaderBlockPx,
    snapshot.mainAvailableBlockPx,
    snapshot.pageClientBlockPx,
    snapshot.pageScrollBlockPx,
    snapshot.headerBlockPx,
    snapshot.queryBlockPx,
    snapshot.summaryBlockPx,
    snapshot.gridClientBlockPx,
    snapshot.gridScrollBlockPx,
    snapshot.paginationBlockPx,
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
  const collision = collisionObserved(snapshot)
  const gridOverflow = (
    snapshot.gridScrollBlockPx
    > snapshot.gridClientBlockPx + WORKS_PHYSICAL_STABILITY_EPSILON_PX
  )
  const requiredBlockPx = snapshot.pageScrollBlockPx
  const admitted = (
    !gridOverflow
    && !collision
    && requiredBlockPx + WORKS_PHYSICAL_FIT_SAFETY_PX
      <= snapshot.mainAvailableBlockPx
  )

  return receiptFromSnapshot(
    snapshot,
    admitted ? 'admitted-locked' : 'rejected-flow',
    admitted,
    false,
    gridOverflow || requiredBlockPx > snapshot.mainAvailableBlockPx,
    collision,
  )
}

export function verifyWorksLockedPhysicalCommit(
  snapshot: WorksPhysicalMeasurementSnapshot,
): WorksPhysicalFitReceipt {
  const collision = collisionObserved(snapshot)
  const pageOverflow = (
    snapshot.pageScrollBlockPx
    > snapshot.mainAvailableBlockPx + WORKS_PHYSICAL_STABILITY_EPSILON_PX
  )
  const gridOverflow = (
    snapshot.gridScrollBlockPx
    > snapshot.gridClientBlockPx + WORKS_PHYSICAL_STABILITY_EPSILON_PX
  )
  const admitted = !pageOverflow && !gridOverflow && !collision

  return receiptFromSnapshot(
    snapshot,
    admitted ? 'admitted-locked' : 'revoked-flow',
    admitted,
    admitted,
    pageOverflow || gridOverflow,
    collision,
  )
}
