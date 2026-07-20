import type {
  AssetApprovalState,
  AssetKind,
  AssetMediaTypeFor,
  AssetRenditionPurposeFor,
} from '../constants/asset-domain'

import type {
  AssetId,
} from './domain-identifiers'

export interface ImageRenditionMetadata {
  readonly width: number
  readonly height: number
}

export interface VideoRenditionMetadata {
  readonly width: number
  readonly height: number
  readonly durationMs: number
  readonly hasAudio: boolean
}

export interface AudioRenditionMetadata {
  readonly durationMs: number
}

export interface AssetRendition<
  Kind extends AssetKind,
  Metadata,
> {
  readonly id: string
  readonly purpose: AssetRenditionPurposeFor<Kind>
  readonly objectKey: string
  readonly mediaType: AssetMediaTypeFor<Kind>
  readonly byteSize: number
  readonly sha256: string
  readonly metadata: Metadata
}

export type ImageAssetRendition = AssetRendition<
  'image',
  ImageRenditionMetadata
>

export type VideoAssetRendition = AssetRendition<
  'video',
  VideoRenditionMetadata
>

export type AudioAssetRendition = AssetRendition<
  'audio',
  AudioRenditionMetadata
>

export interface PortfolioAssetBase<
  Kind extends AssetKind,
  Rendition,
> {
  readonly schemaVersion: 1
  readonly id: AssetId
  readonly kind: Kind
  readonly label: string
  readonly caption: string | null
  readonly credit: string | null
  readonly approvalState: AssetApprovalState
  readonly defaultRenditionId: string
  readonly renditions: readonly Rendition[]
}

export interface PortfolioImageAsset
  extends PortfolioAssetBase<'image', ImageAssetRendition> {
  readonly altText: string | null
}

export interface PortfolioVideoAsset
  extends PortfolioAssetBase<'video', VideoAssetRendition> {
  readonly posterAssetId: AssetId | null
}

export interface PortfolioAudioAsset
  extends PortfolioAssetBase<'audio', AudioAssetRendition> {
  readonly artworkAssetId: AssetId | null
}

export type PortfolioAsset =
  | PortfolioImageAsset
  | PortfolioVideoAsset
  | PortfolioAudioAsset
