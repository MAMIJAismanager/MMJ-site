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
  | 'balanced-horizontal'
  | 'wide-horizontal-compact'
  | 'wide-horizontal-tight'
  | 'max-horizontal-fitted'

export type CommissionDetailWidthProfile =
  | 'balanced'
  | 'wide'
  | 'max'

export type CommissionDesktopDetailLayout =
  | 'stacked-horizontal'
  | 'compact-horizontal'

export interface CommissionDesktopDetailMeasurement {
  readonly stageWidth: number
  readonly stageHeight: number
  readonly rootWidth: number
  readonly rootHeight: number
  readonly pricingWidth: number
  readonly pricingHeight: number
  readonly guidanceWidth: number
  readonly guidanceHeight: number
  readonly termsWidth: number
  readonly termsHeight: number
  readonly pricingTableCoverage: number
  readonly minimumPricingWidth: number
  readonly pricingWidthSatisfiesMinimum: boolean
  readonly guidanceItemCount: number
  readonly guidanceSingleRow: boolean
  readonly termItemCount: number
  readonly termsSingleRow: boolean
  readonly guidanceOverflowWidth: number
  readonly termsOverflowWidth: number
  readonly overflowWidth: number
  readonly overflowHeight: number
  readonly documentOverflowHeight: number
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
