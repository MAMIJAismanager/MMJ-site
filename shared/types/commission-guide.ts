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

export type CommissionPriceMode =
  | 'from'
  | 'range'
  | 'quote'

export interface CommissionPrice {
  readonly mode: CommissionPriceMode
  readonly currency: 'KRW'
  readonly minimumKrw: number | null
  readonly maximumKrw: number | null
  readonly unitLabel: string | null
  readonly displayLabel: string
  readonly note: string | null
  readonly mock: boolean
}

export interface CommissionService {
  readonly id: CommissionServiceId
  readonly order: number
  readonly enabled: boolean

  readonly label: string
  readonly summary: string
  readonly description: string

  readonly price: CommissionPrice

  readonly includedItems: readonly string[]
  readonly turnaroundLabel: string
  readonly revisionLabel: string
  readonly additionalCostNote: string | null

  readonly inquiryLabel: string
}

export interface CommissionGuideContent {
  readonly schemaVersion: 1

  readonly eyebrow: string
  readonly title: string
  readonly lead: string
  readonly seoTitle: string
  readonly seoDescription: string

  readonly sectionHeading: string
  readonly services: readonly CommissionService[]

  readonly commonNoticeHeading: string
  readonly commonNotices: readonly string[]

  readonly worksLinkLabel: string
  readonly contactLinkLabel: string
}
