import type {
  CommissionDesktopDetailLayout,
  CommissionDesktopDetailMeasurement,
  CommissionDesktopPresentationProfile,
  CommissionDetailWidthProfile,
} from '~/types/commission-presentation'
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
  )
}
