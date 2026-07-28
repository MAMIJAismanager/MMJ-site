export const COMMISSION_SERVICE_IDS = [
  'choreography',
  'lyrics-composition',
  'costume-design-production',
  'video-direction',
  'project-planning',
  'mixing-mastering',
] as const

export type CommissionServiceId =
  typeof COMMISSION_SERVICE_IDS[number]

export type CommissionPricingColumnId = string
export type CommissionPricingRowId = string
export type CommissionPricingGroupId = string
export type CommissionTermId = string

export type CommissionPriceCellMode =
  | 'from'
  | 'fixed'
  | 'quote'

export interface CommissionQuotePricing {
  readonly kind: 'quote'
  readonly displayLabel: string
  readonly note: string | null
  readonly mock: boolean
}

export interface CommissionPricingColumn {
  readonly id: CommissionPricingColumnId
  readonly order: number
  readonly enabled: boolean
  readonly label: string
  readonly detailLabel: string | null
  readonly shortLabel: string
}

export interface CommissionPricingRow {
  readonly id: CommissionPricingRowId
  readonly order: number
  readonly enabled: boolean
  readonly label: string
  readonly detailLabel: string | null
  readonly shortLabel?: string | null
}

export interface CommissionPricingCell {
  readonly rowId: CommissionPricingRowId
  readonly columnId: CommissionPricingColumnId
  readonly mode: CommissionPriceCellMode
  readonly amountKrw: number | null
  readonly displayOverride: string | null
  readonly note: string | null
}

export interface CommissionPricingFullSpanCell {
  readonly rowId: CommissionPricingRowId
  readonly mode: 'recurring-from'
  readonly weeklyAmountKrw: number
  readonly monthlyAmountKrw: number
  readonly note: string | null
}

export interface CommissionMatrixPricing {
  readonly kind: 'matrix'
  readonly title: string
  readonly description: string | null
  readonly compactDescription: string | null
  readonly currency: 'KRW'
  readonly displayUnit: 'manwon' | 'won'
  readonly unitLabel: string
  readonly rowAxisLabel: string
  readonly columnAxisLabel: string
  readonly columns: readonly CommissionPricingColumn[]
  readonly rows: readonly CommissionPricingRow[]
  readonly cells: readonly CommissionPricingCell[]
  readonly fullSpanCells: readonly CommissionPricingFullSpanCell[]
  readonly footnote: string | null
  readonly mock: boolean
}


export interface CommissionRateRangeItem {
  readonly id: string
  readonly order: number
  readonly enabled: boolean
  readonly label: string
  readonly detailLabel: string | null
  readonly minimumAmountKrw: number
  readonly maximumAmountKrw: number
  readonly basisLabel: string
  readonly expenseLabel: string | null
  readonly note: string | null
}

export interface CommissionRateRangePricing {
  readonly kind: 'rate-range'
  readonly title: string
  readonly description: string | null
  readonly currency: 'KRW'
  readonly displayUnit: 'manwon' | 'won'
  readonly unitLabel: string
  readonly rowAxisLabel: string
  readonly rangeAxisLabel: string
  readonly rangeAxisDetailLabel: string | null
  readonly items: readonly CommissionRateRangeItem[]
  readonly footnote: string | null
  readonly mock: boolean
}

export interface CommissionPricingGuidanceItem {
  readonly id: string
  readonly order: number
  readonly enabled: boolean
  readonly label: string
  readonly description: string
}

export interface CommissionMatrixPricingGroup {
  readonly id: CommissionPricingGroupId
  readonly order: number
  readonly enabled: boolean
  readonly label: string
  readonly shortLabel: string
  readonly rowAxisLabel: string
  readonly columnAxisLabel: string
  readonly columns: readonly CommissionPricingColumn[]
  readonly rows: readonly CommissionPricingRow[]
  readonly cells: readonly CommissionPricingCell[]
  readonly fullSpanCells: readonly CommissionPricingFullSpanCell[]
  readonly guidanceItems: readonly CommissionPricingGuidanceItem[]
}

export interface CommissionMatrixSetPricing {
  readonly kind: 'matrix-set'
  readonly title: string
  readonly description: string | null
  readonly compactDescription: string | null
  readonly currency: 'KRW'
  readonly displayUnit: 'manwon' | 'won'
  readonly unitLabel: string
  readonly groups: readonly CommissionMatrixPricingGroup[]
  readonly sharedGuidanceHeading: string | null
  readonly sharedGuidanceItems: readonly CommissionPricingGuidanceItem[]
  readonly footnote: string | null
  readonly mock: boolean
}

export type CommissionPricing =
  | CommissionQuotePricing
  | CommissionMatrixPricing
  | CommissionMatrixSetPricing
  | CommissionRateRangePricing

export interface CommissionService {
  readonly id: CommissionServiceId
  readonly order: number
  readonly enabled: boolean
  readonly label: string
  readonly summary: string
  readonly description: string
  readonly pricing: CommissionPricing
  readonly excludedGlobalTermIds: readonly CommissionTermId[]
  readonly includedItems: readonly string[]
  readonly turnaroundLabel: string
  readonly revisionLabel: string
  readonly additionalCostNote: string | null
  readonly inquiryLabel: string
}

export type CommissionTermScope =
  | 'global'
  | 'service'

export const COMMISSION_TERM_ICON_KEYS = [
  'consultation',
  'people',
  'receipt',
  'adjustment',
  'deadline',
  'revision',
] as const

export type CommissionTermIconKey =
  typeof COMMISSION_TERM_ICON_KEYS[number]

export interface CommissionTerm {
  readonly id: CommissionTermId
  readonly order: number
  readonly enabled: boolean
  readonly scope: CommissionTermScope
  readonly serviceId: CommissionServiceId | null
  readonly label: string
  readonly description: string | null
  readonly iconKey: CommissionTermIconKey | null
}

