import type { AssetId } from './domain-identifiers'
import type { ProjectTag } from './project'

export type WorkMediaPostPosition = 0 | 1 | 2 | 3

export interface WorkMediaPostItem {
  readonly position: WorkMediaPostPosition
  readonly assetId: AssetId
}

export interface WorkMediaPost {
  readonly comment: string
  readonly mediaItems: readonly WorkMediaPostItem[]
  readonly tags: readonly ProjectTag[]
}

export type WorkMediaPostIssueCode =
  | 'work-post-comment-empty'
  | 'work-post-comment-too-long'
  | 'work-post-comment-too-many-lines'
  | 'work-post-media-limit'
  | 'work-post-media-required'
  | 'work-post-media-position-invalid'
  | 'work-post-media-duplicate-asset'
  | 'work-post-tag-limit'
  | 'work-post-tag-invalid-token'
  | 'work-post-tag-duplicate'
  | 'work-post-cover-derivation-missing'

export interface WorkMediaPostIssue {
  readonly code: WorkMediaPostIssueCode
  readonly path: string
  readonly message: string
  readonly value: unknown
}
