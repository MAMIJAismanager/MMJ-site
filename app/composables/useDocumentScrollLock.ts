import {
  readonly,
  ref,
} from 'vue'

export type DocumentScrollLockOwner =
  | 'none'
  | 'site-menu'

interface DocumentScrollLockSnapshot {
  readonly scrollX: number
  readonly scrollY: number
  readonly htmlOverflow: string
  readonly bodyPosition: string
  readonly bodyInsetBlockStart: string
  readonly bodyInsetInlineStart: string
  readonly bodyWidth: string
}

let activeOwner: DocumentScrollLockOwner = 'none'
let activeSnapshot: DocumentScrollLockSnapshot | null = null

export function useDocumentScrollLock() {
  const locked = ref(false)
  const owner = ref<DocumentScrollLockOwner>('none')

  function syncLocalState(): void {
    locked.value = activeOwner !== 'none'
    owner.value = activeOwner
  }

  function lock(requestedOwner: Exclude<DocumentScrollLockOwner, 'none'>): boolean {
    if (!import.meta.client) return false

    if (activeOwner !== 'none') {
      syncLocalState()
      return activeOwner === requestedOwner
    }

    const html = document.documentElement
    const body = document.body

    activeSnapshot = {
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      htmlOverflow: html.style.overflow,
      bodyPosition: body.style.position,
      bodyInsetBlockStart: body.style.insetBlockStart,
      bodyInsetInlineStart: body.style.insetInlineStart,
      bodyWidth: body.style.width,
    }

    activeOwner = requestedOwner
    html.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.insetBlockStart = `-${activeSnapshot.scrollY}px`
    body.style.insetInlineStart = '0'
    body.style.width = '100%'

    syncLocalState()
    return true
  }

  function unlock(requestedOwner: Exclude<DocumentScrollLockOwner, 'none'>): boolean {
    if (!import.meta.client) return false
    if (activeOwner !== requestedOwner || activeSnapshot === null) {
      syncLocalState()
      return false
    }

    const snapshot = activeSnapshot
    const html = document.documentElement
    const body = document.body

    html.style.overflow = snapshot.htmlOverflow
    body.style.position = snapshot.bodyPosition
    body.style.insetBlockStart = snapshot.bodyInsetBlockStart
    body.style.insetInlineStart = snapshot.bodyInsetInlineStart
    body.style.width = snapshot.bodyWidth

    activeOwner = 'none'
    activeSnapshot = null
    syncLocalState()

    requestAnimationFrame(() => {
      window.scrollTo(snapshot.scrollX, snapshot.scrollY)
    })

    return true
  }

  function forceRelease(requestedOwner: Exclude<DocumentScrollLockOwner, 'none'>): boolean {
    return unlock(requestedOwner)
  }

  syncLocalState()

  return {
    locked: readonly(locked),
    owner: readonly(owner),
    lock,
    unlock,
    forceRelease,
  }
}
