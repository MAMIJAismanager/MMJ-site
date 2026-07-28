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
    profile: 'balanced-horizontal',
    widthProfile: 'balanced',
    detailLayout: 'stacked-horizontal',
    density: 'comfortable',
  }),
  Object.freeze({
    profile: 'wide-horizontal-compact',
    widthProfile: 'wide',
    detailLayout: 'compact-horizontal',
    density: 'compact',
  }),
  Object.freeze({
    profile: 'wide-horizontal-tight',
    widthProfile: 'wide',
    detailLayout: 'compact-horizontal',
    density: 'tight',
  }),
  Object.freeze({
    profile: 'max-horizontal-fitted',
    widthProfile: 'max',
    detailLayout: 'compact-horizontal',
    density: 'fitted',
  }),
] as const satisfies readonly CommissionDesktopPresentationCandidate[])

const COMMISSION_DESKTOP_COMPLEX_MATRIX_CANDIDATES = Object.freeze([
  COMMISSION_DESKTOP_PRESENTATION_CANDIDATES[3],
] as const)

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
    case 'wide-horizontal-compact':
    case 'wide-horizontal-tight':
      return 'wide'
    case 'max-horizontal-fitted':
      return 'max'
    case 'measuring':
    case 'balanced-horizontal':
      return 'balanced'
  }
}

export function resolveCommissionDesktopDetailLayout(
  profile: CommissionDesktopPresentationProfile,
): CommissionDesktopDetailLayout {
  switch (profile) {
    case 'wide-horizontal-compact':
    case 'wide-horizontal-tight':
    case 'max-horizontal-fitted':
      return 'compact-horizontal'
    case 'measuring':
    case 'balanced-horizontal':
      return 'stacked-horizontal'
  }
}

export function resolveCommissionDesktopDensity(
  profile: CommissionDesktopPresentationProfile,
): CommissionDetailDensity {
  switch (profile) {
    case 'wide-horizontal-compact':
      return 'compact'
    case 'wide-horizontal-tight':
      return 'tight'
    case 'max-horizontal-fitted':
      return 'fitted'
    case 'measuring':
    case 'balanced-horizontal':
      return 'comfortable'
  }
}

export function isCommissionDesktopMeasurementFit(
  measurement: CommissionDesktopDetailMeasurement,
): boolean {
  return (
    measurement.overflowWidth <= 1
    && measurement.overflowHeight <= 1
    && measurement.documentOverflowHeight <= 1
    && measurement.guidanceOverflowWidth <= 1
    && measurement.termsOverflowWidth <= 1
    && measurement.pricingTableCoverage
      >= COMMISSION_DESKTOP_MIN_TABLE_COVERAGE
    && measurement.pricingWidthSatisfiesMinimum
    && (
      measurement.guidanceItemCount === 0
      || measurement.guidanceSingleRow
    )
    && (
      measurement.termItemCount === 0
      || measurement.termsSingleRow
    )
  )
}
