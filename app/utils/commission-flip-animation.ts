import type {
  CommissionServiceId,
} from '~~/shared/types/commission-guide'

export interface CommissionRectSnapshot {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

export type CommissionRectMap = ReadonlyMap<
  CommissionServiceId,
  CommissionRectSnapshot
>

export function captureCommissionRects(
  elements: ReadonlyMap<CommissionServiceId, HTMLElement>,
): CommissionRectMap {
  const output = new Map<CommissionServiceId, CommissionRectSnapshot>()

  for (const [serviceId, element] of elements) {
    const rect = element.getBoundingClientRect()
    output.set(serviceId, Object.freeze({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    }))
  }

  return output
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export async function animateCommissionFlip(
  before: CommissionRectMap,
  elements: ReadonlyMap<CommissionServiceId, HTMLElement>,
  duration = 320,
): Promise<void> {
  if (prefersReducedMotion()) return

  const animations: Animation[] = []

  for (const [serviceId, element] of elements) {
    const previous = before.get(serviceId)
    if (previous === undefined) continue

    const next = element.getBoundingClientRect()
    if (next.width <= 0 || next.height <= 0) continue

    const deltaX = previous.left - next.left
    const deltaY = previous.top - next.top
    const scaleX = previous.width / next.width
    const scaleY = previous.height / next.height

    const hasMeaningfulChange = (
      Math.abs(deltaX) > 0.5
      || Math.abs(deltaY) > 0.5
      || Math.abs(scaleX - 1) > 0.005
      || Math.abs(scaleY - 1) > 0.005
    )
    if (!hasMeaningfulChange) continue

    if (typeof element.animate !== 'function') continue

    animations.push(element.animate(
      [
        {
          transformOrigin: 'top left',
          transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`,
        },
        {
          transformOrigin: 'top left',
          transform: 'none',
        },
      ],
      {
        duration,
        easing: 'cubic-bezier(0.2, 0, 0, 1)',
        fill: 'both',
      },
    ))
  }

  await Promise.all(
    animations.map(async animation => {
      try {
        await animation.finished
      } catch {
        // A newer layout request may cancel an obsolete animation.
      } finally {
        animation.cancel()
      }
    }),
  )
}
