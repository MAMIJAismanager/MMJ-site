import type {
  ResponsiveImageRenderOptions,
} from '../types/responsive-image'

export const MM_GLOBAL_AUDIO_ARTWORK_SIZES =
  '(min-width: 48rem) 5rem, 4rem'

export function createGlobalAudioArtworkOptions(): ResponsiveImageRenderOptions {
  return Object.freeze({
    sizes: MM_GLOBAL_AUDIO_ARTWORK_SIZES,
    accessibility: Object.freeze({ mode: 'decorative' as const }),
    loading: 'lazy' as const,
    fetchPriority: 'auto' as const,
    fit: 'contain' as const,
  })
}
