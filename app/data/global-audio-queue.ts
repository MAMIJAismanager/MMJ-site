import {
  HIDDEN_VOICE_SYNTHESIS_CATEGORY_ID,
} from '~~/shared/constants/portfolio-gateway-categories'
import {
  findWorkDetailViewById,
  projectCardViews,
} from '~/data/portfolio-project-views'

import type { ProjectId } from '~~/shared/types/domain-identifiers'
import type {
  ResolvedAudioAssetReference,
} from '~~/shared/view/portfolio-project-view'

export interface GlobalAudioQueueCandidate {
  readonly projectId: ProjectId
  readonly projectTitle: string
  readonly order: number
  readonly asset: ResolvedAudioAssetReference
}

function hasMp3Rendition(
  asset: ResolvedAudioAssetReference,
): boolean {
  return asset.renditions.some(
    rendition => rendition.mediaType === 'audio/mpeg',
  )
}

const candidates: GlobalAudioQueueCandidate[] = []
const orderedProjects = [...projectCardViews].sort(
  (left, right) => left.order - right.order,
)

for (const project of orderedProjects) {
  if (
    project.gatewayCategoryIds.includes(
      HIDDEN_VOICE_SYNTHESIS_CATEGORY_ID,
    )
  ) {
    continue
  }

  const detail = findWorkDetailViewById(project.id)
  const primary = detail?.assets.primary ?? null

  if (
    primary === null
    || primary.kind !== 'audio'
    || !hasMp3Rendition(primary)
  ) {
    continue
  }

  candidates.push(Object.freeze({
    projectId: project.id,
    projectTitle: project.title,
    order: project.order,
    asset: primary,
  }))
}

export const globalAudioQueueCandidates:
readonly GlobalAudioQueueCandidate[] = Object.freeze(candidates)
