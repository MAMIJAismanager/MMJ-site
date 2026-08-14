import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue'

import {
  advanceWorksMobileSolve,
  beginWorksMobileSolve,
  type WorksMobileSolveDecision,
} from '~/works/works-mobile-layout-solver'
import {
  isWorksMobileViewport,
  type WorksMobileProbeReceipt,
  type WorksMobileProbeRequest,
  type WorksMobileStaticMeasurement,
} from '~/works/works-mobile-composition'
import {
  createMobilePublishedComposition,
  type WorksCompositionPhase,
  type WorksCompositionTelemetry,
  type WorksPublishedComposition,
} from '~/works/works-composition-transaction'

import type {
  ProjectCardView,
} from '~~/shared/view/portfolio-project-view'
import type {
  WorksLayoutProfile,
  WorksViewportSnapshot,
} from '~/works/works-layout-profile'

export interface UseWorksMobileCompositionTransactionOptions {
  readonly enabled: ComputedRef<boolean>
  readonly viewport: Ref<WorksViewportSnapshot | null>
  readonly layout: ComputedRef<WorksLayoutProfile>
  readonly projects: ComputedRef<readonly ProjectCardView[]>
  readonly currentPage: ComputedRef<number>
  readonly pageCount: ComputedRef<number>
  readonly railElement: Ref<HTMLElement | null>
  readonly readProbeReceipt: () => WorksMobileProbeReceipt | null
}

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback
}

function parsePixel(value: string): number {
  return finite(Number.parseFloat(value), 0)
}

function nextFrame(): Promise<void> {
  return new Promise(resolve => {
    window.requestAnimationFrame(() => resolve())
  })
}

function receiptDistance(
  left: WorksMobileProbeReceipt,
  right: WorksMobileProbeReceipt,
): number {
  return Math.max(
    Math.abs(left.gridInlinePx - right.gridInlinePx),
    Math.abs(left.cardInlinePx - right.cardInlinePx),
    Math.abs(left.gridOverflowPx - right.gridOverflowPx),
    Math.abs(left.latinTokenFragmentedCount - right.latinTokenFragmentedCount),
    Math.abs(left.singleGraphemeCollapseCount - right.singleGraphemeCollapseCount),
    Math.abs(left.metadataClipCount - right.metadataClipCount),
  )
}

