import type {
  ProjectRole,
} from '../constants/taxonomy'

import type {
  ProjectLinkKind,
  ProjectPublishState,
} from '../constants/project-domain'

import type {
  AssetId,
  ProjectId,
} from './domain-identifiers'

import type {
  WorkFilterId,
  WorkPrimaryClassification,
} from './work-classification'

import type { WorkMediaPost } from './work-media-post'

export type {
  AssetId,
  ProjectId,
} from './domain-identifiers'

export interface ProjectTag {
  readonly token: string
  readonly label: string
}

export interface ProjectCreditEntry {
  readonly role: string
  readonly name: string
  readonly href: string | null
}

export interface ProjectCreditGroup {
  readonly id: string
  readonly label: string
  readonly entries: readonly ProjectCreditEntry[]
}

export interface ProjectLink {
  readonly kind: ProjectLinkKind
  readonly label: string
  readonly href: string
}

export interface ProjectSeo {
  readonly title: string
  readonly description: string
  readonly ogAssetId: AssetId | null
  readonly indexable: boolean
}

export interface ProjectTiming {
  readonly year: number | null
  readonly releaseDate: string | null
  readonly publishAt: string | null
}

export interface ProjectAssetReferences {
  readonly coverAssetId: AssetId
  readonly backdropAssetId: AssetId | null
  readonly primaryAssetId: AssetId | null
  readonly galleryAssetIds: readonly AssetId[]
}

export interface PortfolioProject {
  readonly schemaVersion: 1

  readonly id: ProjectId
  readonly slug: string
  readonly title: string

  readonly category: WorkPrimaryClassification
  readonly gatewayCategoryIds: readonly WorkFilterId[]
  readonly roles: readonly ProjectRole[]
  readonly tags: readonly ProjectTag[]

  readonly timing: ProjectTiming
  readonly client: string | null

  /** Derived from post.comment for V2 sources. */
  readonly summary: string
  /** Derived from post.comment for V2 sources. */
  readonly description: string

  /** Canonical in Content Source V2; optional only during V1 compatibility. */
  readonly post?: WorkMediaPost

  readonly credits: readonly ProjectCreditGroup[]
  readonly externalLinks: readonly ProjectLink[]
  readonly relatedProjectIds: readonly ProjectId[]

  readonly assets: ProjectAssetReferences

  readonly featured: boolean
  readonly publishState: ProjectPublishState
  readonly order: number

  readonly seo: ProjectSeo
}
