import {
  onBeforeUnmount,
  ref,
} from 'vue'

import {
  useRouter,
} from '#imports'

import {
  grantHiddenCategoryCapability,
} from '~/composables/useHiddenCategoryCapability'
import {
  BRAND_DOUBLE_CLICK_WINDOW_MS,
  BRAND_FEEDBACK_DURATION_MS,
  BRAND_HAPTIC_PATTERN_MS,
  didBrandPointerMoveBeyondThreshold,
  isBrandDoubleActivationMatch,
  type BrandEntrySurface,
} from '~/utils/brand-entry-policy'

import {
  HIDDEN_VOICE_SYNTHESIS_CATEGORY_ID,
} from '~~/shared/constants/portfolio-gateway-categories'

export { BRAND_DOUBLE_CLICK_WINDOW_MS } from '~/utils/brand-entry-policy'

export interface BrandEntryArbitratorOptions {
  readonly onBeforeNavigate?: (surface: BrandEntrySurface) => void
}

export function useBrandEntryArbitrator(
  options: BrandEntryArbitratorOptions = {},
) {
  const router = useRouter()
  const pendingSingleClick = ref(false)
  const feedbackSurface = ref<BrandEntrySurface | null>(null)

  let timer: ReturnType<typeof setTimeout> | null = null
  let feedbackTimer: ReturnType<typeof setTimeout> | null = null
  let pointerStart: Readonly<{ x: number; y: number }> | null = null
  let pointerMoved = false
  let lastPointerType: string | null = null
  let lastPointerSurface: BrandEntrySurface | null = null
  let pendingPointerType: string | null = null
  let pendingSurface: BrandEntrySurface | null = null
  let pointerActivationSerial = 0
  let consumedPointerActivationSerial = 0

  function clearTimer(): void {
    if (timer !== null) clearTimeout(timer)
    timer = null
    pendingSingleClick.value = false
    pendingPointerType = null
    pendingSurface = null
  }

  function clearFeedbackTimer(): void {
    if (feedbackTimer !== null) clearTimeout(feedbackTimer)
    feedbackTimer = null
  }

  function clearAllTimers(): void {
    clearTimer()
    clearFeedbackTimer()
    feedbackSurface.value = null
  }

  function onPointerDown(
    event: PointerEvent,
    surface: BrandEntrySurface,
  ): void {
    if (event.button !== 0) return
    pointerStart = { x: event.clientX, y: event.clientY }
    pointerMoved = false
    lastPointerType = event.pointerType
    lastPointerSurface = surface
    pointerActivationSerial += 1
  }

  function onPointerMove(event: PointerEvent): void {
    if (pointerStart === null) return
    if (
      didBrandPointerMoveBeyondThreshold(
        event.clientX - pointerStart.x,
        event.clientY - pointerStart.y,
      )
    ) {
      pointerMoved = true
    }
  }

  function onPointerUp(): void {
    pointerStart = null
  }

  function onPointerCancel(): void {
    pointerStart = null
    pointerMoved = true
    clearTimer()
  }

  function prefersReducedMotion(): boolean {
    if (!import.meta.client || typeof window.matchMedia !== 'function') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  function requestTouchHaptic(pointerType: string | null): void {
    if (
      pointerType !== 'touch'
      || prefersReducedMotion()
      || !import.meta.client
      || typeof navigator.vibrate !== 'function'
    ) {
      return
    }

    try {
      navigator.vibrate([...BRAND_HAPTIC_PATTERN_MS])
    } catch {
      // Haptic feedback is optional sensory output. Navigation authority is unchanged.
    }
  }

  async function openHome(surface: BrandEntrySurface): Promise<void> {
    options.onBeforeNavigate?.(surface)
    await router.push('/')
  }

  async function openHiddenCategory(surface: BrandEntrySurface): Promise<void> {
    options.onBeforeNavigate?.(surface)
    grantHiddenCategoryCapability()
    try {
      await router.push({
        path: '/works',
        query: {
          category: HIDDEN_VOICE_SYNTHESIS_CATEGORY_ID,
        },
      })
    } finally {
      feedbackSurface.value = null
      clearFeedbackTimer()
    }
  }

  function beginFeedback(
    surface: BrandEntrySurface,
    pointerType: string | null,
  ): void {
    clearTimer()
    clearFeedbackTimer()
    feedbackSurface.value = surface

    if (prefersReducedMotion()) {
      void openHiddenCategory(surface)
      return
    }

    requestTouchHaptic(pointerType)
    feedbackTimer = setTimeout(() => {
      feedbackTimer = null
      void openHiddenCategory(surface)
    }, BRAND_FEEDBACK_DURATION_MS)
  }

  function onClick(
    event: MouseEvent,
    surface: BrandEntrySurface,
  ): void {
    event.preventDefault()

    if (feedbackSurface.value !== null) return

    if (pointerMoved) {
      clearTimer()
      return
    }

    const hasFreshPointerActivation = (
      pointerActivationSerial > consumedPointerActivationSerial
    )
    const pointerType = hasFreshPointerActivation
      ? lastPointerType
      : 'keyboard'
    const activationSurface = hasFreshPointerActivation
      ? (lastPointerSurface ?? surface)
      : surface

    consumedPointerActivationSerial = pointerActivationSerial

    if (
      pendingSingleClick.value
      && isBrandDoubleActivationMatch(
        pendingPointerType,
        pointerType,
        pendingSurface,
        activationSurface,
      )
    ) {
      beginFeedback(activationSurface, pointerType)
      return
    }

    clearTimer()
    pendingSingleClick.value = true
    pendingPointerType = pointerType
    pendingSurface = activationSurface
    timer = setTimeout(() => {
      timer = null
      pendingSingleClick.value = false
      pendingPointerType = null
      pendingSurface = null
      void openHome(activationSurface)
    }, BRAND_DOUBLE_CLICK_WINDOW_MS)
  }

  onBeforeUnmount(clearAllTimers)

  return {
    pendingSingleClick,
    feedbackSurface,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onClick,
  }
}