export function useWorksMobileCompositionTransaction(
  options: UseWorksMobileCompositionTransactionOptions,
) {
  const published = shallowRef<WorksPublishedComposition | null>(null)
  const probeRequest = shallowRef<WorksMobileProbeRequest | null>(null)
  const phase = ref<WorksCompositionPhase>('idle')
  const probeCount = ref(0)
  const visibleCommitCount = ref(0)
  const staleDraftRejectCount = ref(0)
  const lastFailureReason = ref<string | null>(null)

  let mounted = false
  let generation = 0

  const transactionKey = computed(() => {
    const viewport = options.viewport.value
    const tokens = options.layout.value.tokens
    return [
      'works-r5-m1-mobile',
      `inline:${viewport?.width ?? 0}`,
      `layout-inline:${viewport?.layoutWidth ?? 0}`,
      `page:${options.currentPage.value}`,
      `pages:${options.pageCount.value}`,
      `projects:${options.projects.value.map(project => project.id).join(',')}`,
      `gap:${tokens.gridGapRem}`,
      `padding:${tokens.cardPaddingRem}`,
      `title:${tokens.cardTitleRem}`,
    ].join('|')
  })

  const telemetry = computed<WorksCompositionTelemetry>(() => Object.freeze({
    key: transactionKey.value,
    phase: phase.value,
    probeCount: probeCount.value,
    visibleCommitCount: visibleCommitCount.value,
    staleDraftRejectCount: staleDraftRejectCount.value,
    lastFailureReason: lastFailureReason.value,
  }))

  function active(generationAtStart: number, key: string): boolean {
    const valid = (
      mounted
      && generationAtStart === generation
      && key === transactionKey.value
    )
    if (!valid) staleDraftRejectCount.value += 1
    return valid
  }

  async function awaitFontReady(
    generationAtStart: number,
    key: string,
  ): Promise<boolean> {
    phase.value = 'awaiting-fonts'
    try {
      await document.fonts.ready
    } catch {
      // A failed FontFaceSet promise does not authorize a guessed column count.
    }
    await nextTick()
    await nextFrame()
    return active(generationAtStart, key)
  }

  function readStaticMeasurement(
    key: string,
  ): WorksMobileStaticMeasurement | null {
    const viewport = options.viewport.value
    const rail = options.railElement.value
    if (
      viewport === null
      || !isWorksMobileViewport(viewport)
      || !(rail instanceof HTMLElement)
    ) {
      return null
    }

    const railRect = rail.getBoundingClientRect()
    const rootStyle = window.getComputedStyle(document.documentElement)
    const rootFontPx = Math.max(1, parsePixel(rootStyle.fontSize))
    const tokens = options.layout.value.tokens

    return Object.freeze({
      key,
      railInlinePx: Math.max(1, railRect.width),
      rootFontPx,
      gridGapRem: tokens.gridGapRem,
      cardPaddingRem: tokens.cardPaddingRem,
      cardTitleRem: tokens.cardTitleRem,
      cardDensity: options.layout.value.cardDensity,
    })
  }

  async function readStableProbe(
    request: WorksMobileProbeRequest,
    generationAtStart: number,
  ): Promise<WorksMobileProbeReceipt | null> {
    probeRequest.value = request
    phase.value = 'probing'
    probeCount.value = request.probeId

    await nextTick()
    await nextFrame()
    await nextFrame()
    if (!active(generationAtStart, request.key)) return null

    const first = options.readProbeReceipt()
    if (first === null) return null

    await nextFrame()
    if (!active(generationAtStart, request.key)) return null
    const second = options.readProbeReceipt()
    if (second === null) return null

    if (receiptDistance(first, second) <= 1) {
      return Object.freeze({ ...second, stable: true })
    }

    await nextFrame()
    if (!active(generationAtStart, request.key)) return null
    const third = options.readProbeReceipt()
    if (third === null) return null

    return Object.freeze({
      ...third,
      stable: receiptDistance(second, third) <= 1,
    })
  }

  async function runTransaction(): Promise<void> {
    if (!mounted) return

    generation += 1
    const generationAtStart = generation
    const key = transactionKey.value
    probeCount.value = 0
    visibleCommitCount.value = 0
    lastFailureReason.value = null

    if (!options.enabled.value || options.projects.value.length === 0) {
      probeRequest.value = null
      phase.value = 'idle'
      return
    }

    const viewport = options.viewport.value
    if (viewport === null || !isWorksMobileViewport(viewport)) {
      probeRequest.value = null
      phase.value = 'idle'
      return
    }

    if (!await awaitFontReady(generationAtStart, key)) return

    phase.value = 'measuring-static'
    const measurement = readStaticMeasurement(key)
    if (measurement === null) {
      lastFailureReason.value = 'mobile-rail-measurement-unavailable'
      phase.value = 'failed'
      return
    }

    const lastGood = published.value
    if (
      lastGood?.composition.kind === 'mobile-committed'
      && lastGood.commit?.mode === 'mobile-flow'
      && measurement.railInlinePx + 1 < lastGood.commit.railInlinePx
    ) {
      // A narrower rail can invalidate an old two-column composition. Hold the
      // grid instead of exposing the previous geometry while the new probe runs.
      published.value = null
    }

    let decision: WorksMobileSolveDecision =
      beginWorksMobileSolve(measurement)

    while (decision.kind === 'probe-required') {
      const receipt = await readStableProbe(
        decision.probe,
        generationAtStart,
      )
      if (receipt === null) return
      if (!active(generationAtStart, key)) return
      decision = advanceWorksMobileSolve(decision, receipt)
    }

    if (!active(generationAtStart, key)) return

    if (decision.kind === 'failed') {
      lastFailureReason.value = decision.reason
      probeRequest.value = null
      phase.value = 'failed'
      return
    }

    phase.value = 'ready-to-commit'
    const commit = decision.commit
    if (commit.key !== key || commit.verified !== true) {
      lastFailureReason.value = 'mobile-commit-key-or-verification-mismatch'
      probeRequest.value = null
      phase.value = 'failed'
      return
    }

    published.value = createMobilePublishedComposition(
      key,
      options.projects.value,
      options.currentPage.value,
      options.pageCount.value,
      commit,
    )
    visibleCommitCount.value += 1
    probeRequest.value = null
    phase.value = 'committed'
  }

  watch(
    [transactionKey, options.enabled],
    () => {
      if (!mounted) return
      void runTransaction()
    },
    { flush: 'post' },
  )

  onMounted(() => {
    mounted = true
    void runTransaction()
  })

  onBeforeUnmount(() => {
    mounted = false
    generation += 1
    probeRequest.value = null
  })

  return Object.freeze({
    published,
    probeRequest,
    telemetry,
    transactionKey,
  })
}
