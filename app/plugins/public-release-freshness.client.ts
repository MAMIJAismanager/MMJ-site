import { defineNuxtPlugin } from '#app'
import { useRuntimeConfig } from '#imports'

import {
  MMJ_PUBLIC_RELEASE_CHECK_LEASE_MS,
  MMJ_PUBLIC_RELEASE_PROBE_QUERY_KEY,
  parsePublicReleaseManifest,
  publicReleaseRebootstrapKey,
  resolvePublicReleaseFreshnessDecision,
  stripPublicReleaseQuery,
  withPublicReleaseRevision,
  isCanonicalPublicReleaseRevision,
} from '~~/shared/release/public-release-contract'

let lastCheckAt = 0
let inFlight: Promise<void> | null = null

function nowMs(): number {
  return Date.now()
}

function shouldCheck(force: boolean): boolean {
  return force || nowMs() - lastCheckAt >= MMJ_PUBLIC_RELEASE_CHECK_LEASE_MS
}

async function fetchRemoteRevision(): Promise<string | null> {
  const probe = new URL('/mmj-release.json', window.location.origin)
  probe.searchParams.set(
    MMJ_PUBLIC_RELEASE_PROBE_QUERY_KEY,
    `${nowMs().toString(36)}-${Math.random().toString(36).slice(2)}`,
  )

  const response = await window.fetch(probe.toString(), {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {
      accept: 'application/json',
    },
  })

  if (!response.ok) return null
  const manifest = parsePublicReleaseManifest(await response.json())
  return manifest?.revision ?? null
}

function cleanupRevisionQuery(): void {
  const cleanHref = stripPublicReleaseQuery(window.location.href)
  if (cleanHref !== window.location.href) {
    window.history.replaceState(window.history.state, '', cleanHref)
  }
}

function scheduleRebootstrap(remoteRevision: string): void {
  const marker = publicReleaseRebootstrapKey(remoteRevision)
  window.sessionStorage.setItem(marker, '1')

  window.location.replace(withPublicReleaseRevision(
    window.location.href,
    remoteRevision,
    nowMs().toString(36),
  ))
}

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const loadedRevision = String(
    config.public.mmjPublicReleaseRevision ?? '',
  )

  if (!isCanonicalPublicReleaseRevision(loadedRevision)) return

  async function checkFreshness(force = false): Promise<void> {
    if (!shouldCheck(force)) return
    if (inFlight !== null) return inFlight

    lastCheckAt = nowMs()
    inFlight = (async () => {
      try {
        const remoteRevision = await fetchRemoteRevision()
        if (remoteRevision === null) return

        const marker = publicReleaseRebootstrapKey(remoteRevision)
        const decision = resolvePublicReleaseFreshnessDecision(
          loadedRevision,
          remoteRevision,
          window.sessionStorage.getItem(marker) === '1',
        )

        switch (decision) {
          case 'current':
            cleanupRevisionQuery()
            return
          case 'rebootstrap':
            scheduleRebootstrap(remoteRevision)
            return
          case 'propagation-pending':
          case 'ignore':
          default:
            return
        }
      } catch {
        // Freshness probing is advisory on network failure. The loaded app remains usable.
      } finally {
        inFlight = null
      }
    })()

    return inFlight
  }

  nuxtApp.hook('app:mounted', () => {
    void checkFreshness(true)
  })

  window.addEventListener('pageshow', () => {
    void checkFreshness(true)
  }, { passive: true })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void checkFreshness(false)
    }
  }, { passive: true })
})
