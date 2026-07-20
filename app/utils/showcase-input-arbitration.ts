import type {
  ShowcaseNavigationDirection,
} from '~/utils/project-showcase-navigation'

export type ShowcaseInputSource =
  | 'arrow'
  | 'drag'
  | 'keyboard'
  | 'category-selector'
  | 'restoration'

export type ShowcaseInputOwner =
  | 'none'
  | 'arrow'
  | 'drag'

export interface ShowcaseInputArbitrationState {
  owner: ShowcaseInputOwner
  generation: number
  categoryBlockedUntil: number
  lastArrowInputAt: number
}

export interface ShowcaseQueuedNavigation {
  readonly targetId: string
  readonly direction: ShowcaseNavigationDirection
  readonly focusSelector: boolean
  readonly durationMs: number | null
  readonly source: ShowcaseInputSource
  readonly priority: number
  readonly issuedAt: number
  readonly generation: number
  readonly sequence: number
}

export const SHOWCASE_NAVIGATION_QUEUE_LIMIT = 8

const SHOWCASE_NAVIGATION_PRIORITY: Readonly<
  Record<ShowcaseInputSource, number>
> = {
  arrow: 400,
  drag: 300,
  keyboard: 200,
  'category-selector': 100,
  restoration: 0,
}

export function resolveShowcaseNavigationPriority(
  source: ShowcaseInputSource,
): number {
  return SHOWCASE_NAVIGATION_PRIORITY[source]
}

export function hasQueuedShowcaseSource(
  queue: readonly ShowcaseQueuedNavigation[],
  source: ShowcaseInputSource,
): boolean {
  return queue.some(navigation => navigation.source === source)
}

export function sortShowcaseNavigationQueue(
  queue: readonly ShowcaseQueuedNavigation[],
): ShowcaseQueuedNavigation[] {
  return [...queue].sort((left, right) => (
    right.priority - left.priority
    || left.issuedAt - right.issuedAt
    || left.sequence - right.sequence
  ))
}

export function resolveShowcaseQueueTailTargetId(
  queue: readonly ShowcaseQueuedNavigation[],
  minimumPriority: number,
): string | null {
  const ordered = sortShowcaseNavigationQueue(
    queue.filter(navigation => navigation.priority >= minimumPriority),
  )
  return ordered.at(-1)?.targetId ?? null
}

export function enqueueShowcaseNavigation(
  queue: readonly ShowcaseQueuedNavigation[],
  navigation: ShowcaseQueuedNavigation,
): ShowcaseQueuedNavigation[] {
  let next = navigation.source === 'arrow'
    ? queue.filter(candidate => candidate.source !== 'category-selector')
    : [...queue]

  if (navigation.source === 'category-selector') {
    next = next.filter(candidate => candidate.source !== 'category-selector')
  }

  next.push(navigation)

  while (next.length > SHOWCASE_NAVIGATION_QUEUE_LIMIT) {
    const removalIndex = next.reduce((candidateIndex, candidate, index) => {
      const current = next[candidateIndex]
      if (!current) return index

      if (candidate.priority < current.priority) return index
      if (
        candidate.priority === current.priority
        && (
          candidate.issuedAt < current.issuedAt
          || (
            candidate.issuedAt === current.issuedAt
            && candidate.sequence < current.sequence
          )
        )
      ) {
        return index
      }

      return candidateIndex
    }, 0)

    next.splice(removalIndex, 1)
  }

  return next
}

export function dequeueShowcaseNavigation(
  queue: readonly ShowcaseQueuedNavigation[],
): Readonly<{
  navigation: ShowcaseQueuedNavigation | null
  queue: ShowcaseQueuedNavigation[]
}> {
  if (queue.length === 0) {
    return {
      navigation: null,
      queue: [],
    }
  }

  const ordered = sortShowcaseNavigationQueue(queue)
  const navigation = ordered.shift() ?? null

  return {
    navigation,
    queue: ordered,
  }
}

export function purgeQueuedCategoryNavigations(
  queue: readonly ShowcaseQueuedNavigation[],
): ShowcaseQueuedNavigation[] {
  return queue.filter(
    navigation => navigation.source !== 'category-selector',
  )
}
