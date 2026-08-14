export interface WorksViewportFrameElements {
  readonly mainElement: HTMLElement
  readonly siteHeaderElement: HTMLElement
}

export interface WorksViewportFrameMetrics {
  readonly viewportBlockPx: number
  readonly visualViewportInlinePx: number
  readonly visualViewportBlockPx: number
  readonly visualViewportTopPx: number
  readonly visualViewportBottomPx: number
  readonly siteHeaderBlockPx: number
  readonly mainAvailableBlockPx: number
  readonly mainClientBlockPx: number
  readonly mainScrollBlockPx: number
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

  const visualViewport = window.visualViewport
  const visualViewportInlinePx = Math.max(
    0,
    visualViewport?.width ?? window.innerWidth,
  )
  const visualViewportBlockPx = Math.max(
    0,
    visualViewport?.height ?? window.innerHeight,
  )
  const visualViewportTopPx = Math.max(
    0,
    visualViewport?.offsetTop ?? 0,
  )
  const visualViewportBottomPx = (
    visualViewportTopPx + visualViewportBlockPx
  )
  const siteHeaderBlockPx = Math.max(
    0,
    frame.siteHeaderElement.getBoundingClientRect().height,
  )

  return Object.freeze({
    viewportBlockPx: visualViewportBlockPx,
    visualViewportInlinePx,
    visualViewportBlockPx,
    visualViewportTopPx,
    visualViewportBottomPx,
    siteHeaderBlockPx,
    mainAvailableBlockPx: Math.max(
      0,
      visualViewportBlockPx - siteHeaderBlockPx,
    ),
    mainClientBlockPx: Math.max(0, frame.mainElement.clientHeight),
    mainScrollBlockPx: Math.max(0, frame.mainElement.scrollHeight),
  })
}
