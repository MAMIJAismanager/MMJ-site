import { findContactInquiryCategory } from './contact-category-registry'
import {
  CONTACT_PACKAGE_DEFINITIONS,
  PROJECT_SERVICE_TYPES,
  PROJECT_TYPES,
  VIDEO_WORK_TYPES,
} from './contact-form-schemas'
import type {
  ContactFormDraft,
  ContactInquiryCategoryId,
  ContactPayload,
  PortfolioPermission,
} from './contact-form-schema'

const yesNoLabel = {
  yes: '예',
  no: '아니오',
} as const

const portfolioLabel: Record<PortfolioPermission, string> = {
  allowed: '허가',
  'not-allowed': '비허가',
  embargo: '일정 기간 비공개 후 허가',
}

function put(
  payload: ContactPayload,
  key: string,
  value: string | number | null | undefined,
): void {
  if (value === null || value === undefined) return
  const normalized = String(value).trim()
  if (normalized.length === 0) return
  payload[key] = normalized
}

function commonPayload(
  draft: ContactFormDraft,
  categoryId: ContactInquiryCategoryId,
): ContactPayload {
  const payload: ContactPayload = {}
  put(payload, 'applicant_name', draft.common.applicantName)
  put(payload, 'kakao_talk_id', draft.common.kakaoTalkId)

  if (categoryId !== 'package') {
    put(payload, 'desired_final_delivery', draft.common.desiredFinalDelivery)
    put(
      payload,
      'deadline_mode',
      draft.common.deadlineMode === 'different'
        ? '별도 데드라인 있음'
        : draft.common.deadlineMode === 'same'
          ? '받고 싶은 날짜와 동일'
          : null,
    )
    if (draft.common.deadlineMode === 'different') {
      put(payload, 'deadline', draft.common.deadline)
    }
  }

  if (draft.common.portfolioPermission !== null) {
    put(
      payload,
      'portfolio_permission',
      portfolioLabel[draft.common.portfolioPermission],
    )
  }
  if (draft.common.portfolioPermission === 'embargo') {
    put(
      payload,
      'portfolio_embargo_condition',
      draft.common.portfolioEmbargoCondition,
    )
  }
  put(payload, 'additional_message', draft.common.additionalMessage)
  return payload
}

function choreographyPayload(draft: ContactFormDraft): ContactPayload {
  const payload: ContactPayload = {}
  for (const [index, song] of draft.choreography.songs.entries()) {
    const number = index + 1
    put(payload, `song_${number}_title`, song.title)
    put(payload, `song_${number}_original`, song.isOriginal ? '예' : '아니오')
    put(payload, `song_${number}_duration`, song.duration)
  }
  put(payload, 'participant_count', draft.choreography.participantCount)
  put(payload, 'usage_purpose', draft.choreography.usagePurpose)
  return payload
}

function compositionPayload(draft: ContactFormDraft): ContactPayload {
  const payload: ContactPayload = {}
  put(payload, 'usage_purpose', draft.composition.usagePurpose)
  put(
    payload,
    'lyrics_presence',
    draft.composition.lyricsPresence === 'present'
      ? '있음'
      : draft.composition.lyricsPresence === 'none'
        ? '없음'
        : null,
  )
  if (draft.composition.lyricsPresence === 'present') {
    put(
      payload,
      'lyric_writing_requirement',
      draft.composition.lyricWritingRequirement === 'required'
        ? '작사 필요'
        : draft.composition.lyricWritingRequirement === 'not-required'
          ? '작사 불필요'
          : null,
    )
  }
  if (draft.composition.compositionScaleMode === 'specified') {
    put(payload, 'composition_scale', draft.composition.compositionScale)
  } else if (draft.composition.compositionScaleMode === 'unknown') {
    put(payload, 'composition_scale', '잘 모르겠음')
  } else if (draft.composition.compositionScaleMode === 'irrelevant') {
    put(payload, 'composition_scale', '무관')
  }
  put(payload, 'requested_duration', draft.composition.requestedDuration)
  return payload
}

