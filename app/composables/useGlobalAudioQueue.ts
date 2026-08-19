import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import {
  globalAudioQueueCandidates,
} from '~/data/global-audio-queue'
import {
  resolvePortfolioAudioTrack,
} from '~/data/portfolio-media-presentation'
import { usePlayerStore } from '~/stores/player'

import type { ProjectId } from '~~/shared/types/domain-identifiers'
import type { PlayerTrack } from '~~/shared/types/player-store'

export interface GlobalAudioQueueEntry {
  readonly projectId: ProjectId
  readonly projectTitle: string
  readonly order: number
  readonly track: PlayerTrack
}

export function useGlobalAudioQueue() {
  const player = usePlayerStore()
  const { currentTrack } = storeToRefs(player)
  const resolvedEntries: GlobalAudioQueueEntry[] = []

  for (const candidate of globalAudioQueueCandidates) {
    const track = resolvePortfolioAudioTrack(
      candidate.asset,
      candidate.projectId,
    )

    if (track === null) continue

    resolvedEntries.push(Object.freeze({
      projectId: candidate.projectId,
      projectTitle: candidate.projectTitle,
      order: candidate.order,
      track,
    }))
  }

  const queue: readonly GlobalAudioQueueEntry[] =
    Object.freeze(resolvedEntries)

  const currentQueueIndex = computed(() => {
    const current = currentTrack.value
    if (current === null) return -1

    return queue.findIndex(entry => (
      entry.track.trackId === current.trackId
      && entry.track.projectId === current.projectId
    ))
  })

  const currentQueueEntry = computed<GlobalAudioQueueEntry | null>(() => {
    const index = currentQueueIndex.value
    return index < 0 ? null : queue[index] ?? null
  })

  const previousEntry = computed<GlobalAudioQueueEntry | null>(() => {
    const index = currentQueueIndex.value
    return index > 0 ? queue[index - 1] ?? null : null
  })

  const nextEntry = computed<GlobalAudioQueueEntry | null>(() => {
    const index = currentQueueIndex.value
    return index >= 0 && index < queue.length - 1
      ? queue[index + 1] ?? null
      : null
  })

  function playEntry(entry: GlobalAudioQueueEntry | null): void {
    if (entry === null) return
    player.selectTrack(entry.track)
    player.requestPlay()
  }

  function playPrevious(): void {
    playEntry(previousEntry.value)
  }

  function playNext(): void {
    playEntry(nextEntry.value)
  }

  return {
    queue,
    currentQueueIndex,
    currentQueueEntry,
    previousEntry,
    nextEntry,
    playPrevious,
    playNext,
  }
}
