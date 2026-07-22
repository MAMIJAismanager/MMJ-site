import {
  computed,
  ref,
} from 'vue'

import {
  applyCommissionSwipeEdgeResistance,
  createIdleCommissionSwipeState,
  decideCommissionSwipe,
  resolveCommissionSwipeAxis,
} from '~/utils/commission-swipe-gesture'

import type {
  CSSProperties,
} from 'vue'
import type {
  CommissionSwipeDirection,
  CommissionSwipeGestureState,
} from '~/utils/commission-swipe-gesture'

interface UseCommissionSwipeDeckOptions {
  readonly getPanelElement: () => HTMLElement | null
  readonly canMove: (direction: CommissionSwipeDirection) => boolean
  readonly move: (direction: CommissionSwipeDirection) => Promise<void>
}

export function useCommissionSwipeDeck(
  options: UseCommissionSwipeDeckOptions,
) {
  const gesture = ref<CommissionSwipeGestureState>(
    createIdleCommissionSwipeState(),
  )
  const dragOffsetPx = ref(0)
  const transitionBusy = ref(false)

  const panelStyle = computed<CSSProperties>(() => ({
    transform: `translate3d(${dragOffsetPx.value}px, 0, 0)`,
  }))

  function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  function resetGesture(): void {
    gesture.value = createIdleCommissionSwipeState()
    dragOffsetPx.value = 0
  }

  async function animatePanel(
    keyframes: Keyframe[],
    duration: number,
  ): Promise<void> {
    const panel = options.getPanelElement()
    if (
      panel === null
      || typeof panel.animate !== 'function'
      || prefersReducedMotion()
    ) {
      return
    }

    const animation = panel.animate(keyframes, {
      duration,
      easing: 'cubic-bezier(0.2, 0, 0, 1)',
      fill: 'both',
    })
    try {
      await animation.finished
    } catch {
      // A newer navigation request can replace this animation.
    } finally {
      animation.cancel()
    }
  }

  async function runCommittedMove(
    direction: CommissionSwipeDirection,
    startOffset: number,
  ): Promise<void> {
    if (transitionBusy.value || !options.canMove(direction)) return
    transitionBusy.value = true

    try {
      const panel = options.getPanelElement()
      const width = panel?.getBoundingClientRect().width ?? 320
      const exitX = direction === 'next'
        ? -Math.min(width * 0.32, 180)
        : Math.min(width * 0.32, 180)

      await animatePanel(
        [
          {
            transform: `translate3d(${startOffset}px, 0, 0)`,
            opacity: 1,
          },
          {
            transform: `translate3d(${exitX}px, 0, 0)`,
            opacity: 0.38,
          },
        ],
        145,
      )

      dragOffsetPx.value = 0
      await options.move(direction)

      const enterX = direction === 'next'
        ? Math.min(width * 0.18, 96)
        : -Math.min(width * 0.18, 96)
      await animatePanel(
        [
          {
            transform: `translate3d(${enterX}px, 0, 0)`,
            opacity: 0.55,
          },
          {
            transform: 'translate3d(0, 0, 0)',
            opacity: 1,
          },
        ],
        220,
      )
    } finally {
      resetGesture()
      transitionBusy.value = false
    }
  }

  function handlePointerDown(event: PointerEvent): void {
    if (!event.isPrimary || transitionBusy.value) return
    const target = event.currentTarget
    if (!(target instanceof HTMLElement)) return

    target.setPointerCapture(event.pointerId)
    gesture.value = Object.freeze({
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      startedAt: performance.now(),
      axis: 'pending',
    })
  }

  function handlePointerMove(event: PointerEvent): void {
    const state = gesture.value
    if (state.pointerId !== event.pointerId || transitionBusy.value) return

    const deltaX = event.clientX - state.startX
    const deltaY = event.clientY - state.startY
    const axis = state.axis === 'pending'
      ? resolveCommissionSwipeAxis(deltaX, deltaY)
      : state.axis

    gesture.value = Object.freeze({
      ...state,
      currentX: event.clientX,
      currentY: event.clientY,
      axis,
    })

    if (axis !== 'horizontal') return
    if (event.cancelable) event.preventDefault()

    const direction: CommissionSwipeDirection = deltaX < 0
      ? 'next'
      : 'previous'
    dragOffsetPx.value = applyCommissionSwipeEdgeResistance(
      deltaX,
      options.canMove(direction),
    )
  }

  async function settleGesture(event: PointerEvent): Promise<void> {
    const state = gesture.value
    if (state.pointerId !== event.pointerId || transitionBusy.value) return

    const target = event.currentTarget
    if (
      target instanceof HTMLElement
      && target.hasPointerCapture(event.pointerId)
    ) {
      target.releasePointerCapture(event.pointerId)
    }

    const decision = decideCommissionSwipe(state, performance.now())
    const canCommit = decision.commits && options.canMove(decision.direction)

    if (canCommit) {
      await runCommittedMove(decision.direction, dragOffsetPx.value)
      return
    }

    transitionBusy.value = true
    const from = dragOffsetPx.value
    await animatePanel(
      [
        { transform: `translate3d(${from}px, 0, 0)` },
        { transform: 'translate3d(0, 0, 0)' },
      ],
      170,
    )
    resetGesture()
    transitionBusy.value = false
  }

  function handlePointerUp(event: PointerEvent): void {
    void settleGesture(event)
  }

  function handlePointerCancel(event: PointerEvent): void {
    if (gesture.value.pointerId !== event.pointerId) return
    resetGesture()
    transitionBusy.value = false
  }

  async function runProgrammaticTransition(
    direction: CommissionSwipeDirection,
  ): Promise<void> {
    await runCommittedMove(direction, 0)
  }

  return {
    panelStyle,
    transitionBusy,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    runProgrammaticTransition,
  }
}
