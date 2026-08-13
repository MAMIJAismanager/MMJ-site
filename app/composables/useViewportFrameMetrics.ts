export interface WorksViewportFrameElements {
  readonly mainElement: HTMLElement
  readonly siteHeaderElement: HTMLElement
}

export interface WorksViewportFrameMetrics {
  readonly viewportBlockPx: number
  readonly siteHeaderBlockPx: number
  readonly mainAvailableBlockPx: number
}

export function resolveWorksViewportFrameElements(
  pageElement: HTMLElement,
): WorksViewportFrameElements | null {
  const mainElement = pageElement.parentElement
  if (!(mainElement instanceof HTMLElement)) return null

  const siteHeaderElement = mainElement.previousElementSibling
  if (!(siteHeaderElement instanceof HTMLElement)) return null
  if (!siteHeaderElement.classList.contains('mm-site-header')) return null

  return Object.freeze({
    mainElement,
    siteHeaderElement,
  })
}

export function readWorksViewportFrameMetrics(
  pageElement: HTMLElement,
): WorksViewportFrameMetrics | null {
  const frame = resolveWorksViewportFrameElements(pageElement)
  if (frame === null) return null

  const viewportBlockPx = Math.max(0, window.innerHeight)
  const siteHeaderBlockPx = Math.max(
    0,
    frame.siteHeaderElement.getBoundingClientRect().height,
  )

  return Object.freeze({
    viewportBlockPx,
    siteHeaderBlockPx,
    mainAvailableBlockPx: Math.max(
      0,
      viewportBlockPx - siteHeaderBlockPx,
    ),
  })
}
