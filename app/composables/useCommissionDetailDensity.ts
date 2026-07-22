import {
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue'

export type CommissionDetailDensity =
  | 'comfortable'
  | 'compact'

const COMPACT_HEIGHT_THRESHOLD_PX = 610

export function useCommissionDetailDensity() {
  const rootElement = ref<HTMLElement | null>(null)
  const density = ref<CommissionDetailDensity>('comfortable')
  let observer: ResizeObserver | null = null

  function syncDensity(height: number): void {
    density.value = height > 0 && height < COMPACT_HEIGHT_THRESHOLD_PX
      ? 'compact'
      : 'comfortable'
  }

  function setRootElement(element: HTMLElement | null): void {
    rootElement.value = element
    if (element !== null) syncDensity(element.getBoundingClientRect().height)
  }

  onMounted(() => {
    if (typeof ResizeObserver === 'undefined') return
    observer = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) syncDensity(entry.contentRect.height)
    })
    if (rootElement.value !== null) observer.observe(rootElement.value)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
  })

  return {
    density,
    setRootElement,
  }
}
