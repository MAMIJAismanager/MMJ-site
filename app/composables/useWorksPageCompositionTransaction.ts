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
  advanceWorksPageSolve,
  beginWorksPageSolve,
  type WorksPageSolveDecision,
} from '~/works/works-page-composition-solver'
import {
  worksPageGridComposition,
  type WorksPageCompositionCandidate,
  type WorksPageCompositionTelemetry,
  type WorksPageProbeReceipt,
  type WorksPagePublishedComposition,
  type WorksViewportSnapshotR6,
} from '~/works/works-page-composition'

import type {
  ProjectCardView,
} from '~~/shared/view/portfolio-project-view'

export interface UseWorksPageCompositionTransactionOptions {
  readonly enabled: ComputedRef<boolean>
  readonly viewport: Ref<WorksViewportSnapshotR6 | null>
  readonly inlineRevision: Ref<number>
  readonly blockRevision: Ref<number>
  readonly projects: ComputedRef<readonly ProjectCardView[]>
  readonly currentPage: ComputedRef<number>
  readonly pageCount: ComputedRef<number>
  readonly queryPlacement: ComputedRef<'inline' | 'mobile-menu'>
  readonly pageElement: Ref<HTMLElement | null>
  readonly readProbeReceipt: () => WorksPageProbeReceipt | null
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
  left: WorksPageProbeReceipt,
  right: WorksPageProbeReceipt,
): number {
  return Math.max(
    Math.abs(left.railInlinePx - right.railInlinePx),
    Math.abs(left.gridInlinePx - right.gridInlinePx),
    Math.abs(left.cardInlinePx - right.cardInlinePx),
    Math.abs(left.totalPageBlockPx - right.totalPageBlockPx),
    Math.abs(left.horizontalOverflowPx - right.horizontalOverflowPx),
    Math.abs(left.metadataClipCount - right.metadataClipCount),
    Math.abs(left.latinTokenFragmentedCount - right.latinTokenFragmentedCount),
    Math.abs(left.singleGraphemeCollapseCount - right.singleGraphemeCollapseCount),
  )
}

export function useWorksPageCompositionTransaction(
  options: UseWorksPageCompositionTransactionOptions,
) {
  const published = shallowRef<WorksPagePublishedComposition<ProjectCardView> | null>(null)
  const probeCandidate = shallowRef<WorksPageCompositionCandidate | null>(null)
  const phase = ref<WorksPageCompositionTelemetry['phase']>('idle')
  const probeCount = ref(0)
  const visibleCommitCount = ref(0)
  const staleDraftRejectCount = ref(0)
  const lastFailureReason = ref<string | null>(null)

  let mounted = false
  let generation = 0

  const transactionKey = computed(() => {
    const viewport = options.viewport.value
    return [
      'works-r6',
      `inline-rev:${options.inlineRevision.value}`,
      `block-rev:${options.blockRevision.value}`,
      `size:${viewport?.width ?? 0}x${viewport?.height ?? 0}`,
      `page:${options.currentPage.value}`,
      `pages:${options.pageCount.value}`,
      `projects:${options.projects.value.map(project => project.id).join(',')}`,
    ].join('|')
  })

  const telemetry = computed<WorksPageCompositionTelemetry>(() => Object.freeze({
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

  async function awaitFonts(
    generationAtStart: number,
    key: string,
  ): Promise<boolean> {
    phase.value = 'awaiting-fonts'
    try {
      await document.fonts.ready
    } catch {
      // Font readiness failure does not authorize a guessed visible geometry.
    }
    await nextTick()
    await nextFrame()
    return active(generationAtStart, key)
  }

  function readSolveInput(key: string) {
    const viewport = options.viewport.value
    const page = options.pageElement.value
    if (viewport === null || !(page instanceof HTMLElement)) return null

    const rootStyle = window.getComputedStyle(document.documentElement)
    const rootFontPx = Math.max(1, parsePixel(rootStyle.fontSize))
    const pageGutterPx = Math.max(
      0,
      parsePixel(rootStyle.getPropertyValue('--mm-page-gutter')),
    )
    const main = page.closest('.mm-main')
    const mainTop = main instanceof HTMLElement
      ? main.getBoundingClientRect().top
      : page.getBoundingClientRect().top
    const visualViewport = window.visualViewport
    const visualBottomPx = (
      (visualViewport?.offsetTop ?? 0)
      + (visualViewport?.height ?? window.innerHeight)
    )

    return Object.freeze({
      key,
      viewportWidthPx: viewport.width,
      viewportHeightPx: viewport.height,
      availableInlinePx: Math.max(
        1,
        viewport.width - (pageGutterPx * 2),
      ),
      availableBlockPx: Math.max(0, visualBottomPx - mainTop),
      rootFontPx,
      projectCount: options.projects.value.length,
      queryPlacement: options.queryPlacement.value,
    })
  }

  async function readStableReceipt(
    candidate: WorksPageCompositionCandidate,
    generationAtStart: number,
  ): Promise<WorksPageProbeReceipt | null> {
    probeCandidate.value = candidate
    probeCount.value = candidate.probeId
    phase.value = 'probing'

    await nextTick()
    await nextFrame()
    await nextFrame()
    if (!active(generationAtStart, candidate.key)) return null

    const first = options.readProbeReceipt()
    if (first === null) return null

    await nextFrame()
    if (!active(generationAtStart, candidate.key)) return null
    const second = options.readProbeReceipt()
    if (second === null) return null

    if (receiptDistance(first, second) <= 1) {
      return Object.freeze({ ...second, stable: true })
    }

    await nextFrame()
    if (!active(generationAtStart, candidate.key)) return null
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
    lastFailureReason.value = null

    if (!options.enabled.value || options.projects.value.length === 0) {
      probeCandidate.value = null
      phase.value = 'idle'
      return
    }

    if (!await awaitFonts(generationAtStart, key)) return

    phase.value = 'measuring-static'
    const input = readSolveInput(key)
    if (input === null) {
      lastFailureReason.value = 'static-measurement-unavailable'
      phase.value = 'failed'
      return
    }

    let decision: WorksPageSolveDecision = beginWorksPageSolve(input)

    while (decision.kind === 'probe-required') {
      phase.value = 'solving'
      const receipt = await readStableReceipt(
        decision.candidate,
        generationAtStart,
      )
      if (receipt === null) {
        if (active(generationAtStart, key)) {
          lastFailureReason.value = 'probe-receipt-unavailable'
          phase.value = 'failed'
        }
        return
      }
      if (!active(generationAtStart, key)) return
      decision = advanceWorksPageSolve(decision, receipt)
    }

    if (!active(generationAtStart, key)) return

    if (decision.kind === 'failed') {
      lastFailureReason.value = decision.reason
      phase.value = 'failed'
      probeCandidate.value = null
      return
    }

    phase.value = 'ready-to-commit'
    const commit = decision.commit
    if (commit.key !== key || commit.verified !== true) {
      lastFailureReason.value = 'commit-key-or-verification-mismatch'
      phase.value = 'failed'
      probeCandidate.value = null
      return
    }

    published.value = Object.freeze({
      key,
      projects: Object.freeze([...options.projects.value]),
      currentPage: options.currentPage.value,
      pageCount: options.pageCount.value,
      commit,
      composition: worksPageGridComposition(commit),
    })
    visibleCommitCount.value += 1
    phase.value = 'committed'
    probeCandidate.value = null
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
    probeCandidate.value = null
  })

  return Object.freeze({
    published,
    probeCandidate,
    telemetry,
    transactionKey,
  })
}