export interface CommissionGuideContent {
  readonly schemaVersion: 9
  readonly eyebrow: string
  readonly title: string
  readonly lead: string
  readonly seoTitle: string
  readonly seoDescription: string
  readonly sectionHeading: string
  readonly services: readonly CommissionService[]
  readonly commonNoticeHeading: string
  readonly terms: readonly CommissionTerm[]
  readonly worksLinkLabel: string
  readonly contactLinkLabel: string
}

/*
 * Future Google Sheets build-adapter rows.
 * These are intentionally flat so a later adapter can validate sheet rows,
 * then promote them into CommissionGuideContent without changing Vue code.
 */
export interface CommissionServiceSheetRow {
  readonly service_id: string
  readonly order: number
  readonly enabled: boolean
  readonly label: string
  readonly summary: string
  readonly description: string
  readonly pricing_kind: 'quote' | 'matrix' | 'matrix-set' | 'rate-range'
  readonly turnaround_label: string
  readonly revision_label: string
  readonly additional_cost_note: string | null
  readonly inquiry_label: string
}

export interface CommissionMatrixPricingSheetRow {
  readonly service_id: string
  readonly pricing_title: string
  readonly pricing_description: string | null
  readonly pricing_compact_description: string | null
  readonly currency: 'KRW'
  readonly display_unit: 'manwon' | 'won'
  readonly unit_label: string
  readonly row_axis_label: string | null
  readonly column_axis_label: string | null
  readonly footnote: string | null
}

export interface CommissionPricingGroupSheetRow {
  readonly service_id: string
  readonly pricing_group_id: string
  readonly order: number
  readonly enabled: boolean
  readonly label: string
  readonly short_label: string
  readonly row_axis_label: string
  readonly column_axis_label: string
}

export type CommissionPricingGuidanceScope = 'set' | 'group'

export interface CommissionPricingGuidanceSheetRow {
  readonly service_id: string
  readonly guidance_scope: CommissionPricingGuidanceScope
  readonly pricing_group_id: string | null
  readonly guidance_id: string
  readonly order: number
  readonly enabled: boolean
  readonly heading: string
  readonly label: string
  readonly description: string
}

export interface CommissionServiceTermExclusionSheetRow {
  readonly service_id: string
  readonly term_id: string
}

export interface CommissionRateRangeSheetRow {
  readonly service_id: string
  readonly rate_id: string
  readonly order: number
  readonly enabled: boolean
  readonly label: string
  readonly detail_label: string | null
  readonly minimum_amount_krw: number
  readonly maximum_amount_krw: number
  readonly basis_label: string
  readonly expense_label: string | null
  readonly note: string | null
}

export interface CommissionPricingColumnSheetRow {
  readonly service_id: string
  readonly pricing_group_id: string
  readonly column_id: string
  readonly order: number
  readonly enabled: boolean
  readonly label: string
  readonly detail_label: string | null
  readonly short_label: string
}

export interface CommissionPricingRowSheetRow {
  readonly service_id: string
  readonly pricing_group_id: string
  readonly row_id: string
  readonly order: number
  readonly enabled: boolean
  readonly label: string
  readonly detail_label: string | null
  readonly short_label: string | null
}

export interface CommissionPricingCellSheetRow {
  readonly service_id: string
  readonly pricing_group_id: string
  readonly row_id: string
  readonly column_id: string
  readonly price_mode: CommissionPriceCellMode
  readonly amount_krw: number | null
  readonly display_override: string | null
  readonly note: string | null
}

export interface CommissionPricingFullSpanCellSheetRow {
  readonly service_id: string
  readonly pricing_group_id: string
  readonly row_id: string
  readonly price_mode: 'recurring-from'
  readonly weekly_amount_krw: number
  readonly monthly_amount_krw: number
  readonly note: string | null
}

export interface CommissionTermSheetRow {
  readonly term_id: string
  readonly scope: CommissionTermScope
  readonly service_id: string | null
  readonly order: number
  readonly enabled: boolean
  readonly label: string
  readonly description: string | null
  readonly icon_key: CommissionTermIconKey | null
}

export const COMMISSION_PAGE_COPY_KEYS = [
  'page_eyebrow',
  'page_title',
  'page_lead',
  'seo_title',
  'seo_description',
  'service_section_heading',
  'common_terms_heading',
  'works_link_label',
  'contact_link_label',
] as const

export type CommissionPageCopyKey =
  typeof COMMISSION_PAGE_COPY_KEYS[number]

export interface CommissionPageCopySheetRow {
  readonly copy_key: CommissionPageCopyKey
  readonly value: string
}

export interface CommissionGuideSheetBundle {
  readonly services: readonly CommissionServiceSheetRow[]
  readonly matrixPricing: readonly CommissionMatrixPricingSheetRow[]
  readonly pricingGroups: readonly CommissionPricingGroupSheetRow[]
  readonly pricingGuidance: readonly CommissionPricingGuidanceSheetRow[]
  readonly serviceTermExclusions: readonly CommissionServiceTermExclusionSheetRow[]
  readonly rateRanges: readonly CommissionRateRangeSheetRow[]
  readonly pricingColumns: readonly CommissionPricingColumnSheetRow[]
  readonly pricingRows: readonly CommissionPricingRowSheetRow[]
  readonly pricingCells: readonly CommissionPricingCellSheetRow[]
  readonly pricingFullSpanCells: readonly CommissionPricingFullSpanCellSheetRow[]
  readonly terms: readonly CommissionTermSheetRow[]
  readonly pageCopy: readonly CommissionPageCopySheetRow[]
}
