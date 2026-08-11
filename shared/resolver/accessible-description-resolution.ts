import {
  createPortfolioSnapshotQueryAuthority,
} from '../query/portfolio-snapshot-query'
import {
  createPortfolioProjectViewResolver,
} from './portfolio-project-view-resolver'

import type {
  PortfolioSnapshot,
} from '../types/portfolio-snapshot'
import type {
  ResponsiveImageAccessibility,
} from '../types/responsive-image'
import type {
  ResolvedImageAssetReference,
  WorkDetailView,
} from '../view/portfolio-project-view'

export type WorkDetailImageAccessibilityContext =
  | 'primary-image'
  | 'gallery-image'
  | 'primary-video-poster'
  | 'gallery-video-poster'
  | 'primary-audio-artwork'
  | 'gallery-audio-artwork'

export type AccessibleDescriptionProvenance =
  | 'explicit-alt'
  | 'media-caption'
  | 'project-description'
  | 'project-summary'

export type AccessibleDescriptionResolutionFailureReason =
  | 'invalid-explicit-type'
  | 'invalid-explicit-empty'
  | 'invalid-explicit-whitespace-only'
  | 'invalid-explicit-untrimmed'
  | 'invalid-explicit-control-character'
  | 'unresolvable'

export interface ResolvedAccessibleDescription {
  readonly text: string
  readonly provenance: AccessibleDescriptionProvenance
  readonly derived: boolean
  readonly sourcePath: string
  readonly candidateIndex: number | null
}

export interface WorkDetailAccessibleDescriptionReceipt {
  readonly projectId: string
  readonly route: string
  readonly assetId: string
  readonly ownerAssetId: string | null
  readonly context: WorkDetailImageAccessibilityContext
  readonly relationPath: string
  readonly accessibilityMode: 'informative' | 'decorative'
  readonly provenance: AccessibleDescriptionProvenance | null
  readonly derived: boolean
  readonly sourcePath: string | null
  readonly candidateIndex: number | null
}

export class AccessibleDescriptionResolutionError extends Error {
  override readonly name = 'AccessibleDescriptionResolutionError'

  constructor(
    readonly code:
      | 'invalid-explicit-image-alt'
      | 'accessible-description-unresolvable',
    readonly assetId: string,
    readonly context: WorkDetailImageAccessibilityContext,
    readonly path: string,
    readonly reason: AccessibleDescriptionResolutionFailureReason,
  ) {
    super(
      `${code}: assetId=${assetId}; context=${context}; path=${path}; reason=${reason}`,
    )
  }
}

export class WorkDetailAccessibleDescriptionAdmissionError extends Error {
  override readonly name = 'WorkDetailAccessibleDescriptionAdmissionError'
  readonly code = 'work-detail-accessible-description-resolution-failed' as const

  constructor(
    readonly projectId: string,
    readonly route: string,
    readonly assetId: string,
    readonly ownerAssetId: string | null,
    readonly context: WorkDetailImageAccessibilityContext,
    readonly relationPath: string,
    readonly accessibilityMode: 'informative',
    readonly reason: AccessibleDescriptionResolutionFailureReason,
    readonly underlyingErrorName: string,
    readonly underlyingErrorCode: string | null,
    readonly underlyingErrorPath: string | null,
  ) {
    super(
      `work-detail-accessible-description-resolution-failed: projectId=${projectId}; ` +
      `route=${route}; assetId=${assetId}; context=${context}; ` +
      `relationPath=${relationPath}; reason=${reason}`,
    )
  }
}

const CONTROL_CHARACTER = /[\u0000-\u001F\u007F]/u
const SENTENCE_PATTERN = /[^.!?。！？\r\n]+[.!?。！？]?/gu
const MEANINGFUL_CHARACTER = /[\p{L}\p{N}]/gu
const MIN_MEANINGFUL_CHARACTERS = 2
const MAX_DESCRIPTION_CHARACTERS = 500
const GENERIC_DESCRIPTION_EXACT = new Set([
  '이미지',
  '사진',
  '그림',
  '메인 이미지',
  '대표 이미지',
  '관련 이미지',
  'image',
  'photo',
  'picture',
])

const ACCESSIBILITY_MODE_BY_CONTEXT: Readonly<
  Record<WorkDetailImageAccessibilityContext, 'informative' | 'decorative'>
> = Object.freeze({
  'primary-image': 'informative',
  'gallery-image': 'informative',
  'primary-video-poster': 'decorative',
  'gallery-video-poster': 'informative',
  'primary-audio-artwork': 'informative',
  'gallery-audio-artwork': 'informative',
})

export function isInformativeWorkDetailImageContext(
  context: WorkDetailImageAccessibilityContext,
): boolean {
  return ACCESSIBILITY_MODE_BY_CONTEXT[context] === 'informative'
}

export function classifyWorkDetailFrameImageAccessibilityContext(
  assetKind: 'image' | 'video' | 'audio',
  primaryDetail: boolean,
): WorkDetailImageAccessibilityContext {
  switch (assetKind) {
    case 'image':
      return primaryDetail ? 'primary-image' : 'gallery-image'
    case 'video':
      return primaryDetail ? 'primary-video-poster' : 'gallery-video-poster'
    case 'audio':
      return primaryDetail ? 'primary-audio-artwork' : 'gallery-audio-artwork'
  }
}

