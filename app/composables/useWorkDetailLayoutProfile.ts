import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  type ComputedRef,
  type CSSProperties,
} from 'vue'

import {
  resolveWorkDetailLayoutProfile,
  type WorkDetailLayoutProfile,
  type WorkDetailPrimaryMediaGeometry,
  type WorkDetailViewportSnapshot,
} from '~/work-detail/work-detail-layout-profile'

export interface UseWorkDetailLayoutProfileOptions {
  readonly hasPrimaryMedia: boolean
  readonly primaryMedia: WorkDetailPrimaryMediaGeometry | null
}

export interface UseWorkDetailLayoutProfileResult {
  readonly profile: ComputedRef<WorkDetailLayoutProfile>
  readonly style: ComputedRef<CSSProperties>
}

const INITIAL_VIEWPORT: WorkDetailViewportSnapshot = Object.freeze({
  width: 0,
  height: 0,
})

export function useWorkDetailLayoutProfile(
  options: UseWorkDetailLayoutProfileOptions,
): UseWorkDetailLayoutProfileResult {
  const viewport = ref<WorkDetailViewportSnapshot>(INITIAL_VIEWPORT)
  let frameHandle: number | null = null

  const observeViewport = (): void => {
    frameHandle = null
    viewport.value = Object.freeze({
      width: Math.max(0, Math.round(window.innerWidth)),
      height: Math.max(0, Math.round(window.innerHeight)),
    })
  }

  const scheduleObservation = (): void => {
    if (frameHandle !== null) return
    frameHandle = window.requestAnimationFrame(observeViewport)
  }

  onMounted(() => {
    observeViewport()
    window.addEventListener('resize', scheduleObservation, { passive: true })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', scheduleObservation)
    if (frameHandle !== null) {
      window.cancelAnimationFrame(frameHandle)
      frameHandle = null
    }
  })

  const profile = computed(() => resolveWorkDetailLayoutProfile({
    viewport: viewport.value,
    hasPrimaryMedia: options.hasPrimaryMedia,
    primaryMedia: options.primaryMedia,
  }))

  const style = computed<CSSProperties>(() => ({
    '--mm-work-detail-title-size': `${profile.value.titlePx}px`,
    '--mm-work-detail-section-title-size': `${profile.value.sectionTitlePx}px`,
    '--mm-work-detail-copy-column': `${profile.value.copyColumnPx}px`,
    '--mm-work-detail-core-gap': `${profile.value.compositionGapPx}px`,
    '--mm-work-detail-section-gap': `${profile.value.sectionGapPx}px`,
    '--mm-work-detail-content-max': `${profile.value.contentMaxPx}px`,
    '--mm-work-detail-media-max-inline': `${profile.value.mediaMaxInlinePx}px`,
    '--mm-work-detail-media-max-block': `${profile.value.mediaMaxBlockPx}px`,
    '--mm-work-detail-core-padding-block': `${profile.value.corePaddingBlockPx}px`,
  }))

  return Object.freeze({
    profile,
    style,
  })
}