function costumePayload(draft: ContactFormDraft): ContactPayload {
  const payload: ContactPayload = {}
  put(payload, 'usage_purpose', draft.costume.usagePurpose)
  if (draft.costume.workType === 'design') {
    put(payload, 'costume_work_type', '디자인')
    put(
      payload,
      'costume_design_tier',
      draft.costume.design.designTier === 'simple'
        ? '간단 디자인'
        : draft.costume.design.designTier === 'formal'
          ? '정식 디자인'
          : null,
    )
    put(
      payload,
      'costume_request_description',
      draft.costume.design.requestDescription,
    )
  }
  if (draft.costume.workType === 'production') {
    put(payload, 'costume_work_type', '제작')
    put(
      payload,
      'costume_request_description',
      draft.costume.production.requestDescription,
    )
    put(payload, 'costume_reference_url', draft.costume.production.referenceUrl)
  }
  return payload
}

function videoPayload(draft: ContactFormDraft): ContactPayload {
  const payload: ContactPayload = {}
  const workType = VIDEO_WORK_TYPES.find(item => item.id === draft.video.workType)
  put(payload, 'video_work_type', workType?.label)
  put(payload, 'usage_purpose', draft.video.usagePurpose)
  if (workType?.family === 'storyboard') {
    put(
      payload,
      'video_request_description',
      draft.video.storyboard.requestDescription,
    )
  }
  if (workType?.family === 'directing') {
    put(
      payload,
      'video_request_description',
      draft.video.directing.requestDescription,
    )
    put(
      payload,
      'shooting_location_state',
      draft.video.directing.shootingLocationState === 'decided'
        ? '정해져 있음'
        : draft.video.directing.shootingLocationState === 'undecided'
          ? '아직 정해지지 않음'
          : null,
    )
    if (draft.video.directing.shootingLocationState === 'decided') {
      put(payload, 'shooting_location', draft.video.directing.shootingLocation)
    }
    put(
      payload,
      'shooting_schedule_state',
      draft.video.directing.shootingScheduleState === 'decided'
        ? '정해져 있음'
        : draft.video.directing.shootingScheduleState === 'undecided'
          ? '아직 정해지지 않음'
          : null,
    )
    if (draft.video.directing.shootingScheduleState === 'decided') {
      put(payload, 'shooting_schedule', draft.video.directing.shootingSchedule)
    }
  }
  if (workType?.family === 'editing') {
    put(
      payload,
      'video_request_description',
      draft.video.editing.requestDescription,
    )
    put(
      payload,
      'editing_reference_url',
      draft.video.editing.editingReferenceUrl,
    )
    put(payload, 'source_drive_url', draft.video.editing.sourceDriveUrl)
  }
  return payload
}

function projectPlanningPayload(draft: ContactFormDraft): ContactPayload {
  const payload: ContactPayload = {}
  put(
    payload,
    'project_type',
    PROJECT_TYPES.find(item => item.value === draft.projectPlanning.projectType)?.label,
  )
  put(
    payload,
    'planning_service_type',
    PROJECT_SERVICE_TYPES.find(item => item.value === draft.projectPlanning.serviceType)?.label,
  )
  put(payload, 'project_description', draft.projectPlanning.projectDescription)
  if (draft.projectPlanning.serviceType === 'advice-feedback') {
    put(
      payload,
      'project_reference_url',
      draft.projectPlanning.adviceFeedback.projectReferenceUrl,
    )
  }
  put(
    payload,
    'continuous_feedback',
    draft.projectPlanning.continuousFeedback === 'requested'
      ? '추가 의뢰함'
      : draft.projectPlanning.continuousFeedback === 'not-requested'
        ? '추가 의뢰하지 않음'
        : null,
  )
  return payload
}

function mixMasterPayload(draft: ContactFormDraft): ContactPayload {
  const payload: ContactPayload = {}
  put(payload, 'usage_purpose', draft.mixMaster.usagePurpose)
  put(
    payload,
    'vocal_formation',
    draft.mixMaster.vocalFormation === 'solo'
      ? '솔로'
      : draft.mixMaster.vocalFormation === 'duet'
        ? '듀엣'
        : draft.mixMaster.vocalFormation === 'group'
          ? '단체'
          : null,
  )
  put(
    payload,
    'harmony_track_presence',
    draft.mixMaster.harmonyTrackPresence === 'present'
      ? '있음'
      : draft.mixMaster.harmonyTrackPresence === 'absent'
        ? '없음'
        : null,
  )
  put(payload, 'harmony_note', draft.mixMaster.harmonyNote)
  if (draft.mixMaster.isCoverSong !== null) {
    put(payload, 'cover_song', yesNoLabel[draft.mixMaster.isCoverSong])
  }
  if (draft.mixMaster.isCoverSong === 'yes') {
    put(payload, 'cover_song_title', draft.mixMaster.coverSongTitle)
    put(payload, 'cover_song_duration', draft.mixMaster.coverSongDuration)
    put(payload, 'cover_song_youtube_url', draft.mixMaster.coverSongYoutubeUrl)
  }
  put(payload, 'request_details', draft.mixMaster.requestDetails)
  return payload
}

