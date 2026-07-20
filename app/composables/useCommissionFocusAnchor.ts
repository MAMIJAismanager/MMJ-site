import {
  nextTick,
  onBeforeUnmount,
} from 'vue'

import type {
  ComponentPublicInstance,
} from 'vue'
import type {
  CommissionServiceId,
} from '~~/shared/types/commission-guide'

function nextAnimationFrame(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => resolve())
  })
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useCommissionFocusAnchor() {
  const triggerElements = new Map<CommissionServiceId, HTMLButtonElement>()

  function setTriggerElement(
    serviceId: CommissionServiceId,
    element: Element | ComponentPublicInstance | null,
  ): void {
    if (
      typeof HTMLButtonElement !== 'undefined'
      && element instanceof HTMLButtonElement
    ) {
      triggerElements.set(serviceId, element)
      return
    }

    triggerElements.delete(serviceId)
  }

  function focusTrigger(serviceId: CommissionServiceId): void {
    triggerElements.get(serviceId)?.focus({ preventScroll: true })
  }

  async function alignServiceTrigger(
    serviceId: CommissionServiceId,
  ): Promise<void> {
    await nextTick()
    await nextAnimationFrame()
    await nextAnimationFrame()

    const trigger = triggerElements.get(serviceId)
    if (trigger === undefined) return

    const siteHeader = document.querySelector<HTMLElement>('.mm-site-header')
    const headerBottom = siteHeader?.getBoundingClientRect().bottom ?? 0
    const triggerTop = trigger.getBoundingClientRect().top
    const targetTop = window.scrollY + triggerTop - headerBottom - 12

    window.scrollTo({
      top: Math.max(0, targetTop),
      left: 0,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }

  onBeforeUnmount(() => {
    triggerElements.clear()
  })

  return {
    setTriggerElement,
    focusTrigger,
    alignServiceTrigger,
  }
}
