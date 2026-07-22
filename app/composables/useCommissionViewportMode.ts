import {
  onBeforeUnmount,
  onMounted,
  readonly,
  ref,
} from 'vue'

import type {
  CommissionViewportMode,
} from '~/utils/commission-layout-planner'

export const COMMISSION_DESKTOP_COMPOSITION_QUERY =
  '(min-width: 80rem) and (min-height: 54rem)'

export function useCommissionViewportMode() {
  const viewportMode = ref<CommissionViewportMode>('flow')
  let desktopMedia: MediaQueryList | null = null

  function syncViewportMode(
    media: MediaQueryList | MediaQueryListEvent,
  ): void {
    viewportMode.value = media.matches ? 'desktop' : 'flow'
  }

  onMounted(() => {
    desktopMedia = window.matchMedia(
      COMMISSION_DESKTOP_COMPOSITION_QUERY,
    )
    syncViewportMode(desktopMedia)
    desktopMedia.addEventListener('change', syncViewportMode)
  })

  onBeforeUnmount(() => {
    desktopMedia?.removeEventListener('change', syncViewportMode)
    desktopMedia = null
  })

  return {
    viewportMode: readonly(viewportMode),
  }
}
