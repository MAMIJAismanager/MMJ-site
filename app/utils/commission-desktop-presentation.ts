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
  readonly profile: Exclude<CommissionDesktopPresentationProfile, 'measuring' | 'document-flow'>
  readonly widthProfile: Exclude<CommissionDetailWidthProfile, 'full'>
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
] as const satisfies readonly CommissionDesktopPresentationCandidate[])

export function resolveCommissionDetailWidthProfile(
  profile: CommissionDesktopPresentationProfile,
): CommissionDetailWidthProfile {
  switch (profile) {
    case 'wide-supplement':
    case 'wide-supplement-compact':
      return 'wide'
    case 'document-flow':
      return 'full'
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
      return 'supplement-rail'
    case 'measuring':
    case 'balanced-stacked':
    case 'document-flow':
      return 'stacked'
  }
}

export function resolveCommissionDesktopDensity(
  profile: CommissionDesktopPresentationProfile,
): CommissionDetailDensity {
  return profile === 'wide-supplement-compact'
    ? 'compact'
    : 'comfortable'
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
    && measurement.pricingSupplementIntersectionArea <= 0.5
  )
}
