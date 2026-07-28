import type {
  CommissionServiceId,
} from '~~/shared/types/commission-guide'

export type CommissionMatrixHeaderProjection =
  | 'full'
  | 'unit-only'
  | 'hidden'

export type CommissionTermsProjection =
  | 'full'
  | 'title-only'

export type CommissionMobileMatrixRowProjection =
  | 'stacked'
  | 'single-row-tabs'

export type CommissionPricingRowTabLayout =
  | 'equal'
  | 'scroll'

export type CommissionDesktopPresentationProfile =
  | 'measuring'
  | 'balanced-stacked'
  | 'balanced-supplement'
  | 'wide-supplement'
  | 'wide-supplement-compact'
  | 'document-flow'

export type CommissionDetailWidthProfile =
  | 'balanced'
  | 'wide'
  | 'full'

export type CommissionDesktopDetailLayout =
  | 'stacked'
  | 'supplement-rail'

export interface CommissionDesktopDetailMeasurement {
  readonly stageWidth: number
  readonly stageHeight: number
  readonly rootWidth: number
  readonly rootHeight: number
  readonly pricingWidth: number
  readonly pricingHeight: number
  readonly supplementWidth: number
  readonly supplementHeight: number
  readonly overflowWidth: number
  readonly overflowHeight: number
  readonly pricingSupplementIntersectionArea: number
  readonly fits: boolean
}

export interface CommissionDesktopLayoutReceipt {
  readonly serviceId: CommissionServiceId
  readonly epoch: number
  readonly profile: Exclude<CommissionDesktopPresentationProfile, 'measuring'>
  readonly measurement: CommissionDesktopDetailMeasurement
}

export type CommissionLayoutInvalidationReason =
  | 'service-open'
  | 'group-change'
  | 'row-change'
  | 'viewport-resize'
  | 'font-ready'
  | 'content-change'