function packagePayload(draft: ContactFormDraft): ContactPayload {
  const payload: ContactPayload = {}
  const definition = CONTACT_PACKAGE_DEFINITIONS.find(
    item => item.id === draft.package.packageType,
  )
  put(payload, 'package_type', definition?.label)
  put(payload, 'usage_purpose', draft.package.usagePurpose)
  if (definition !== undefined && definition.baseComposition.length > 0) {
    put(
      payload,
      'base_package_composition',
      definition.baseComposition.join(' / '),
    )
  }

  const uniqueWorkLabels = (state: 'required' | 'considering') => (
    [...new Map(
      draft.package.workItems
        .filter(item => item.state === state && item.label.trim().length > 0)
        .map(item => [item.label.trim().toLocaleLowerCase('ko-KR'), item.label.trim()]),
    ).values()]
  )
  const requiredWorks = uniqueWorkLabels('required')
  const consideringWorks = uniqueWorkLabels('considering')
  put(
    payload,
    definition?.id === 'custom'
      ? 'required_work_categories'
      : 'additional_required_work',
    requiredWorks.join(' / '),
  )
  put(
    payload,
    'considering_work_categories',
    consideringWorks.join(' / '),
  )

  if (definition?.id === 'custom') {
    put(
      payload,
      'same_project',
      draft.package.customSameProject === 'yes'
        ? '예'
        : draft.package.customSameProject === 'no'
          ? '아니오'
          : null,
    )
    const qualification = requiredWorks.length >= 3
      && draft.package.customSameProject === 'yes'
      ? '검토 조건 충족'
      : requiredWorks.length < 3
        ? '확정 작업 3개 미만'
        : '동일 프로젝트 조건 불충족'
    put(payload, 'custom_package_qualification', qualification)
  }

  for (const [index, item] of draft.package.deliverables.entries()) {
    const number = index + 1
    put(payload, `deliverable_${number}`, item.deliverable)
    put(payload, `deliverable_${number}_final_form`, item.finalForm)
    put(payload, `deliverable_${number}_usage_date`, item.usageDate)
    put(payload, `deliverable_${number}_desired_delivery`, item.desiredDelivery)
    put(payload, `deliverable_${number}_note`, item.note)
  }
  put(payload, 'request_description', draft.package.requestDescription)
  put(payload, 'package_reference_url', draft.package.referenceUrl)
  put(
    payload,
    'package_discount_notice',
    '기본 구성 5% 할인 / 추가 구성 및 옵션 추가금 할인 제외',
  )
  return payload
}

export function buildContactPayload(
  categoryId: ContactInquiryCategoryId,
  draft: ContactFormDraft,
): ContactPayload {
  const category = findContactInquiryCategory(categoryId)
  if (category === null || !category.enabled) {
    throw new Error('E_MMJ_CONTACT_CATEGORY_UNRESOLVED')
  }

  const payload: ContactPayload = {
    subject: category.mailSubject,
    inquiry_category: category.id,
    inquiry_category_label: category.label,
    ...commonPayload(draft, categoryId),
  }

  const categoryPayload = (() => {
    switch (categoryId) {
      case 'choreography': return choreographyPayload(draft)
      case 'composition': return compositionPayload(draft)
      case 'costume': return costumePayload(draft)
      case 'video': return videoPayload(draft)
      case 'project-planning': return projectPlanningPayload(draft)
      case 'mix-master': return mixMasterPayload(draft)
      case 'package': return packagePayload(draft)
    }
  })()

  Object.assign(payload, categoryPayload)
  if (draft.honeypot.length > 0) payload._gotcha = draft.honeypot
  return payload
}
