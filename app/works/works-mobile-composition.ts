import type {
  WorksCardDensity,
} from './works-layout-profile'

export const WORKS_MOBILE_FAMILY_MAX_INLINE_PX = 767
export const WORKS_MOBILE_GEOMETRY_EPSILON_PX = 1

export type WorksMobileColumnCount = 1 | 2

export interface WorksMobileStaticMeasurement {
  readonly key: string
  readonly railInlinePx: number
  readonly rootFontPx: number
  readonly gridGapRem: number
  readonly cardPaddingRem: number
  readonly cardTitleRem: number
  readonly cardDensity: WorksCardDensity
}

export interface WorksMobileProbeRequest {
  readonly key: string
  readonly probeId: number
  readonly columns: WorksMobileColumnCount
  readonly railInlinePx: number
  readonly cardInlinePx: number
  readonly gridGapRem: number
  readonly cardPaddingRem: number
  readonly cardTitleRem: number
  readonly cardDensity: WorksCardDensity
}

export interface WorksMobileProbeReceipt {
  readonly key: string
  readonly probeId: number
  readonly columns: WorksMobileColumnCount
  readonly railInlinePx: number
  readonly gridInlinePx: number
  readonly cardInlinePx: number
  readonly gridOverflowPx: number
  readonly metadataClipCount: number
  readonly latinTokenFragmentedCount: number
  readonly singleGraphemeCollapseCount: number
  readonly projectCount: number
  readonly stable: boolean
}

export interface WorksMobileCompositionCommit {
  readonly key: string
  readonly mode: 'mobile-flow'
  readonly columns: WorksMobileColumnCount
  readonly railInlinePx: number
  readonly cardInlinePx: number
  readonly gridGapRem: number
  readonly cardPaddingRem: number
  readonly cardTitleRem: number
  readonly cardDensity: WorksCardDensity
  readonly probeCount: number
  readonly readabilityVerified: true
  readonly overflowVerified: true
  readonly verified: true
}

export type WorksMobileCompositionFailureReason =
  | 'invalid-probe-receipt'
  | 'single-column-readability-failed'
  | 'single-column-overflow-failed'

export function isWorksMobileViewport(
  viewport: { readonly width: number },
): boolean {
  return (
    Number.isFinite(viewport.width)
    && viewport.width > 0
    && viewport.width <= WORKS_MOBILE_FAMILY_MAX_INLINE_PX
  )
}
