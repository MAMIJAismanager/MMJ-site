import {
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue'

import type {
  WorksViewportSnapshotR6,
} from '~/works/works-page-composition'

export function useWorksViewportSnapshot() {
  const viewport = ref<WorksViewportSnapshotR6 | null>(null)
  const inlineRevision = ref(0)
  const blockRevision = ref(0)
  let frameHandle: number | null = null

  function readViewport(): WorksViewportSnapshotR6 {
    const visualViewport = window.visualViewport
    return Object.freeze({
      width: Math.max(
        1,
        Math.round(visualViewport?.width ?? window.innerWidth),
      ),
      height: Math.max(
        1,
        Math.round(visualViewport?.height ?? window.innerHeight),
      ),
      layoutWidth: Math.max(1, Math.round(window.innerWidth)),
      layoutHeight: Math.max(1, Math.round(window.innerHeight)),
      visualOffsetTop: Math.max(0, visualViewport?.offsetTop ?? 0),
      visualOffsetLeft: Math.max(0, visualViewport?.offsetLeft ?? 0),
    })
  }

  function publish(): void {
    frameHandle = null
    const next = readViewport()
    const previous = viewport.value

    if (previous === null) {
      viewport.value = next
      inlineRevision.value += 1
      blockRevision.value += 1
      return
    }

    const inlineChanged = (
      previous.width !== next.width
      || previous.layoutWidth !== next.layoutWidth
      || previous.visualOffsetLeft !== next.visualOffsetLeft
    )
    const blockChanged = (
      previous.height !== next.height
      || previous.layoutHeight !== next.layoutHeight
      || previous.visualOffsetTop !== next.visualOffsetTop
    )

    if (!inlineChanged && !blockChanged) return

    viewport.value = next
    if (inlineChanged) inlineRevision.value += 1
    if (blockChanged) blockRevision.value += 1
  }

  function schedule(): void {
    if (frameHandle !== null) return
    frameHandle = window.requestAnimationFrame(publish)
  }

  onMounted(() => {
    publish()
    window.addEventListener('resize', schedule, { passive: true })
    window.visualViewport?.addEventListener('resize', schedule, { passive: true })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', schedule)
    window.visualViewport?.removeEventListener('resize', schedule)
    if (frameHandle !== null) {
      window.cancelAnimationFrame(frameHandle)
      frameHandle = null
    }
  })

  return Object.freeze({
    viewport,
    inlineRevision,
    blockRevision,
  })
}