function exactExplicitAlt(
  asset: ResolvedImageAssetReference,
  context: WorkDetailImageAccessibilityContext,
): ResolvedAccessibleDescription | null {
  const value: unknown = asset.altText
  const path = `asset(${asset.id}).altText`
  if (value === null || typeof value === 'undefined') return null
  if (typeof value !== 'string') {
    throw new AccessibleDescriptionResolutionError(
      'invalid-explicit-image-alt', asset.id, context, path, 'invalid-explicit-type',
    )
  }
  if (value.length === 0) {
    throw new AccessibleDescriptionResolutionError(
      'invalid-explicit-image-alt', asset.id, context, path, 'invalid-explicit-empty',
    )
  }
  if (value.trim().length === 0) {
    throw new AccessibleDescriptionResolutionError(
      'invalid-explicit-image-alt', asset.id, context, path, 'invalid-explicit-whitespace-only',
    )
  }
  if (value.trim() !== value) {
    throw new AccessibleDescriptionResolutionError(
      'invalid-explicit-image-alt', asset.id, context, path, 'invalid-explicit-untrimmed',
    )
  }
  if (CONTROL_CHARACTER.test(value)) {
    throw new AccessibleDescriptionResolutionError(
      'invalid-explicit-image-alt', asset.id, context, path, 'invalid-explicit-control-character',
    )
  }
  return Object.freeze({
    text: value,
    provenance: 'explicit-alt' as const,
    derived: false,
    sourcePath: path,
    candidateIndex: null,
  })
}

function normalizeDerivedText(value: string): string {
  return value
    .replace(/\r\n?/gu, '\n')
    .replace(/[\t\f\v ]+/gu, ' ')
    .replace(/ *\n+ */gu, '\n')
    .trim()
}

function meaningfulCount(value: string): number {
  return value.match(MEANINGFUL_CHARACTER)?.length ?? 0
}

function isUsableDerivedSentence(value: string): boolean {
  if (value.length === 0) return false
  if (CONTROL_CHARACTER.test(value)) return false
  if (GENERIC_DESCRIPTION_EXACT.has(value.toLowerCase())) return false
  return meaningfulCount(value) >= MIN_MEANINGFUL_CHARACTERS
}

function boundedSentence(value: string): string {
  if (value.length <= MAX_DESCRIPTION_CHARACTERS) return value
  const prefix = value.slice(0, MAX_DESCRIPTION_CHARACTERS + 1)
  const boundary = Math.max(
    prefix.lastIndexOf(' '),
    prefix.lastIndexOf(','),
    prefix.lastIndexOf('，'),
    prefix.lastIndexOf('·'),
  )
  if (boundary >= Math.floor(MAX_DESCRIPTION_CHARACTERS * 0.6)) {
    return prefix.slice(0, boundary).trim()
  }
  return value.slice(0, MAX_DESCRIPTION_CHARACTERS).trim()
}

function selectDerivedCandidate(
  raw: string | null,
  provenance: Exclude<AccessibleDescriptionProvenance, 'explicit-alt'>,
  sourcePath: string,
): ResolvedAccessibleDescription | null {
  if (raw === null) return null
  const normalized = normalizeDerivedText(raw)
  if (normalized.length === 0) return null
  const sentences = normalized.match(SENTENCE_PATTERN) ?? [normalized]
  for (const [candidateIndex, sentence] of sentences.entries()) {
    const candidate = normalizeDerivedText(sentence)
    if (!isUsableDerivedSentence(candidate)) continue
    const text = boundedSentence(candidate)
    if (!isUsableDerivedSentence(text)) continue
    return Object.freeze({
      text,
      provenance,
      derived: true,
      sourcePath,
      candidateIndex,
    })
  }
  return null
}

export function resolveWorkDetailAccessibleDescription(
  project: WorkDetailView,
  asset: ResolvedImageAssetReference,
  context: WorkDetailImageAccessibilityContext,
): ResolvedAccessibleDescription | null {
  if (!isInformativeWorkDetailImageContext(context)) return null

  const explicit = exactExplicitAlt(asset, context)
  if (explicit !== null) return explicit

  const candidates = [
    selectDerivedCandidate(
      asset.caption,
      'media-caption',
      `asset(${asset.id}).caption`,
    ),
    selectDerivedCandidate(
      project.description,
      'project-description',
      `project(${project.id}).description`,
    ),
    selectDerivedCandidate(
      project.summary,
      'project-summary',
      `project(${project.id}).summary`,
    ),
  ] as const

  for (const candidate of candidates) {
    if (candidate !== null) return candidate
  }

  throw new AccessibleDescriptionResolutionError(
    'accessible-description-unresolvable',
    asset.id,
    context,
    `asset(${asset.id}).altText`,
    'unresolvable',
  )
}

