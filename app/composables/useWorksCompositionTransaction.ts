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
  advanceWorksCompositionSolve,
  beginWorksCompositionSolve,
  isWorksAtomicDisplayClass,
  type WorksCompositionProbeReceipt,
  type WorksCompositionProbeRequest,
  type WorksCompositionSolveDecision,
  type WorksCompositionStaticMeasurement,
} from '~/works/works-composition-solver'
import {
  createCommittedPublishedComposition,
  createFlowPublishedComposition,
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

export interface UseWorksCompositionTransactionOptions {
  readonly enabled: ComputedRef<boolean>
  readonly viewport: Ref<WorksViewportSnapshot | null>
  readonly viewportRevision: Ref<number>
  readonly layout: ComputedRef<WorksLayoutProfile>
  readonly projects: ComputedRef<readonly ProjectCardView[]>
  readonly currentPage: ComputedRef<number>
  readonly pageCount: ComputedRef<number>
  readonly pageElement: Ref<HTMLElement | null>
  readonly summaryElement: Ref<HTMLElement | null>
  readonly readProbeReceipt: () => WorksCompositionProbeReceipt | null
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
  left: WorksCompositionProbeReceipt,
  right: WorksCompositionProbeReceipt,
): number {
  return Math.max(
    Math.abs(left.gridBlockPx - right.gridBlockPx),
    Math.abs(left.lowerCompositionBlockPx - right.lowerCompositionBlockPx),
    Math.abs(left.row0MetadataMaxPx - right.row0MetadataMaxPx),
    Math.abs(left.row1MetadataMaxPx - right.row1MetadataMaxPx),
  )
}

export function useWorksCompositionTransaction(
  options: UseWorksCompositionTransactionOptions,
) {
  const published = shallowRef<WorksPublishedComposition | null>(null)
  const probeRequest = shallowRef<WorksCompositionProbeRequest | null>(null)
  const phase = ref<WorksCompositionPhase>('idle')
  const probeCount = ref(0)
  const visibleCommitCount = ref(0)
  const staleDraftRejectCount = ref(0)
  const lastFailureReason = ref<string | null>(null)

  let mounted = false
  let generation = 0

  const transactionKey = computed(() => {
    const viewport = options.viewport.value
    return [
      'works-r5',
      `viewport:${options.viewportRevision.value}`,
      `size:${viewport?.width ?? 0}x${viewport?.height ?? 0}`,
      `mode:${options.layout.value.mode}`,
      `page:${options.currentPage.value}`,
      `pages:${options.pageCount.value}`,
      `projects:${options.projects.value.map(project => project.id).join(',')}`,
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
      // FontFaceSet readiness is an optimization barrier, not a page-failure authority.
    }
    await nextTick()
    await nextFrame()
    return active(generationAtStart, key)
  }

  function readStaticMeasurement(
    key: string,
  ): WorksCompositionStaticMeasurement | null {
    const page = options.pageElement.value
    const summary = options.summaryElement.value
    const viewport = options.viewport.value
    if (
      !(page instanceof HTMLElement)
      || !(summary instanceof HTMLElement)
      || viewport === null
    ) {
      return null
    }

    const pageRect = page.getBoundingClientRect()
    const summaryRect = summary.getBoundingClientRect()
    const pageStyle = window.getComputedStyle(page)
    const rootStyle = window.getComputedStyle(document.documentElement)
    const rootFontPx = Math.max(1, parsePixel(rootStyle.fontSize))
    const pageGapPx = Math.max(
      0,
      parsePixel(pageStyle.rowGap || pageStyle.gap),
    )
    const pagePaddingBottomPx = Math.max(
      0,
      parsePixel(pageStyle.paddingBottom),
    )
    const visualViewport = window.visualViewport
    const visualBottomPx = Math.max(
      0,
      (visualViewport?.offsetTop ?? 0)
        + (visualViewport?.height ?? window.innerHeight),
    )

    return Object.freeze({
      key,
      viewportWidthPx: viewport.width,
      viewportHeightPx: viewport.height,
      inlineLimitPx: Math.max(0, pageRect.width),
      availableLowerBlockPx: Math.max(
        0,
        visualBottomPx
          - summaryRect.bottom
          - pageGapPx
          - pagePaddingBottomPx,
      ),
      rootFontPx,
      pageGapRem: options.layout.value.tokens.pageGapRem,
    })
  }

  async function readStableProbe(
    request: WorksCompositionProbeRequest,
    generationAtStart: number,
  ): Promise<WorksCompositionProbeReceipt | null> {
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

  function publishFlow(key: string): void {
    const layout = options.layout.value
    published.value = createFlowPublishedComposition(
      key,
      options.projects.value,
      options.currentPage.value,
      options.pageCount.value,
      layout.columnCount,
      layout.cardDensity,
    )
    visibleCommitCount.value += 1
    phase.value = 'flow'
    probeRequest.value = null
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
    if (
      viewport === null
      || !isWorksAtomicDisplayClass(viewport)
      || options.layout.value.columnCount !== 4
    ) {
      publishFlow(key)
      return
    }

    if (!await awaitFontReady(generationAtStart, key)) return

    phase.value = 'measuring-static'
    const measurement = readStaticMeasurement(key)
    if (measurement === null) {
      lastFailureReason.value = 'static-measurement-unavailable'
      phase.value = 'failed'
      publishFlow(key)
      return
    }

    let decision: WorksCompositionSolveDecision =
      beginWorksCompositionSolve(measurement)

    while (decision.kind === 'probe-required') {
      phase.value = 'solving'
      const receipt = await readStableProbe(
        decision.probe,
        generationAtStart,
      )
      if (receipt === null) return
      if (!active(generationAtStart, key)) return
      decision = advanceWorksCompositionSolve(decision, receipt)
    }

    if (!active(generationAtStart, key)) return

    if (decision.kind === 'flow-required') {
      lastFailureReason.value = decision.reason
      publishFlow(key)
      return
    }

    phase.value = 'ready-to-commit'
    const commit = decision.commit
    if (commit.key !== key || commit.verified !== true) {
      lastFailureReason.value = 'commit-key-or-verification-mismatch'
      phase.value = 'failed'
      publishFlow(key)
      return
    }

    published.value = createCommittedPublishedComposition(
      key,
      options.projects.value,
      options.currentPage.value,
      options.pageCount.value,
      commit,
    )
    visibleCommitCount.value += 1
    phase.value = 'committed'
    probeRequest.value = null
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
