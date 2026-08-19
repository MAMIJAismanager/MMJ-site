import { onMounted } from 'vue'

import {
  useGlobalAudioSurfaceStore,
} from '~/stores/global-audio-surface'

export const GLOBAL_AUDIO_MOBILE_VIEWPORT_QUERY =
  '(max-width: 47.999rem)'

export function useGlobalAudioSurfaceInitializer(): void {
  const surface = useGlobalAudioSurfaceStore()

  onMounted(() => {
    if (surface.initialized) return

    surface.initialize(
      window.matchMedia(GLOBAL_AUDIO_MOBILE_VIEWPORT_QUERY).matches,
    )
  })
}
