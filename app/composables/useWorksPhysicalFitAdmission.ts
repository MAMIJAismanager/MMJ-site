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
  createInvalidWorksPhysicalFitReceipt,
  createMeasuringWorksPhysicalFitReceipt,
  createSolvingWorksPhysicalFitReceipt,
  isStableWorksPhysicalMeasurement,
  resolveWorksNaturalPhysicalFit,
  verifyWorksLockedPhysicalCommit,
} from '~/works/works-physical-fit'
import {
  WORKS_GRID_PAGINATION_MIN_GAP_PX,
  WORKS_PAGINATION_BOTTOM_SAFETY_PX,
  WORKS_REFERENCE_FIT_STATE_KEY,
  createInitialWorksReferenceFitSolution,
  isHardWorksReferenceViewport,
  resolveWorksReferenceFitSolution,
} from '~/works/works-reference-fit-solver'
import {
  resolveWorksRowMetadataReceipt,
} from '~/works/works-card-physical'
import {
  readWorksViewportFrameMetrics,
  resolveWorksViewportFrameElements,
} from '~/composables/useViewportFrameMetrics'

import type {
  WorksLayoutProfile,
  WorksViewportSnapshot,
} from '~/works/works-layout-profile'
import type {
  WorksPhysicalFitReceipt,
  WorksPhysicalMeasurementSnapshot,
} from '~/works/works-physical-fit'
import type {
  WorksReferenceFitSolution,
} from '~/works/works-reference-fit-solver'
import type {
  WorksCardPhysicalReceipt,
} from '~/works/works-card-physical'

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
  readonly viewport: Ref<WorksViewportSnapshot | null>
  readonly viewportRevision: Ref<number>
  readonly elements: WorksPhysicalElementRefs
  readonly readCardPhysicalReceipts: () => readonly WorksCardPhysicalReceipt[]
}

const MAX_STABILITY_PROBES = 4

function blockSize(element: HTMLElement): number {
  return Math.max(
    element.clientHeight,
    element.getBoundingClientRect().height,
  )
}

