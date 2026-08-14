export const WORKS_R6_RELEASE =
  'MMJ-UI29-WORKS-FIRST-VISIBLE-FRAME-WHOLE-PAGE-COMPOSITION-AUTHORITY-R6'

export const WORKS_R6_DISPLAY_CLASS_MIN = Object.freeze({
  width: 1760,
  height: 840,
} as const)

export const WORKS_R6_REFERENCE_VIEWPORT = Object.freeze({
  width: 1920,
  height: 1080,
} as const)

export const WORKS_R6_BOTTOM_SAFETY_PX = 16
export const WORKS_R6_GEOMETRY_EPSILON_PX = 1
export const WORKS_R6_MOBILE_MAX_WIDTH = 767
export const WORKS_R6_TABLET_MAX_WIDTH = 1179

export type WorksPageLayoutMode =
  | 'mobile-single'
  | 'mobile-checkerboard'
  | 'tablet-flow'
  | 'desktop-flow'
  | 'desktop-reference'
  | 'desktop-wide'

export type WorksPageCardDensity =
  | 'compact'
  | 'balanced'
  | 'reference'
  | 'relaxed'

export type WorksPageCompositionPhase =
  | 'idle'
  | 'awaiting-fonts'
  | 'measuring-static'
  | 'probing'
  | 'solving'
  | 'ready-to-commit'
  | 'committed'
  | 'failed'

export interface WorksViewportSnapshotR6 {
  readonly width: number
  readonly height: number
  readonly layoutWidth: number
  readonly layoutHeight: number
  readonly visualOffsetTop: number
  readonly visualOffsetLeft: number
}

export interface WorksPageSolveInput {
  readonly key: string
  readonly viewportWidthPx: number
  readonly viewportHeightPx: number
  readonly availableInlinePx: number
  readonly availableBlockPx: number
  readonly rootFontPx: number
  readonly projectCount: number
  readonly queryPlacement: 'inline' | 'mobile-menu'
}

export interface WorksPageCompositionCandidate {
  readonly key: string
  readonly probeId: number
  readonly presetId: string
  readonly mode: 'display-single-viewport' | 'flow'
  readonly layoutMode: WorksPageLayoutMode
  readonly queryPlacement: 'inline' | 'mobile-menu'
  readonly railInlinePx: number
  readonly columnCount: 1 | 2 | 3 | 4
  readonly cardDensity: WorksPageCardDensity
  readonly pagePaddingBlockPx: number
  readonly pageGapPx: number
  readonly headerGapPx: number
  readonly titlePx: number
  readonly queryGapPx: number
  readonly queryPaddingPx: number
  readonly queryControlBlockPx: number
  readonly gridGapPx: number
  readonly cardPaddingPx: number
  readonly cardTitlePx: number
  readonly minimumCardInlinePx: number
  readonly requireSingleViewport: boolean
}

export interface WorksPageProbeReceipt {
  readonly key: string
  readonly probeId: number
  readonly presetId: string
  readonly railInlinePx: number
  readonly gridInlinePx: number
  readonly cardInlinePx: number
  readonly headerBlockPx: number
  readonly queryBlockPx: number
  readonly summaryBlockPx: number
  readonly gridBlockPx: number
  readonly paginationBlockPx: number
  readonly totalPageBlockPx: number
  readonly queryRowCount: number
  readonly horizontalOverflowPx: number
  readonly metadataClipCount: number
  readonly latinTokenFragmentedCount: number
  readonly singleGraphemeCollapseCount: number
  readonly stable: boolean
}

