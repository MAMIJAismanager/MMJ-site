export interface ShowcaseNavigationEntry {
  readonly id: string
}

export type ShowcaseNavigationDirection =
  | 'previous'
  | 'next'

export interface ShowcaseDragDecisionInput {
  readonly deltaX: number
  readonly deltaY: number
}

export const SHOWCASE_DRAG_COMMIT_THRESHOLD_PX = 56
export const SHOWCASE_DRAG_HORIZONTAL_RATIO = 1.15

export function reconcileShowcaseActiveId(
  projects: readonly ShowcaseNavigationEntry[],
  currentId: string | null,
): string | null {
  if (projects.length === 0) return null

  if (
    currentId !== null
    && projects.some(project => project.id === currentId)
  ) {
    return currentId
  }

  return projects[0]?.id ?? null
}

export function findAdjacentShowcaseId(
  projects: readonly ShowcaseNavigationEntry[],
  currentId: string | null,
  direction: ShowcaseNavigationDirection,
): string | null {
  if (currentId === null) return null

  const currentIndex = projects.findIndex(
    project => project.id === currentId,
  )
  if (currentIndex < 0) return null

  const targetIndex = direction === 'previous'
    ? currentIndex - 1
    : currentIndex + 1

  return projects[targetIndex]?.id ?? null
}

export function resolveShowcaseDirection(
  projects: readonly ShowcaseNavigationEntry[],
  currentId: string | null,
  targetId: string,
): ShowcaseNavigationDirection | null {
  if (currentId === null) return null

  const currentIndex = projects.findIndex(
    project => project.id === currentId,
  )
  const targetIndex = projects.findIndex(
    project => project.id === targetId,
  )

  if (
    currentIndex < 0
    || targetIndex < 0
    || currentIndex === targetIndex
  ) {
    return null
  }

  return targetIndex < currentIndex
    ? 'previous'
    : 'next'
}

export function resolveShowcaseDragDirection(
  input: ShowcaseDragDecisionInput,
): ShowcaseNavigationDirection | null {
  const horizontalDistance = Math.abs(input.deltaX)
  const verticalDistance = Math.abs(input.deltaY)

  if (
    horizontalDistance
    < SHOWCASE_DRAG_COMMIT_THRESHOLD_PX
  ) {
    return null
  }

  if (
    horizontalDistance
    <= verticalDistance * SHOWCASE_DRAG_HORIZONTAL_RATIO
  ) {
    return null
  }

  return input.deltaX > 0
    ? 'previous'
    : 'next'
}
