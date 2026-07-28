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
  | 'wide-supplement-tight'
  | 'max-stage-tight'
  | 'max-stage-fitted'

export type CommissionDetailWidthProfile =
  | 'balanced'
  | 'wide'
  | 'max'

export type CommissionDesktopDetailLayout =
  | 'stacked'
  | 'supplement-rail'

export interface CommissionDesktopDetailMeasurement {
  readonly stageWidth: number
  readonly stageHeight: number
  readonly rootWidth: number
  readonly rootHeight: number
  readonly pricingLeft: number
  readonly pricingRight: number
  readonly pricingWidth: number
  readonly pricingHeight: number
  readonly supplementLeft: number
  readonly supplementRight: number
  readonly supplementWidth: number
  readonly supplementHeight: number
  readonly pricingInlineShare: number
  readonly supplementInlineShare: number
  readonly pricingBeforeSupplement: boolean
  readonly pricingTableCoverage: number
  readonly minimumPricingWidth: number
  readonly pricingWidthSatisfiesMinimum: boolean
  readonly overflowWidth: number
  readonly overflowHeight: number
  readonly documentOverflowHeight: number
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