export interface WorksPageCompositionCommit {
  readonly key: string
  readonly commitId: string
  readonly presetId: string
  readonly mode: 'display-single-viewport' | 'flow'
  readonly layoutMode: WorksPageLayoutMode
  readonly queryPlacement: 'inline' | 'mobile-menu'
  readonly pageRailInlinePx: number
  readonly columnCount: 1 | 2 | 3 | 4
  readonly cardDensity: WorksPageCardDensity
  readonly pagePaddingBlockPx: number
  readonly pageGapPx: number
  readonly headerGapPx: number
  readonly titlePx: number
  readonly queryGapPx: number
  readonly queryPaddingPx: number
  readonly queryControlBlockPx: number
  readonly gridGapPx: number
  readonly cardInlinePx: number
  readonly cardPaddingPx: number
  readonly cardTitlePx: number
  readonly gridBlockPx: number
  readonly paginationBlockPx: number
  readonly requiredBlockPx: number
  readonly availableBlockPx: number
  readonly probeCount: number
  readonly verified: true
  readonly singleViewportVerified: boolean
}

export interface WorksPageGridComposition {
  readonly kind: 'page-committed'
  readonly columnCount: 1 | 2 | 3 | 4
  readonly cardDensity: WorksPageCardDensity
  readonly commitId: string
}

export interface WorksPagePublishedComposition<Project> {
  readonly key: string
  readonly projects: readonly Project[]
  readonly currentPage: number
  readonly pageCount: number
  readonly commit: WorksPageCompositionCommit
  readonly composition: WorksPageGridComposition
}

export interface WorksPageCompositionTelemetry {
  readonly key: string | null
  readonly phase: WorksPageCompositionPhase
  readonly probeCount: number
  readonly visibleCommitCount: number
  readonly staleDraftRejectCount: number
  readonly lastFailureReason: string | null
}

export function isWorksR6DisplayClass(
  viewport: Pick<WorksViewportSnapshotR6, 'width' | 'height'>,
): boolean {
  return (
    viewport.width >= WORKS_R6_DISPLAY_CLASS_MIN.width
    && viewport.height >= WORKS_R6_DISPLAY_CLASS_MIN.height
  )
}

export function isWorksR6MobileViewport(
  viewport: Pick<WorksViewportSnapshotR6, 'width'>,
): boolean {
  return viewport.width <= WORKS_R6_MOBILE_MAX_WIDTH
}

export function resolveWorksPageLayoutMode(
  viewport: Pick<WorksViewportSnapshotR6, 'width' | 'height'>,
): WorksPageLayoutMode {
  if (viewport.width < 336) return 'mobile-single'
  if (viewport.width <= WORKS_R6_MOBILE_MAX_WIDTH) return 'mobile-checkerboard'
  if (viewport.width <= WORKS_R6_TABLET_MAX_WIDTH) return 'tablet-flow'
  if (
    viewport.width < 1440
    || viewport.height < 760
  ) return 'desktop-flow'
  return viewport.width >= 2304
    ? 'desktop-wide'
    : 'desktop-reference'
}

export function worksPageCommitStyle(
  commit: WorksPageCompositionCommit,
): Readonly<Record<string, string>> {
  return Object.freeze({
    '--mm-works-rail-inline': `${commit.pageRailInlinePx}px`,
    '--mm-works-page-padding-block': `${commit.pagePaddingBlockPx}px`,
    '--mm-works-page-gap': `${commit.pageGapPx}px`,
    '--mm-works-header-gap': `${commit.headerGapPx}px`,
    '--mm-works-title-size': `${commit.titlePx}px`,
    '--mm-works-query-gap': `${commit.queryGapPx}px`,
    '--mm-works-query-padding': `${commit.queryPaddingPx}px`,
    '--mm-works-query-control-height': `${commit.queryControlBlockPx}px`,
    '--mm-works-grid-gap': `${commit.gridGapPx}px`,
    '--mm-works-card-padding': `${commit.cardPaddingPx}px`,
    '--mm-works-card-title-size': `${commit.cardTitlePx}px`,
  })
}

export function worksPageGridComposition(
  commit: WorksPageCompositionCommit,
): WorksPageGridComposition {
  return Object.freeze({
    kind: 'page-committed',
    columnCount: commit.columnCount,
    cardDensity: commit.cardDensity,
    commitId: commit.commitId,
  })
}
