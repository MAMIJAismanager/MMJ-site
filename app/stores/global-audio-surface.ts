import { defineStore } from 'pinia'
import {
  createInitialGlobalAudioSurfaceState,
  reduceGlobalAudioSurfaceState,
} from '../utils/global-audio-surface-state'

import type {
  GlobalAudioSurfaceState,
  GlobalAudioSurfaceTransition,
} from '../utils/global-audio-surface-state'

function applyTransition(
  current: GlobalAudioSurfaceState,
  transition: GlobalAudioSurfaceTransition,
): GlobalAudioSurfaceState {
  return reduceGlobalAudioSurfaceState(current, transition)
}

export const useGlobalAudioSurfaceStore = defineStore(
  'global-audio-surface',
  {
    state: (): GlobalAudioSurfaceState => (
      createInitialGlobalAudioSurfaceState()
    ),

    getters: {
      initialized: state => state.initialization === 'initialized',
      expanded: state => state.mode === 'expanded',
      collapsed: state => state.mode === 'collapsed',
    },

    actions: {
      apply(transition: GlobalAudioSurfaceTransition): boolean {
        const previous = this.$state
        const next = applyTransition(previous, transition)
        if (next === previous) return false
        this.$state = next
        return true
      },

      initialize(mobile: boolean): boolean {
        return this.apply({
          kind: 'initialize',
          mobile,
        })
      },

      expand(): boolean {
        return this.apply({ kind: 'expand' })
      },

      collapse(): boolean {
        return this.apply({ kind: 'collapse' })
      },
    },
  },
)
