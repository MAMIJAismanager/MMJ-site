import type { PortfolioAsset } from './portfolio-asset'
import type { PortfolioProject } from './project'

export interface PortfolioCollectionSource {
  readonly schemaVersion: 1
  readonly projects: readonly unknown[]
  readonly assets: readonly unknown[]
}

export interface PortfolioSnapshotBuildOptions {
  readonly publicationCutoff: string
  readonly sourceDigest: string
}

export type PublicPortfolioProject = Omit<PortfolioProject, 'publishState' | 'timing'> & {
  readonly timing: Omit<PortfolioProject['timing'], 'publishAt'>
}

export type PublicPortfolioAsset = PortfolioAsset extends infer Asset
  ? Asset extends PortfolioAsset
    ? Omit<Asset, 'approvalState'>
    : never
  : never

export interface PortfolioSnapshot {
  readonly schemaVersion: 1
  readonly sourceDigest: string
  readonly publicationCutoff: string
  readonly projects: readonly PublicPortfolioProject[]
  readonly assets: readonly PublicPortfolioAsset[]
}

export type PortfolioSnapshotIssueCode =
  | 'invalid-source-root'
  | 'missing-source-field'
  | 'unexpected-source-field'
  | 'invalid-source-schema-version'
  | 'invalid-project-list'
  | 'invalid-asset-list'
  | 'invalid-project-record'
  | 'invalid-asset-record'
  | 'invalid-options-root'
  | 'missing-option-field'
  | 'unexpected-option-field'
  | 'invalid-publication-cutoff'
  | 'invalid-source-digest'
  | 'duplicate-project-id'
  | 'duplicate-project-slug'
  | 'duplicate-publishable-order'
  | 'duplicate-asset-id'
  | 'duplicate-object-key'
  | 'missing-related-project'
  | 'public-related-project-unavailable'
  | 'missing-project-asset'
  | 'project-asset-kind-mismatch'
  | 'missing-video-poster'
  | 'video-poster-kind-mismatch'
  | 'missing-audio-artwork'
  | 'audio-artwork-kind-mismatch'
  | 'reachable-asset-not-approved'

export interface PortfolioSnapshotIssue {
  readonly code: PortfolioSnapshotIssueCode
  readonly path: string
  readonly message: string
  readonly value: unknown
}

export interface PortfolioSnapshotDiagnostics {
  readonly sourceProjectCount: number
  readonly sourceAssetCount: number
  readonly validProjectCount: number
  readonly validAssetCount: number
  readonly publicProjectCount: number
  readonly reachableAssetCount: number
  readonly unreachableAssetIds: readonly string[]
  readonly systemClockReadCount: 0
}

export type PortfolioSnapshotBuildResult =
  | {
      readonly valid: true
      readonly snapshot: PortfolioSnapshot
      readonly diagnostics: PortfolioSnapshotDiagnostics
      readonly issues: readonly []
    }
  | {
      readonly valid: false
      readonly snapshot: null
      readonly diagnostics: PortfolioSnapshotDiagnostics
      readonly issues: readonly PortfolioSnapshotIssue[]
    }
