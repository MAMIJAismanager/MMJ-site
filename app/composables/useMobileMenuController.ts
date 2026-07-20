import {
  computed,
  onBeforeUnmount,
  onMounted,
  readonly,
  ref,
} from 'vue'

import {
  MOBILE_MENU_SCROLL_IDLE_MS,
  hasActualScrollDelta,
  resolveMobileMenuTriggerVisibility,
} from '~/utils/mobile-menu-scroll-visibility'

import type {
  MobileMenuTriggerVisibility,
} from '~/utils/mobile-menu-scroll-visibility'

export type MobileMenuPhase =
  | 'closed'
  | 'opening'
  | 'open'
  | 'closing'

const MOBILE_VIEWPORT_QUERY = '(max-width: 47.999rem)'
const MENU_TRANSITION_MS = 200

export function useMobileMenuController() {
  const phase = ref<MobileMenuPhase>('closed')
  const isMobileViewport = ref(false)
  const triggerVisibility = ref<MobileMenuTriggerVisibility>('visible')

  let mediaQuery: MediaQueryList | null = null
  let scrollIdleTimer: ReturnType<typeof setTimeout> | null = null
  let phaseTimer: ReturnType<typeof setTimeout> | null = null
  let previousScrollY = 0

  const rendered = computed(() => phase.value !== 'closed')
  const active = computed(() => (
    phase.value === 'opening'
    || phase.value === 'open'
    || phase.value === 'closing'
  ))

  function clearScrollIdleTimer(): void {
    if (scrollIdleTimer === null) return
    clearTimeout(scrollIdleTimer)
    scrollIdleTimer = null
  }

  function clearPhaseTimer(): void {
    if (phaseTimer === null) return
    clearTimeout(phaseTimer)
    phaseTimer = null
  }

  function syncTriggerVisibility(scrolling = false): void {
    triggerVisibility.value = resolveMobileMenuTriggerVisibility(
      active.value,
      scrolling,
    )
  }

  function handleScroll(): void {
    if (!isMobileViewport.value || active.value) return

    const nextScrollY = window.scrollY
    if (!hasActualScrollDelta(previousScrollY, nextScrollY)) return
    previousScrollY = nextScrollY

    clearScrollIdleTimer()
    syncTriggerVisibility(true)
    scrollIdleTimer = setTimeout(() => {
      scrollIdleTimer = null
      syncTriggerVisibility(false)
    }, MOBILE_MENU_SCROLL_IDLE_MS)
  }

  function finishClosed(): void {
    clearPhaseTimer()
    phase.value = 'closed'
    syncTriggerVisibility(false)
  }

  function open(): void {
    if (!isMobileViewport.value || active.value) return

    clearPhaseTimer()
    clearScrollIdleTimer()
    phase.value = 'opening'
    syncTriggerVisibility(false)

    requestAnimationFrame(() => {
      if (phase.value === 'opening') phase.value = 'open'
    })
  }

  function close(immediate = false): void {
    if (phase.value === 'closed') return

    clearPhaseTimer()
    phase.value = 'closing'
    syncTriggerVisibility(false)

    if (immediate) {
      finishClosed()
      return
    }

    phaseTimer = setTimeout(finishClosed, MENU_TRANSITION_MS)
  }

  function toggle(): void {
    if (active.value) close()
    else open()
  }

  function handleViewportChange(event: MediaQueryListEvent | MediaQueryList): void {
    isMobileViewport.value = event.matches
    previousScrollY = window.scrollY

    if (!event.matches) close(true)
    else syncTriggerVisibility(false)
  }

  onMounted(() => {
    mediaQuery = window.matchMedia(MOBILE_VIEWPORT_QUERY)
    handleViewportChange(mediaQuery)
    mediaQuery.addEventListener('change', handleViewportChange)
    window.addEventListener('scroll', handleScroll, { passive: true })
  })

  onBeforeUnmount(() => {
    clearScrollIdleTimer()
    clearPhaseTimer()
    window.removeEventListener('scroll', handleScroll)
    mediaQuery?.removeEventListener('change', handleViewportChange)
    mediaQuery = null
  })

  return {
    phase: readonly(phase),
    rendered,
    active,
    isMobileViewport: readonly(isMobileViewport),
    triggerVisibility: readonly(triggerVisibility),
    open,
    close,
    toggle,
  }
}
