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

import type {
  WorksViewportSnapshot,
} from '~/works/works-layout-profile'

let observerConsumers = 0
let resizeFrame: number | null = null
let publishViewport: (() => void) | null = null

function readViewport(): WorksViewportSnapshot {
  return Object.freeze({
    width: Math.max(1, Math.round(window.innerWidth)),
    height: Math.max(1, Math.round(window.innerHeight)),
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
}

function releaseViewportObserver(): void {
  observerConsumers = Math.max(0, observerConsumers - 1)
  if (observerConsumers !== 0) return

  window.removeEventListener('resize', scheduleViewportPublish)
  if (resizeFrame !== null) {
    window.cancelAnimationFrame(resizeFrame)
    resizeFrame = null
  }
  publishViewport = null
}

export function useWorksLayoutProfile() {
  const viewport = useState<WorksViewportSnapshot | null>(
    'mmj-works-layout-viewport-r2',
    () => null,
  )

  const profile = computed(() => (
    viewport.value === null
      ? WORKS_PENDING_LAYOUT_PROFILE
      : resolveWorksLayoutProfile(viewport.value)
  ))

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
    })
  })

  onMounted(() => {
    retainViewportObserver(() => {
      viewport.value = readViewport()
    })
  })

  onBeforeUnmount(() => {
    releaseViewportObserver()
  })

  return {
    viewport,
    profile,
    ready,
    style,
  }
}
