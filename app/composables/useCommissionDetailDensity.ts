import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'

import {
  resolveCommissionDetailDensity,
} from '~/utils/commission-detail-density'

import type {
  Ref,
} from 'vue'
import type {
  CommissionDetailDensity,
} from '~/utils/commission-detail-density'

export interface UseCommissionDetailDensityOptions {
  readonly mode: Readonly<Ref<'desktop' | 'mobile'>>
}

export function useCommissionDetailDensity(
  options: UseCommissionDetailDensityOptions,
) {
  const rootElement = ref<HTMLElement | null>(null)
  const stageElement = ref<HTMLElement | null>(null)
  const density = ref<CommissionDetailDensity>('comfortable')
  const availableHeight = ref(0)
  const requiredHeight = ref(0)
  const overflowAmount = ref(0)
  const internalScrollFallback = ref(false)

  let observer: ResizeObserver | null = null
  let frameId: number | null = null
  let comfortableRequiredHeight = 0
  let mounted = false

  function resolveStageElement(
    element: HTMLElement | null,
  ): HTMLElement | null {
    if (element === null) return null
    return element.closest<HTMLElement>(
      '.mm-commission-service__panel-inner',
    ) ?? element.parentElement
  }

  function observeElements(): void {
    observer?.disconnect()
    if (observer === null) return

    if (stageElement.value !== null) {
      observer.observe(stageElement.value)
    }
    if (rootElement.value !== null) {
      observer.observe(rootElement.value)
    }
  }

  function setRootElement(element: HTMLElement | null): void {
    rootElement.value = element
    stageElement.value = resolveStageElement(element)
    if (mounted) {
      observeElements()
      scheduleMeasurement()
    }
  }

  function readPixelValue(value: string): number {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  function readVisibleChildHeight(element: HTMLElement): number {
    const style = getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden') return 0

    return Math.max(
      element.scrollHeight,
      Math.ceil(element.getBoundingClientRect().height),
    )
  }

  function readMatrixStackHeight(root: HTMLElement): number {
    const style = getComputedStyle(root)
    const children = Array.from(root.children)
      .filter((child): child is HTMLElement => child instanceof HTMLElement)
      .map(readVisibleChildHeight)
      .filter(height => height > 0)

    const rowGap = readPixelValue(style.rowGap)
    const padding = readPixelValue(style.paddingTop)
      + readPixelValue(style.paddingBottom)
    const gaps = Math.max(0, children.length - 1) * rowGap

    return Math.ceil(
      children.reduce((sum, height) => sum + height, 0)
      + gaps
      + padding,
    )
  }

  function readRequiredHeight(root: HTMLElement): number {
    if (root.dataset.mmCommissionPricingKind === 'matrix') {
      return readMatrixStackHeight(root)
    }

    return Math.ceil(root.scrollHeight)
  }

  async function measureAndResolve(): Promise<void> {
    const root = rootElement.value
    const stage = stageElement.value

    if (
      options.mode.value !== 'desktop'
      || root === null
      || stage === null
    ) {
      density.value = 'comfortable'
      availableHeight.value = 0
      requiredHeight.value = 0
      overflowAmount.value = 0
      internalScrollFallback.value = false
      comfortableRequiredHeight = 0
      return
    }

    const nextAvailableHeight = Math.max(
      0,
      Math.floor(stage.getBoundingClientRect().height),
    )
    const nextRequiredHeight = readRequiredHeight(root)

    availableHeight.value = nextAvailableHeight
    requiredHeight.value = nextRequiredHeight
    overflowAmount.value = Math.max(
      0,
      nextRequiredHeight - nextAvailableHeight,
    )

    if (density.value === 'comfortable') {
      comfortableRequiredHeight = Math.max(
        comfortableRequiredHeight,
        nextRequiredHeight,
      )
    }

    const nextDensity = resolveCommissionDetailDensity({
      availableHeight: nextAvailableHeight,
      requiredHeight: nextRequiredHeight,
      comfortableRequiredHeight:
        comfortableRequiredHeight || nextRequiredHeight,
      currentDensity: density.value,
    })

    if (nextDensity !== density.value) {
      density.value = nextDensity
      internalScrollFallback.value = false
      await nextTick()
      scheduleMeasurement()
      return
    }

    internalScrollFallback.value = (
      density.value === 'compact'
      && nextRequiredHeight > nextAvailableHeight + 1
    )

    if (
      import.meta.dev
      && internalScrollFallback.value
    ) {
      console.warn(
        'MMJ-UI28-R2-R3-R1: compact commission detail still overflows',
        {
          availableHeight: nextAvailableHeight,
          requiredHeight: nextRequiredHeight,
          overflowAmount: overflowAmount.value,
        },
      )
    }
  }

  function scheduleMeasurement(): void {
    if (typeof window === 'undefined') return
    if (frameId !== null) cancelAnimationFrame(frameId)
    frameId = requestAnimationFrame(() => {
      frameId = null
      void measureAndResolve()
    })
  }

  async function remeasure(): Promise<void> {
    await nextTick()
    scheduleMeasurement()
  }

  onMounted(() => {
    mounted = true
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        scheduleMeasurement()
      })
      observeElements()
    }

    scheduleMeasurement()

    if (typeof document !== 'undefined' && document.fonts) {
      void document.fonts.ready.then(() => {
        scheduleMeasurement()
      })
    }
  })

  watch(
    () => options.mode.value,
    () => {
      comfortableRequiredHeight = 0
      scheduleMeasurement()
    },
  )

  onBeforeUnmount(() => {
    mounted = false
    observer?.disconnect()
    observer = null
    if (frameId !== null) cancelAnimationFrame(frameId)
    frameId = null
  })

  return {
    density,
    availableHeight,
    requiredHeight,
    overflowAmount,
    internalScrollFallback,
    setRootElement,
    remeasure,
  }
}
