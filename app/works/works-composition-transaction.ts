import type {
  ProjectCardView,
} from '~~/shared/view/portfolio-project-view'

import type {
  WorksCardDensity,
} from './works-layout-profile'
import type {
  WorksCompositionCommit,
} from './works-composition-solver'
import type {
  WorksMobileCompositionCommit,
} from './works-mobile-composition'

export type WorksCompositionPhase =
  | 'idle'
  | 'awaiting-fonts'
  | 'measuring-static'
  | 'probing'
  | 'solving'
  | 'ready-to-commit'
  | 'committed'
  | 'flow'
  | 'failed'

export type WorksGridComposition =
  | {
      readonly kind: 'committed'
      readonly inlinePx: number
      readonly columnCount: 4
      readonly cardDensity: WorksCardDensity
      readonly gridGapRem: number
      readonly cardPaddingRem: number
      readonly cardTitleRem: number
      readonly commitId: string
    }
  | {
      readonly kind: 'mobile-committed'
      readonly columnCount: 1 | 2
      readonly cardDensity: WorksCardDensity
      readonly gridGapRem: number
      readonly cardPaddingRem: number
      readonly cardTitleRem: number
      readonly commitId: string
    }
  | {
      readonly kind: 'flow'
      readonly columnCount: 1 | 2 | 3 | 4
      readonly cardDensity: WorksCardDensity
      readonly commitId: string
    }

export interface WorksPublishedComposition {
  readonly key: string
  readonly composition: WorksGridComposition
  readonly projects: readonly ProjectCardView[]
  readonly currentPage: number
  readonly pageCount: number
  readonly commit: WorksCompositionCommit | WorksMobileCompositionCommit | null
}

export interface WorksCompositionTelemetry {
  readonly key: string | null
  readonly phase: WorksCompositionPhase
  readonly probeCount: number
  readonly visibleCommitCount: number
  readonly staleDraftRejectCount: number
  readonly lastFailureReason: string | null
}

export function worksCompositionCommitId(
  commit: WorksCompositionCommit,
): string {
  return [
    'works-r5',
    commit.density,
    Math.round(commit.gridInlinePx),
    Math.round(commit.cardInlinePx),
    commit.probeCount,
  ].join('-')
}

export function createFlowPublishedComposition(
  key: string,
  projects: readonly ProjectCardView[],
  currentPage: number,
  pageCount: number,
  columnCount: 1 | 2 | 3 | 4,
  cardDensity: WorksCardDensity,
): WorksPublishedComposition {
  return Object.freeze({
    key,
    composition: Object.freeze({
      kind: 'flow',
      columnCount,
      cardDensity,
      commitId: `works-r5-flow-${key}`,
    }),
    projects: Object.freeze([...projects]),
    currentPage,
    pageCount,
    commit: null,
  })
}

export function createCommittedPublishedComposition(
  key: string,
  projects: readonly ProjectCardView[],
  currentPage: number,
  pageCount: number,
  commit: WorksCompositionCommit,
): WorksPublishedComposition {
  return Object.freeze({
    key,
    composition: Object.freeze({
      kind: 'committed',
      inlinePx: commit.gridInlinePx,
      columnCount: 4,
      cardDensity: commit.cardDensity,
      gridGapRem: commit.gridGapRem,
      cardPaddingRem: commit.cardPaddingRem,
      cardTitleRem: commit.cardTitleRem,
      commitId: worksCompositionCommitId(commit),
    }),
    projects: Object.freeze([...projects]),
    currentPage,
    pageCount,
    commit,
  })
}

export function worksMobileCompositionCommitId(
  commit: WorksMobileCompositionCommit,
): string {
  return [
    'works-r5-m1-mobile',
    `${commit.columns}col`,
    Math.round(commit.railInlinePx),
    Math.round(commit.cardInlinePx),
    commit.probeCount,
  ].join('-')
}

export function createMobilePublishedComposition(
  key: string,
  projects: readonly ProjectCardView[],
  currentPage: number,
  pageCount: number,
  commit: WorksMobileCompositionCommit,
): WorksPublishedComposition {
  return Object.freeze({
    key,
    composition: Object.freeze({
      kind: 'mobile-committed',
      columnCount: commit.columns,
      cardDensity: commit.cardDensity,
      gridGapRem: commit.gridGapRem,
      cardPaddingRem: commit.cardPaddingRem,
      cardTitleRem: commit.cardTitleRem,
      commitId: worksMobileCompositionCommitId(commit),
    }),
    projects: Object.freeze([...projects]),
    currentPage,
    pageCount,
    commit,
  })
}

