import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue'

import {
  useState,
} from '#imports'

import {
  WORKS_PHYSICAL_FIT_ACTIVE_KEY_STATE_KEY,
  WORKS_PHYSICAL_FIT_STATE_KEY,
  createInitialWorksPhysicalFitReceipt,
  createMeasuringWorksPhysicalFitReceipt,
  isStableWorksPhysicalMeasurement,
  resolveWorksNaturalPhysicalFit,
  verifyWorksLockedPhysicalCommit,
} from '~/works/works-physical-fit'
import {
  readWorksViewportFrameMetrics,
  resolveWorksViewportFrameElements,
} from '~/composables/useViewportFrameMetrics'

import type {
  WorksLayoutProfile,
} from '~/works/works-layout-profile'
import type {
  WorksPhysicalFitReceipt,
  WorksPhysicalMeasurementSnapshot,
} from '~/works/works-physical-fit'

interface WorksPhysicalElementRefs {
  readonly page: Ref<HTMLElement | null>
  readonly header: Ref<HTMLElement | null>
  readonly query: Ref<HTMLElement | null>
  readonly summary: Ref<HTMLElement | null>
  readonly grid: Ref<HTMLElement | null>
  readonly pagination: Ref<HTMLElement | null>
}

export interface UseWorksPhysicalFitAdmissionOptions {
  readonly enabled: ComputedRef<boolean>
  readonly fitKey: ComputedRef<string>
  readonly candidate: ComputedRef<WorksLayoutProfile>
  readonly viewportRevision: Ref<number>
  readonly elements: WorksPhysicalElementRefs
}

const MAX_STABILITY_PROBES = 3

function blockSize(element: HTMLElement): number {
  return Math.max(
    element.clientHeight,
    element.getBoundingClientRect().height,
  )
}

