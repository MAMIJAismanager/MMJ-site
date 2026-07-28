import type {
  CommissionDesktopDetailLayout,
  CommissionDesktopDetailMeasurement,
  CommissionDesktopPresentationProfile,
  CommissionDetailWidthProfile,
} from '~/types/commission-presentation'
import type {
  CommissionService,
} from '~~/shared/types/commission-guide'
import type {
  CommissionDetailDensity,
} from '~/utils/commission-detail-density'

export interface CommissionDesktopPresentationCandidate {
  readonly profile: Exclude<CommissionDesktopPresentationProfile, 'measuring'>
  readonly widthProfile: CommissionDetailWidthProfile
  readonly detailLayout: CommissionDesktopDetailLayout
  readonly density: CommissionDetailDensity
}

export const COMMISSION_DESKTOP_PRESENTATION_CANDIDATES = Object.freeze([
  Object.freeze({
    profile: 'balanced-stacked',
    widthProfile: 'balanced',
    detailLayout: 'stacked',
    density: 'comfortable',
  }),
  Object.freeze({
    profile: 'balanced-supplement',
    widthProfile: 'balanced',
    detailLayout: 'supplement-rail',
    density: 'comfortable',
  }),
  Object.freeze({
    profile: 'wide-supplement',
    widthProfile: 'wide',
    detailLayout: 'supplement-rail',
    density: 'comfortable',
  }),
  Object.freeze({
    profile: 'wide-supplement-compact',
    widthProfile: 'wide',
    detailLayout: 'supplement-rail',
    density: 'compact',
  }),
  Object.freeze({
    profile: 'wide-supplement-tight',
    widthProfile: 'wide',
    detailLayout: 'supplement-rail',
    density: 'tight',
  }),
  Object.freeze({
    profile: 'max-stage-tight',
    widthProfile: 'max',
    detailLayout: 'supplement-rail',
    density: 'tight',
  }),
  Object.freeze({
    profile: 'max-stage-fitted',
    widthProfile: 'max',
    detailLayout: 'supplement-rail',
    density: 'fitted',
  }),
] as const satisfies readonly CommissionDesktopPresentationCandidate[])


const COMMISSION_DESKTOP_COMPLEX_MATRIX_CANDIDATES = Object.freeze([
  COMMISSION_DESKTOP_PRESENTATION_CANDIDATES[5],
  COMMISSION_DESKTOP_PRESENTATION_CANDIDATES[6],
] as const)

export const COMMISSION_DESKTOP_MIN_PRICING_INLINE_SHARE = 0.68
export const COMMISSION_DESKTOP_MAX_SUPPLEMENT_INLINE_SHARE = 0.30
export const COMMISSION_DESKTOP_MIN_TABLE_COVERAGE = 0.97

export function resolveCommissionDesktopPresentationCandidates(
  service: CommissionService,
): readonly CommissionDesktopPresentationCandidate[] {
  const enabledGroupCount = service.pricing.kind === 'matrix-set'
    ? service.pricing.groups.filter(group => group.enabled).length
    : 0
  const hasGuidance = service.pricing.kind === 'matrix-set'
    && (
      service.pricing.sharedGuidanceItems.some(item => item.enabled)
      || service.pricing.groups.some(group => (
        group.enabled && group.guidanceItems.some(item => item.enabled)
      ))
    )

  return enabledGroupCount >= 3 && hasGuidance
    ? COMMISSION_DESKTOP_COMPLEX_MATRIX_CANDIDATES
    : COMMISSION_DESKTOP_PRESENTATION_CANDIDATES
}

export function resolveCommissionDetailWidthProfile(
  profile: CommissionDesktopPresentationProfile,
): CommissionDetailWidthProfile {
  switch (profile) {
    case 'wide-supplement':
    case 'wide-supplement-compact':
    case 'wide-supplement-tight':
      return 'wide'
    case 'max-stage-tight':
    case 'max-stage-fitted':
      return 'max'
    case 'measuring':
    case 'balanced-stacked':
    case 'balanced-supplement':
      return 'balanced'
  }
}

export function resolveCommissionDesktopDetailLayout(
  profile: CommissionDesktopPresentationProfile,
): CommissionDesktopDetailLayout {
  switch (profile) {
    case 'balanced-supplement':
    case 'wide-supplement':
    case 'wide-supplement-compact':
    case 'wide-supplement-tight':
    case 'max-stage-tight':
    case 'max-stage-fitted':
      return 'supplement-rail'
    case 'measuring':
    case 'balanced-stacked':
      return 'stacked'
  }
}

export function resolveCommissionDesktopDensity(
  profile: CommissionDesktopPresentationProfile,
): CommissionDetailDensity {
  switch (profile) {
    case 'wide-supplement-compact':
      return 'compact'
    case 'wide-supplement-tight':
    case 'max-stage-tight':
      return 'tight'
    case 'max-stage-fitted':
      return 'fitted'
    case 'measuring':
    case 'balanced-stacked':
    case 'balanced-supplement':
    case 'wide-supplement':
      return 'comfortable'
  }
}

export function intersectionArea(
  left: DOMRectReadOnly,
  right: DOMRectReadOnly,
): number {
  const width = Math.max(
    0,
    Math.min(left.right, right.right) - Math.max(left.left, right.left),
  )
  const height = Math.max(
    0,
    Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top),
  )
  return width * height
}

export function isCommissionDesktopMeasurementFit(
  measurement: CommissionDesktopDetailMeasurement,
): boolean {
  return (
    measurement.overflowWidth <= 1
    && measurement.overflowHeight <= 1
    && measurement.documentOverflowHeight <= 1
    && measurement.pricingSupplementIntersectionArea <= 0.5
    && measurement.pricingBeforeSupplement
    && measurement.pricingInlineShare
      >= COMMISSION_DESKTOP_MIN_PRICING_INLINE_SHARE
    && measurement.supplementInlineShare
      <= COMMISSION_DESKTOP_MAX_SUPPLEMENT_INLINE_SHARE
    && measurement.pricingTableCoverage
      >= COMMISSION_DESKTOP_MIN_TABLE_COVERAGE
    && measurement.pricingWidthSatisfiesMinimum
  )
}
