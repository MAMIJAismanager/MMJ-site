import {
  computed,
  onBeforeUnmount,
  onMounted,
} from 'vue'

import {
  useState,
} from '#imports'

import {
  WORKS_PENDING_LAYOUT_PROFILE,
  resolveWorksLayoutProfile,
} from '~/works/works-layout-profile'
import {
  WORKS_PHYSICAL_FIT_ACTIVE_KEY_STATE_KEY,
  WORKS_PHYSICAL_FIT_STATE_KEY,
  createInitialWorksPhysicalFitReceipt,
} from '~/works/works-physical-fit'
import {
  WORKS_REFERENCE_FIT_STATE_KEY,
  createInitialWorksReferenceFitSolution,
  isHardWorksReferenceViewport,
} from '~/works/works-reference-fit-solver'

import type {
  WorksViewportSnapshot,
} from '~/works/works-layout-profile'
import type {
  WorksPhysicalFitReceipt,
} from '~/works/works-physical-fit'
import type {
  WorksReferenceFitSolution,
} from '~/works/works-reference-fit-solver'

const WORKS_VIEWPORT_STATE_KEY = 'mmj-works-layout-viewport-r2'
const WORKS_VIEWPORT_REVISION_STATE_KEY = 'mmj-works-layout-viewport-revision-r2'

let observerConsumers = 0
let resizeFrame: number | null = null
let publishViewport: (() => void) | null = null

function readViewport(): WorksViewportSnapshot {
  const visualViewport = window.visualViewport
  const visualWidth = Math.max(
    1,
    visualViewport?.width ?? window.innerWidth,
  )
  const visualHeight = Math.max(
    1,
    visualViewport?.height ?? window.innerHeight,
  )

  return Object.freeze({
    width: Math.max(1, Math.round(visualWidth)),
    height: Math.max(1, Math.round(visualHeight)),
    layoutWidth: Math.max(1, Math.round(window.innerWidth)),
    layoutHeight: Math.max(1, Math.round(window.innerHeight)),
    visualOffsetTop: Math.max(0, visualViewport?.offsetTop ?? 0),
    visualOffsetLeft: Math.max(0, visualViewport?.offsetLeft ?? 0),
  })
}

function scheduleViewportPublish(): void {
  if (resizeFrame !== null) return

  resizeFrame = window.requestAnimationFrame(() => {
    resizeFrame = null
    publishViewport?.()
  })
}

function retainViewportObserver(publish: () => void): void {
  observerConsumers += 1
  if (observerConsumers !== 1) return

  publishViewport = publish
  publishViewport()
  window.addEventListener('resize', scheduleViewportPublish, { passive: true })
  window.visualViewport?.addEventListener(
    'resize',
    scheduleViewportPublish,
    { passive: true },
  )
}

function releaseViewportObserver(): void {
  observerConsumers = Math.max(0, observerConsumers - 1)
  if (observerConsumers !== 0) return

  window.removeEventListener('resize', scheduleViewportPublish)
  window.visualViewport?.removeEventListener(
    'resize',
    scheduleViewportPublish,
  )
  if (resizeFrame !== null) {
    window.cancelAnimationFrame(resizeFrame)
    resizeFrame = null
  }
  publishViewport = null
}

export function useWorksLayoutProfile() {
  const viewport = useState<WorksViewportSnapshot | null>(
    WORKS_VIEWPORT_STATE_KEY,
    () => null,
  )
  const viewportRevision = useState<number>(
    WORKS_VIEWPORT_REVISION_STATE_KEY,
    () => 0,
  )
  const physicalFit = useState<WorksPhysicalFitReceipt>(
    WORKS_PHYSICAL_FIT_STATE_KEY,
    () => createInitialWorksPhysicalFitReceipt(),
  )
  const activePhysicalFitKey = useState<string | null>(
    WORKS_PHYSICAL_FIT_ACTIVE_KEY_STATE_KEY,
    () => null,
  )
  const referenceFit = useState<WorksReferenceFitSolution>(
    WORKS_REFERENCE_FIT_STATE_KEY,
    () => createInitialWorksReferenceFitSolution(),
  )

  const candidate = computed(() => (
    viewport.value === null
      ? WORKS_PENDING_LAYOUT_PROFILE
      : resolveWorksLayoutProfile(
          viewport.value,
          null,
          referenceFit.value,
        )
  ))

  const profile = computed(() => {
    if (viewport.value === null) return WORKS_PENDING_LAYOUT_PROFILE

    const admittedPhysicalFit = (
      physicalFit.value.fitKey !== null
      && physicalFit.value.fitKey === activePhysicalFitKey.value
    )
      ? physicalFit.value
      : null

    return resolveWorksLayoutProfile(
      viewport.value,
      admittedPhysicalFit,
      referenceFit.value,
    )
  })

  const ready = computed(() => viewport.value !== null)

  const style = computed<Readonly<Record<string, string>>>(() => {
    const tokens = profile.value.tokens
    return Object.freeze({
      '--mm-works-content-max': `${tokens.contentMaxRem}rem`,
      '--mm-works-page-padding-block': `${tokens.pagePaddingBlockRem}rem`,
      '--mm-works-page-gap': `${tokens.pageGapRem}rem`,
      '--mm-works-header-gap': `${tokens.headerGapRem}rem`,
      '--mm-works-title-size': `${tokens.titleRem}rem`,
      '--mm-works-query-gap': `${tokens.queryGapRem}rem`,
      '--mm-works-query-padding': `${tokens.queryPaddingRem}rem`,
      '--mm-works-query-control-height': `${tokens.queryControlHeightRem}rem`,
      '--mm-works-grid-gap': `${tokens.gridGapRem}rem`,
      '--mm-works-card-padding': `${tokens.cardPaddingRem}rem`,
      '--mm-works-card-title-size': `${tokens.cardTitleRem}rem`,
      '--mm-works-fit-available-block': `${profile.value.viewportFit.availableBlockPx}px`,
      '--mm-works-fit-required-block': `${profile.value.viewportFit.requiredBlockPx}px`,
      '--mm-works-pagination-reserved-block': `${referenceFit.value.paginationReservedBlockPx}px`,
      '--mm-works-reference-fit-pass': `${referenceFit.value.pass}`,
      '--mm-works-reference-fit-content-inline': `${referenceFit.value.contentInlinePx}px`,
      '--mm-works-reference-fit-card-inline': `${referenceFit.value.cardInlinePx}px`,
    })
  })

  onMounted(() => {
    retainViewportObserver(() => {
      const next = readViewport()
      const previous = viewport.value
      if (
        previous !== null
        && previous.width === next.width
        && previous.height === next.height
        && previous.layoutWidth === next.layoutWidth
        && previous.layoutHeight === next.layoutHeight
        && previous.visualOffsetTop === next.visualOffsetTop
        && previous.visualOffsetLeft === next.visualOffsetLeft
      ) {
        return
      }

      viewport.value = next
      viewportRevision.value += 1
      activePhysicalFitKey.value = null
      physicalFit.value = createInitialWorksPhysicalFitReceipt(
        null,
        viewportRevision.value,
        'unmeasured',
      )
      referenceFit.value = createInitialWorksReferenceFitSolution(
        viewportRevision.value,
        null,
        isHardWorksReferenceViewport(next),
      )
    })
  })

  onBeforeUnmount(() => {
    releaseViewportObserver()
  })

  return {
    viewport,
    viewportRevision,
    candidate,
    physicalFit,
    referenceFit,
    profile,
    ready,
    style,
  }
}