function finitePositive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback
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
  const referenceFit = useState<WorksReferenceFitSolution>(
    WORKS_REFERENCE_FIT_STATE_KEY,
    () => createInitialWorksReferenceFitSolution(),
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
        values.push(frame.mainElement)
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
    const pageRect = page.getBoundingClientRect()
    const paginationRect = pagination instanceof HTMLElement
      ? pagination.getBoundingClientRect()
      : null
    const paginationBlockPx = pagination instanceof HTMLElement
      ? blockSize(pagination)
      : 0
    const documentElement = document.documentElement
    const rootFontPx = finitePositive(
      Number.parseFloat(window.getComputedStyle(documentElement).fontSize),
      16,
    )
    const cardReceipts = options.readCardPhysicalReceipts()
    const rowMetadata = resolveWorksRowMetadataReceipt(cardReceipts, 4)
    const currentGridInlinePx = rowMetadata.maxCardInlinePx > 0
      ? (rowMetadata.maxCardInlinePx * 4)
        + (options.candidate.value.tokens.gridGapRem * rootFontPx * 3)
      : Math.max(0, pageRect.width)

    return Object.freeze({
      fitKey: options.fitKey.value,
      revision: options.viewportRevision.value,

      viewportBlockPx: frame.viewportBlockPx,
      visualViewportTopPx: frame.visualViewportTopPx,
      visualViewportBottomPx: frame.visualViewportBottomPx,
      siteHeaderBlockPx: frame.siteHeaderBlockPx,
      mainAvailableBlockPx: frame.mainAvailableBlockPx,
      mainClientBlockPx: frame.mainClientBlockPx,
      mainScrollBlockPx: frame.mainScrollBlockPx,

      documentClientBlockPx: Math.max(0, documentElement.clientHeight),
      documentScrollBlockPx: Math.max(0, documentElement.scrollHeight),
      rootFontPx,

      pageClientBlockPx: blockSize(page),
      pageScrollBlockPx: Math.max(page.scrollHeight, blockSize(page)),
      currentContentInlinePx: Math.max(0, pageRect.width),
      currentGridInlinePx,

      headerBlockPx: blockSize(header),
      queryBlockPx: blockSize(query),
      summaryBlockPx: blockSize(summary),

      gridClientBlockPx: blockSize(grid),
      gridScrollBlockPx: Math.max(grid.scrollHeight, blockSize(grid)),

      paginationBlockPx,
      paginationBottomPx: paginationRect?.bottom ?? null,
      paginationBottomSafetyPx: WORKS_PAGINATION_BOTTOM_SAFETY_PX,
      gridPaginationMinGapPx: WORKS_GRID_PAGINATION_MIN_GAP_PX,
      maxMetadataBlockPx: rowMetadata.overallMetadataMaxPx,
      row0MetadataMaxPx: rowMetadata.row0MetadataMaxPx,
      row1MetadataMaxPx: rowMetadata.row1MetadataMaxPx,
      visibleCardCount: rowMetadata.visibleCardCount,

      gridBottomPx: gridRect.bottom,
      paginationTopPx: (
        paginationRect !== null
        && paginationBlockPx > 0
      )
        ? paginationRect.top
        : null,
    })
  }

  function hardReferenceActive(): boolean {
    const viewport = options.viewport.value
    return viewport !== null && isHardWorksReferenceViewport(viewport)
  }

  function schedulePostCommitVerification(): void {
    void nextTick(() => {
      scheduleMeasurement()
    })
  }

  function effectiveHardRequiredBlock(
    snapshot: WorksPhysicalMeasurementSnapshot,
  ): number {
    let required = Math.max(
      snapshot.pageScrollBlockPx,
      snapshot.mainScrollBlockPx ?? 0,
    )

    if (
      snapshot.paginationBottomPx !== null
      && snapshot.paginationBottomPx !== undefined
      && snapshot.visualViewportBottomPx !== undefined
    ) {
      required += Math.max(
        0,
        snapshot.paginationBottomPx
          + WORKS_PAGINATION_BOTTOM_SAFETY_PX
          - snapshot.visualViewportBottomPx,
      )
    }

    if (snapshot.paginationTopPx !== null) {
      required += Math.max(
        0,
        snapshot.gridBottomPx
          + WORKS_GRID_PAGINATION_MIN_GAP_PX
          - snapshot.paginationTopPx,
      )
    }

    return required
  }

  function resolveHardReferenceSolution(
    snapshot: WorksPhysicalMeasurementSnapshot,
  ): WorksReferenceFitSolution | null {
    const viewport = options.viewport.value
    if (viewport === null || !isHardWorksReferenceViewport(viewport)) {
      return null
    }

    return resolveWorksReferenceFitSolution({
      revision: options.viewportRevision.value,
      fitKey: options.fitKey.value,
      viewport,
      rootFontPx: finitePositive(snapshot.rootFontPx ?? 0, 16),
      mainAvailableBlockPx: snapshot.mainAvailableBlockPx,
      pageRequiredBlockPx: effectiveHardRequiredBlock(snapshot),
      gridRequiredBlockPx: Math.max(
        snapshot.gridClientBlockPx,
        snapshot.gridScrollBlockPx,
      ),
      headerBlockPx: snapshot.headerBlockPx,
      queryBlockPx: snapshot.queryBlockPx,
      summaryBlockPx: snapshot.summaryBlockPx,
      paginationBlockPx: snapshot.paginationBlockPx,
      row0MetadataMaxPx: snapshot.row0MetadataMaxPx ?? 0,
      row1MetadataMaxPx: snapshot.row1MetadataMaxPx ?? 0,
      currentTokens: options.candidate.value.tokens,
      currentContentInlinePx: snapshot.currentContentInlinePx ?? 0,
      currentGridInlinePx: snapshot.currentGridInlinePx ?? 0,
      previousPass: referenceFit.value.fitKey === options.fitKey.value
        ? referenceFit.value.pass
        : 0,
    })
  }

  function continueHardReferenceSolve(
    snapshot: WorksPhysicalMeasurementSnapshot,
  ): boolean {
    const nextSolution = resolveHardReferenceSolution(snapshot)
    if (nextSolution === null) return false

    referenceFit.value = nextSolution
    previousNaturalSnapshot = null
    stabilityProbeCount = 0

    if (nextSolution.phase === 'unsatisfied') {
      // Emergency safety: complete document flow is preferable to fake one-screen clipping.
      receipt.value = createInvalidWorksPhysicalFitReceipt(snapshot)
      return true
    }

    if (nextSolution.phase === 'committed') {
      return false
    }

    receipt.value = createSolvingWorksPhysicalFitReceipt(snapshot)
    void nextTick(() => {
      syncObserverTargets()
      scheduleMeasurement()
    })
    return true
  }

  function resolveStableSnapshot(
    snapshot: WorksPhysicalMeasurementSnapshot,
  ): void {
    if (hardReferenceActive()) {
      const solution = resolveHardReferenceSolution(snapshot)
      if (solution !== null) {
        referenceFit.value = solution

        if (solution.phase === 'unsatisfied') {
          receipt.value = createInvalidWorksPhysicalFitReceipt(snapshot)
          previousNaturalSnapshot = null
          stabilityProbeCount = 0
          return
        }

        if (solution.phase !== 'committed') {
          receipt.value = createSolvingWorksPhysicalFitReceipt(snapshot)
          previousNaturalSnapshot = null
          stabilityProbeCount = 0
          void nextTick(() => {
            syncObserverTargets()
            scheduleMeasurement()
          })
          return
        }
      }
    }

    const resolved = resolveWorksNaturalPhysicalFit(snapshot)
    receipt.value = resolved
    previousNaturalSnapshot = null
    stabilityProbeCount = 0

    if (resolved.phase === 'admitted-locked') {
      schedulePostCommitVerification()
      return
    }

    if (hardReferenceActive()) {
      continueHardReferenceSolve(snapshot)
    }
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
      case 'invalid-reference':
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

      case 'measuring-natural':
      case 'solving-reference': {
        const previous = previousNaturalSnapshot
        if (
          previous !== null
          && isStableWorksPhysicalMeasurement(previous, snapshot)
        ) {
          resolveStableSnapshot(snapshot)
          return
        }

        previousNaturalSnapshot = snapshot
        receipt.value = receipt.value.phase === 'solving-reference'
          ? createSolvingWorksPhysicalFitReceipt(snapshot)
          : createMeasuringWorksPhysicalFitReceipt(snapshot)
        stabilityProbeCount += 1
        if (stabilityProbeCount < MAX_STABILITY_PROBES) {
          scheduleMeasurement()
        }
        return
      }

      case 'admitted-locked': {
        const verified = verifyWorksLockedPhysicalCommit(snapshot)
        if (verified.phase === 'admitted-locked') {
          receipt.value = verified
          return
        }

        if (hardReferenceActive() && continueHardReferenceSolve(snapshot)) {
          return
        }

        receipt.value = verified
        return
      }

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

    const viewport = options.viewport.value
    referenceFit.value = createInitialWorksReferenceFitSolution(
      options.viewportRevision.value,
      key,
      viewport !== null && isHardWorksReferenceViewport(viewport),
    )

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
        hardReferenceActive() ? 'invalid-reference' : 'rejected-flow',
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
    referenceFit,
  })
}
