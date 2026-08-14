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
    const visualViewport = window.visualViewport
    viewport.value = Object.freeze({
      width: Math.max(0, Math.round(
        visualViewport?.width ?? window.innerWidth,
      )),
      height: Math.max(0, Math.round(
        visualViewport?.height ?? window.innerHeight,
      )),
    })
  }

  const scheduleObservation = (): void => {
    if (frameHandle !== null) return
    frameHandle = window.requestAnimationFrame(observeViewport)
  }

  onMounted(() => {
    observeViewport()
    window.addEventListener('resize', scheduleObservation, { passive: true })
    window.visualViewport?.addEventListener(
      'resize',
      scheduleObservation,
      { passive: true },
    )
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', scheduleObservation)
    window.visualViewport?.removeEventListener(
      'resize',
      scheduleObservation,
    )
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

  const style = computed<CSSProperties>(() => {
    const current = profile.value
    const output: CSSProperties = {
      '--mm-work-detail-title-size': `${current.titlePx}px`,
      '--mm-work-detail-section-title-size': `${current.sectionTitlePx}px`,
      '--mm-work-detail-core-gap': `${current.compositionGapPx}px`,
      '--mm-work-detail-section-gap': `${current.sectionGapPx}px`,
      '--mm-work-detail-content-max': `${current.contentMaxPx}px`,
      '--mm-work-detail-media-max-inline': `${current.mediaMaxInlinePx}px`,
      '--mm-work-detail-media-max-block': `${current.mediaMaxBlockPx}px`,
      '--mm-work-detail-core-padding-block': `${current.corePaddingBlockPx}px`,
    }

    if (
      current.composition === 'split'
      && current.copyColumnPx !== null
      && current.copyColumnPx > 0
    ) {
      output['--mm-work-detail-copy-column'] =
        `${current.copyColumnPx}px`
    }

    return Object.freeze(output)
  })

  return Object.freeze({
    profile,
    style,
  })
}