export function useWorksPhysicalFitAdmission(
  options: UseWorksPhysicalFitAdmissionOptions,
) {
  const receipt = useState<WorksPhysicalFitReceipt>(
    WORKS_PHYSICAL_FIT_STATE_KEY,
    () => createInitialWorksPhysicalFitReceipt(),
  )
  const activeFitKey = useState<string | null>(
    WORKS_PHYSICAL_FIT_ACTIVE_KEY_STATE_KEY,
    () => null,
  )

  let observer: ResizeObserver | null = null
  let measurementFrame: number | null = null
  let previousNaturalSnapshot: WorksPhysicalMeasurementSnapshot | null = null
  let stabilityProbeCount = 0
  let mounted = false

  function clearMeasurementFrame(): void {
    if (measurementFrame === null) return
    window.cancelAnimationFrame(measurementFrame)
    measurementFrame = null
  }

  function scheduleMeasurement(): void {
    if (!mounted || measurementFrame !== null) return

    measurementFrame = window.requestAnimationFrame(() => {
      measurementFrame = null
      measureCurrentPhase()
    })
  }

  function currentElements(): readonly HTMLElement[] {
    const values = [
      options.elements.page.value,
      options.elements.header.value,
      options.elements.query.value,
      options.elements.summary.value,
      options.elements.grid.value,
      options.elements.pagination.value,
    ].filter((value): value is HTMLElement => value instanceof HTMLElement)

    const page = options.elements.page.value
    if (page instanceof HTMLElement) {
      const frame = resolveWorksViewportFrameElements(page)
      if (frame !== null) {
        values.push(frame.siteHeaderElement)
      }
    }

    return Object.freeze([...new Set(values)])
  }

  function syncObserverTargets(): void {
    if (observer === null) return

    observer.disconnect()
    for (const element of currentElements()) {
      observer.observe(element)
    }
  }

  function readSnapshot(): WorksPhysicalMeasurementSnapshot | null {
    const page = options.elements.page.value
    const header = options.elements.header.value
    const query = options.elements.query.value
    const summary = options.elements.summary.value
    const grid = options.elements.grid.value
    const pagination = options.elements.pagination.value

    if (
      !(page instanceof HTMLElement)
      || !(header instanceof HTMLElement)
      || !(query instanceof HTMLElement)
      || !(summary instanceof HTMLElement)
      || !(grid instanceof HTMLElement)
    ) {
      return null
    }

    const frame = readWorksViewportFrameMetrics(page)
    if (frame === null) return null

    const gridRect = grid.getBoundingClientRect()
    const paginationRect = pagination instanceof HTMLElement
      ? pagination.getBoundingClientRect()
      : null
    const paginationBlockPx = pagination instanceof HTMLElement
      ? blockSize(pagination)
      : 0

    return Object.freeze({
      fitKey: options.fitKey.value,
      revision: options.viewportRevision.value,

      viewportBlockPx: frame.viewportBlockPx,
      siteHeaderBlockPx: frame.siteHeaderBlockPx,
      mainAvailableBlockPx: frame.mainAvailableBlockPx,

      pageClientBlockPx: blockSize(page),
      pageScrollBlockPx: Math.max(page.scrollHeight, blockSize(page)),

      headerBlockPx: blockSize(header),
      queryBlockPx: blockSize(query),
      summaryBlockPx: blockSize(summary),

      gridClientBlockPx: blockSize(grid),
      gridScrollBlockPx: Math.max(grid.scrollHeight, blockSize(grid)),

      paginationBlockPx,

      gridBottomPx: gridRect.bottom,
      paginationTopPx: (
        paginationRect !== null
        && paginationBlockPx > 0
      )
        ? paginationRect.top
        : null,
    })
  }

  function schedulePostCommitVerification(): void {
    void nextTick(() => {
      scheduleMeasurement()
    })
  }

  function measureCurrentPhase(): void {
    const key = options.fitKey.value
    if (
      activeFitKey.value !== key
      || receipt.value.fitKey !== key
    ) {
      return
    }

    switch (receipt.value.phase) {
      case 'not-applicable':
      case 'rejected-flow':
      case 'revoked-flow':
        return
      default:
        break
    }

    const snapshot = readSnapshot()
    if (snapshot === null) return

    switch (receipt.value.phase) {
      case 'unmeasured':
        previousNaturalSnapshot = snapshot
        stabilityProbeCount = 1
        receipt.value = createMeasuringWorksPhysicalFitReceipt(snapshot)
        scheduleMeasurement()
        return

      case 'measuring-natural': {
        const previous = previousNaturalSnapshot
        if (
          previous !== null
          && isStableWorksPhysicalMeasurement(previous, snapshot)
        ) {
          const resolved = resolveWorksNaturalPhysicalFit(snapshot)
          receipt.value = resolved
          previousNaturalSnapshot = null
          stabilityProbeCount = 0
          if (resolved.phase === 'admitted-locked') {
            schedulePostCommitVerification()
          }
          return
        }

        previousNaturalSnapshot = snapshot
        receipt.value = createMeasuringWorksPhysicalFitReceipt(snapshot)
        stabilityProbeCount += 1
        if (stabilityProbeCount < MAX_STABILITY_PROBES) {
          scheduleMeasurement()
        }
        return
      }

      case 'admitted-locked':
        receipt.value = verifyWorksLockedPhysicalCommit(snapshot)
        return

      default:
        return
    }
  }

  function resetAdmission(): void {
    const key = options.fitKey.value
    activeFitKey.value = key
    previousNaturalSnapshot = null
    stabilityProbeCount = 0
    clearMeasurementFrame()

    if (
      !options.enabled.value
      || !options.candidate.value.lockEligible
    ) {
      receipt.value = createInitialWorksPhysicalFitReceipt(
        key,
        options.viewportRevision.value,
        'not-applicable',
      )
      if (mounted) {
        void nextTick(syncObserverTargets)
      }
      return
    }

    receipt.value = createInitialWorksPhysicalFitReceipt(
      key,
      options.viewportRevision.value,
      'unmeasured',
    )

    if (mounted) {
      void nextTick(() => {
        syncObserverTargets()
        scheduleMeasurement()
      })
    }
  }

  watch(
    [
      options.fitKey,
      options.enabled,
      () => options.candidate.value.lockEligible,
      () => options.candidate.value.mode,
      () => options.candidate.value.cardDensity,
    ],
    resetAdmission,
    { immediate: true, flush: 'sync' },
  )

  onMounted(() => {
    mounted = true

    if (typeof ResizeObserver !== 'function') {
      receipt.value = createInitialWorksPhysicalFitReceipt(
        options.fitKey.value,
        options.viewportRevision.value,
        'rejected-flow',
      )
      return
    }

    observer = new ResizeObserver(() => {
      scheduleMeasurement()
    })

    void nextTick(() => {
      syncObserverTargets()
      scheduleMeasurement()
    })
  })

  onBeforeUnmount(() => {
    mounted = false
    observer?.disconnect()
    observer = null
    clearMeasurementFrame()
  })

  return Object.freeze({
    receipt,
  })
}