export function resolveWorkDetailImageAccessibility(
  project: WorkDetailView,
  asset: ResolvedImageAssetReference,
  context: WorkDetailImageAccessibilityContext,
): ResponsiveImageAccessibility {
  if (!isInformativeWorkDetailImageContext(context)) {
    return Object.freeze({ mode: 'decorative' as const })
  }
  const resolved = resolveWorkDetailAccessibleDescription(project, asset, context)
  if (resolved === null) {
    throw new Error(`Informative accessibility resolved null for ${asset.id}.`)
  }
  return Object.freeze({
    mode: 'informative' as const,
    altText: resolved.text,
  })
}

function admissionFailure(
  project: WorkDetailView,
  asset: ResolvedImageAssetReference,
  ownerAssetId: string | null,
  context: WorkDetailImageAccessibilityContext,
  relationPath: string,
  error: unknown,
): never {
  if (error instanceof WorkDetailAccessibleDescriptionAdmissionError) throw error
  if (error instanceof AccessibleDescriptionResolutionError) {
    throw new WorkDetailAccessibleDescriptionAdmissionError(
      project.id,
      project.href,
      asset.id,
      ownerAssetId,
      context,
      relationPath,
      'informative',
      error.reason,
      error.name,
      error.code,
      error.path,
    )
  }
  throw error
}

function admitContext(
  project: WorkDetailView,
  asset: ResolvedImageAssetReference,
  ownerAssetId: string | null,
  context: WorkDetailImageAccessibilityContext,
  relationPath: string,
  receipts: WorkDetailAccessibleDescriptionReceipt[],
): void {
  if (!isInformativeWorkDetailImageContext(context)) {
    receipts.push(Object.freeze({
      projectId: project.id,
      route: project.href,
      assetId: asset.id,
      ownerAssetId,
      context,
      relationPath,
      accessibilityMode: 'decorative' as const,
      provenance: null,
      derived: false,
      sourcePath: null,
      candidateIndex: null,
    }))
    return
  }

  let resolved: ResolvedAccessibleDescription
  try {
    const candidate = resolveWorkDetailAccessibleDescription(project, asset, context)
    if (candidate === null) throw new Error(`Informative context resolved null for ${asset.id}.`)
    resolved = candidate
  } catch (error) {
    admissionFailure(project, asset, ownerAssetId, context, relationPath, error)
  }

  receipts.push(Object.freeze({
    projectId: project.id,
    route: project.href,
    assetId: asset.id,
    ownerAssetId,
    context,
    relationPath,
    accessibilityMode: 'informative' as const,
    provenance: resolved.provenance,
    derived: resolved.derived,
    sourcePath: resolved.sourcePath,
    candidateIndex: resolved.candidateIndex,
  }))
}

export function admitPortfolioAccessibleDescriptions(
  snapshot: PortfolioSnapshot,
): readonly WorkDetailAccessibleDescriptionReceipt[] {
  const queries = createPortfolioSnapshotQueryAuthority(snapshot)
  const views = createPortfolioProjectViewResolver(snapshot, queries)
  const receipts: WorkDetailAccessibleDescriptionReceipt[] = []

  for (const [projectIndex, sourceProject] of snapshot.projects.entries()) {
    const project = views.findWorkDetailById(sourceProject.id)
    if (project === null) {
      throw new Error(
        `Work Detail accessible description admission could not resolve project ${sourceProject.id}.`,
      )
    }

    const primary = project.assets.primary
    if (primary !== null) {
      const primaryPath = `$snapshot.projects[${projectIndex}].assets.primaryAssetId`
      switch (primary.kind) {
        case 'image':
          admitContext(project, primary, null, 'primary-image', primaryPath, receipts)
          break
        case 'video':
          if (primary.poster !== null) {
            admitContext(
              project,
              primary.poster,
              primary.id,
              'primary-video-poster',
              `${primaryPath}->asset(${primary.id}).posterAssetId`,
              receipts,
            )
          }
          break
        case 'audio':
          if (primary.artwork !== null) {
            admitContext(
              project,
              primary.artwork,
              primary.id,
              'primary-audio-artwork',
              `${primaryPath}->asset(${primary.id}).artworkAssetId`,
              receipts,
            )
          }
          break
      }
    }

    for (const [galleryIndex, asset] of project.assets.gallery.entries()) {
      const galleryPath = `$snapshot.projects[${projectIndex}].assets.galleryAssetIds[${galleryIndex}]`
      switch (asset.kind) {
        case 'image':
          admitContext(project, asset, null, 'gallery-image', galleryPath, receipts)
          break
        case 'video':
          if (asset.poster !== null) {
            admitContext(
              project,
              asset.poster,
              asset.id,
              'gallery-video-poster',
              `${galleryPath}->asset(${asset.id}).posterAssetId`,
              receipts,
            )
          }
          break
        case 'audio':
          if (asset.artwork !== null) {
            admitContext(
              project,
              asset.artwork,
              asset.id,
              'gallery-audio-artwork',
              `${galleryPath}->asset(${asset.id}).artworkAssetId`,
              receipts,
            )
          }
          break
      }
    }
  }

  return Object.freeze(receipts)
}
