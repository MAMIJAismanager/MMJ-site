import {
  computed,
  reactive,
  ref,
} from 'vue'

import { findContactInquiryCategory } from '~/contact/contact-category-registry'
import { buildContactPayload } from '~/contact/contact-payload'
import {
  findPackageDefinition,
  resolveVideoWorkFamily,
} from '~/contact/contact-form-schemas'
import type {
  ContactFormDraft,
  ContactInquiryCategoryId,
  ContactSubmissionState,
  PackageDeliverable,
  PackageWorkItem,
} from '~/contact/contact-form-schema'
import { submitContactToFormspree } from '~/services/contact-formspree-service'
import { resolveFormspreeEndpoint } from '~/utils/formspree-endpoint'

function makeDraft(): ContactFormDraft {
  return {
    common: {
      applicantName: '',
      kakaoTalkId: '',
      desiredFinalDelivery: '',
      deadlineMode: null,
      deadline: '',
      portfolioPermission: null,
      portfolioEmbargoCondition: '',
      additionalMessage: '',
    },
    choreography: {
      songs: [{ id: 'song-1', title: '', isOriginal: false, duration: '' }],
      participantCount: null,
      usagePurpose: '',
    },
    composition: {
      usagePurpose: '',
      lyricsPresence: null,
      lyricWritingRequirement: null,
      compositionScaleMode: null,
      compositionScale: '',
      requestedDuration: '',
    },
    costume: {
      workType: null,
      usagePurpose: '',
      design: {
        designTier: null,
        requestDescription: '',
      },
      production: {
        requestDescription: '',
        referenceUrl: '',
      },
    },
    video: {
      workType: null,
      usagePurpose: '',
      storyboard: {
        requestDescription: '',
      },
      directing: {
        requestDescription: '',
        shootingLocationState: null,
        shootingLocation: '',
        shootingScheduleState: null,
        shootingSchedule: '',
      },
      editing: {
        requestDescription: '',
        editingReferenceUrl: '',
        sourceDriveUrl: '',
      },
    },
    projectPlanning: {
      projectType: null,
      serviceType: null,
      projectDescription: '',
      adviceFeedback: {
        projectReferenceUrl: '',
      },
      continuousFeedback: null,
    },
    mixMaster: {
      usagePurpose: '',
      vocalFormation: null,
      harmonyTrackPresence: null,
      harmonyNote: '',
      isCoverSong: null,
      coverSongTitle: '',
      coverSongDuration: '',
      coverSongYoutubeUrl: '',
      requestDetails: '',
    },
    package: {
      packageType: null,
      usagePurpose: '',
      workItems: [{ id: 'package-work-1', label: '', state: 'required' }],
      customSameProject: null,
      deliverables: [{
        id: 'deliverable-1',
        deliverable: '',
        finalForm: '',
        usageDate: '',
        desiredDelivery: '',
        note: '',
      }],
      requestDescription: '',
      referenceUrl: '',
    },
    honeypot: '',
  }
}

function isNonEmpty(value: string): boolean {
  return value.trim().length > 0
}

function isValidUrl(value: string): boolean {
  if (!isNonEmpty(value)) return true
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export function useContactForm() {
  const runtimeConfig = useRuntimeConfig()
  const endpointState = resolveFormspreeEndpoint(
    String(runtimeConfig.public.mmjContactFormEndpoint ?? ''),
  )

  const activeCategoryId = ref<ContactInquiryCategoryId | null>(null)
  const submissionState = ref<ContactSubmissionState>('idle')
  const providerErrorKind = ref<string | null>(null)
  const draft = reactive<ContactFormDraft>(makeDraft())
  const errors = reactive<Record<string, string>>({})

  let songSequence = 1
  let packageWorkSequence = 1
  let deliverableSequence = 1

  const activeCategory = computed(() => (
    findContactInquiryCategory(activeCategoryId.value)
  ))
  const videoWorkFamily = computed(() => (
    resolveVideoWorkFamily(draft.video.workType)
  ))
  const activePackage = computed(() => (
    findPackageDefinition(draft.package.packageType)
  ))
  const requiredCustomWorkCount = computed(() => (
    new Set(
      draft.package.workItems
        .filter(item => item.state === 'required' && isNonEmpty(item.label))
        .map(item => item.label.trim().toLocaleLowerCase('ko-KR')),
    ).size
  ))
  const customPackageQualification = computed(() => {
    if (draft.package.packageType !== 'custom') return 'not-applicable'
    if (requiredCustomWorkCount.value < 3) return 'insufficient-components'
    if (draft.package.customSameProject !== 'yes') return 'cross-project'
    return 'review-eligible'
  })

  function clearErrors(): void {
    for (const key of Object.keys(errors)) delete errors[key]
    providerErrorKind.value = null
  }

  function error(key: string, message: string): void {
    if (errors[key] === undefined) errors[key] = message
  }

  function validateCommon(categoryId: ContactInquiryCategoryId): void {
    if (!isNonEmpty(draft.common.applicantName)) {
      error('applicantName', '신청자명을 입력해주세요.')
    }
    if (!isNonEmpty(draft.common.kakaoTalkId)) {
      error('kakaoTalkId', '카카오톡 아이디를 입력해주세요.')
    }
    if (categoryId !== 'package') {
      if (!isNonEmpty(draft.common.desiredFinalDelivery)) {
        error('desiredFinalDelivery', '최종 작업물을 받고 싶은 날짜를 입력해주세요.')
      }
      if (draft.common.deadlineMode === null) {
        error('deadlineMode', '별도 데드라인 여부를 선택해주세요.')
      }
      if (
        draft.common.deadlineMode === 'different'
        && !isNonEmpty(draft.common.deadline)
      ) {
        error('deadline', '별도 데드라인을 입력해주세요.')
      }
    }
    if (draft.common.portfolioPermission === null) {
      error('portfolioPermission', '포트폴리오 사용 허가 여부를 선택해주세요.')
    }
    if (
      draft.common.portfolioPermission === 'embargo'
      && !isNonEmpty(draft.common.portfolioEmbargoCondition)
    ) {
      error(
        'portfolioEmbargoCondition',
        '포트폴리오 공개 가능 시점 또는 조건을 입력해주세요.',
      )
    }
  }

  function validateChoreography(): void {
    for (const [index, song] of draft.choreography.songs.entries()) {
      if (!isNonEmpty(song.title)) {
        error(`song-${index}-title`, `곡 ${index + 1}의 곡명을 입력해주세요.`)
      }
      if (!isNonEmpty(song.duration)) {
        error(`song-${index}-duration`, `곡 ${index + 1}의 총 길이를 입력해주세요.`)
      }
    }
    if (
      draft.choreography.participantCount === null
      || !Number.isInteger(draft.choreography.participantCount)
      || draft.choreography.participantCount < 1
    ) {
      error('participantCount', '안무 참여 총 인원수를 입력해주세요.')
    }
    if (!isNonEmpty(draft.choreography.usagePurpose)) {
      error('choreographyUsagePurpose', '작업물 사용목적을 구체적으로 입력해주세요.')
    }
  }

  function validateComposition(): void {
    if (!isNonEmpty(draft.composition.usagePurpose)) {
      error('compositionUsagePurpose', '작업물 사용목적을 구체적으로 입력해주세요.')
    }
    if (draft.composition.lyricsPresence === null) {
      error('lyricsPresence', '가사 유무를 선택해주세요.')
    }
    if (
      draft.composition.lyricsPresence === 'present'
      && draft.composition.lyricWritingRequirement === null
    ) {
      error('lyricWritingRequirement', '작사 필요 여부를 선택해주세요.')
    }
    if (draft.composition.compositionScaleMode === null) {
      error('compositionScaleMode', '곡의 유형과 규모 상태를 선택해주세요.')
    }
    if (
      draft.composition.compositionScaleMode === 'specified'
      && !isNonEmpty(draft.composition.compositionScale)
    ) {
      error('compositionScale', '곡의 유형과 규모를 입력해주세요.')
    }
    if (!isNonEmpty(draft.composition.requestedDuration)) {
      error('requestedDuration', '원하는 곡의 길이를 입력해주세요.')
    }
  }

  function validateCostume(): void {
    if (draft.costume.workType === null) {
      error('costumeWorkType', '의뢰 작업유형을 선택해주세요.')
    }
    if (!isNonEmpty(draft.costume.usagePurpose)) {
      error('costumeUsagePurpose', '작업물 사용목적을 구체적으로 입력해주세요.')
    }
    if (draft.costume.workType === 'design') {
      if (draft.costume.design.designTier === null) {
        error('costumeDesignTier', '간단 디자인 또는 정식 디자인을 선택해주세요.')
      }
      if (!isNonEmpty(draft.costume.design.requestDescription)) {
        error('costumeDesignDescription', '필요한 디자인을 설명해주세요.')
      }
    }
    if (draft.costume.workType === 'production') {
      if (!isNonEmpty(draft.costume.production.requestDescription)) {
        error('costumeProductionDescription', '제작할 원본 의상 정보를 입력해주세요.')
      }
      if (!isValidUrl(draft.costume.production.referenceUrl)) {
        error('costumeReferenceUrl', '참고자료 링크 형식을 확인해주세요.')
      }
    }
  }

  function validateVideo(): void {
    if (draft.video.workType === null) {
      error('videoWorkType', '의뢰 작업유형을 선택해주세요.')
    }
    if (!isNonEmpty(draft.video.usagePurpose)) {
      error('videoUsagePurpose', '작업물 사용목적을 구체적으로 입력해주세요.')
    }
    if (videoWorkFamily.value === 'storyboard') {
      if (!isNonEmpty(draft.video.storyboard.requestDescription)) {
        error('videoStoryboardDescription', '만들고자 하는 영상을 설명해주세요.')
      }
    }
    if (videoWorkFamily.value === 'directing') {
      if (!isNonEmpty(draft.video.directing.requestDescription)) {
        error('videoDirectingDescription', '촬영 또는 감독 의뢰내용을 입력해주세요.')
      }
      if (draft.video.directing.shootingLocationState === null) {
        error('shootingLocationState', '촬영 장소 확정 여부를 선택해주세요.')
      }
      if (
        draft.video.directing.shootingLocationState === 'decided'
        && !isNonEmpty(draft.video.directing.shootingLocation)
      ) {
        error('shootingLocation', '정해진 촬영 장소를 입력해주세요.')
      }
      if (draft.video.directing.shootingScheduleState === null) {
        error('shootingScheduleState', '촬영 일정 확정 여부를 선택해주세요.')
      }
      if (
        draft.video.directing.shootingScheduleState === 'decided'
        && !isNonEmpty(draft.video.directing.shootingSchedule)
      ) {
        error('shootingSchedule', '정해진 촬영 일정을 입력해주세요.')
      }
    }
    if (videoWorkFamily.value === 'editing') {
      if (!isNonEmpty(draft.video.editing.requestDescription)) {
        error('videoEditingDescription', '편집하고자 하는 영상을 설명해주세요.')
      }
      if (!isValidUrl(draft.video.editing.editingReferenceUrl)) {
        error('editingReferenceUrl', '편집 레퍼런스 링크 형식을 확인해주세요.')
      }
      if (!isValidUrl(draft.video.editing.sourceDriveUrl)) {
        error('sourceDriveUrl', '영상 소스 링크 형식을 확인해주세요.')
      }
    }
  }

  function validateProjectPlanning(): void {
    if (draft.projectPlanning.projectType === null) {
      error('projectType', '프로젝트 유형을 선택해주세요.')
    }
    if (draft.projectPlanning.serviceType === null) {
      error('projectServiceType', '의뢰 작업유형을 선택해주세요.')
    }
    if (!isNonEmpty(draft.projectPlanning.projectDescription)) {
      error('projectDescription', '프로젝트에 대해 현재 정해진 내용을 입력해주세요.')
    }
    if (
      draft.projectPlanning.serviceType === 'advice-feedback'
      && !isNonEmpty(draft.projectPlanning.adviceFeedback.projectReferenceUrl)
    ) {
      error('projectReferenceUrl', '정리된 프로젝트 자료 링크를 입력해주세요.')
    }
    if (!isValidUrl(draft.projectPlanning.adviceFeedback.projectReferenceUrl)) {
      error('projectReferenceUrl', '프로젝트 자료 링크 형식을 확인해주세요.')
    }
    if (draft.projectPlanning.continuousFeedback === null) {
      error('continuousFeedback', '지속적인 피드백 추가 의뢰 여부를 선택해주세요.')
    }
  }

  function validateMixMaster(): void {
    if (!isNonEmpty(draft.mixMaster.usagePurpose)) {
      error('mixMasterUsagePurpose', '작업물 사용목적을 구체적으로 입력해주세요.')
    }
    if (draft.mixMaster.vocalFormation === null) {
      error('vocalFormation', '솔로, 듀엣, 단체 중 하나를 선택해주세요.')
    }
    if (draft.mixMaster.harmonyTrackPresence === null) {
      error('harmonyTrackPresence', '화음 트랙 유무를 선택해주세요.')
    }
    if (draft.mixMaster.isCoverSong === null) {
      error('isCoverSong', '커버곡 여부를 선택해주세요.')
    }
    if (draft.mixMaster.isCoverSong === 'yes') {
      if (!isNonEmpty(draft.mixMaster.coverSongTitle)) {
        error('coverSongTitle', '원곡 제목을 입력해주세요.')
      }
      if (!isNonEmpty(draft.mixMaster.coverSongDuration)) {
        error('coverSongDuration', '원곡 길이를 입력해주세요.')
      }
      if (!isValidUrl(draft.mixMaster.coverSongYoutubeUrl)) {
        error('coverSongYoutubeUrl', '원곡 유튜브 링크 형식을 확인해주세요.')
      }
    }
    if (!isNonEmpty(draft.mixMaster.requestDetails)) {
      error('mixMasterRequestDetails', '믹싱·마스터링 요청사항을 입력해주세요.')
    }
  }

  function validatePackage(): void {
    if (draft.package.packageType === null) {
      error('packageType', '패키지 유형을 선택해주세요.')
    }
    if (!isNonEmpty(draft.package.usagePurpose)) {
      error('packageUsagePurpose', '작업물 사용목적을 구체적으로 입력해주세요.')
    }
    if (draft.package.packageType === 'custom') {
      const anyWork = draft.package.workItems.some(item => isNonEmpty(item.label))
      if (!anyWork) {
        error('packageWorkItems', '필요한 작업 카테고리를 하나 이상 입력해주세요.')
      }
      if (draft.package.customSameProject === null) {
        error('customSameProject', '모든 작업이 하나의 프로젝트인지 선택해주세요.')
      }
    }
    for (const [index, item] of draft.package.deliverables.entries()) {
      if (!isNonEmpty(item.deliverable)) {
        error(`deliverable-${index}-name`, `작업물 ${index + 1}의 이름을 입력해주세요.`)
      }
      if (!isNonEmpty(item.finalForm)) {
        error(`deliverable-${index}-final`, `작업물 ${index + 1}의 최종형태를 입력해주세요.`)
      }
      if (!isNonEmpty(item.usageDate)) {
        error(`deliverable-${index}-usage`, `작업물 ${index + 1}의 사용일자를 입력해주세요.`)
      }
      if (!isNonEmpty(item.desiredDelivery)) {
        error(`deliverable-${index}-delivery`, `작업물 ${index + 1}의 희망 수령 시점을 입력해주세요.`)
      }
    }
    if (!isNonEmpty(draft.package.requestDescription)) {
      error('packageRequestDescription', '프로젝트와 의뢰내용을 전체적으로 정리해주세요.')
    }
    if (!isValidUrl(draft.package.referenceUrl)) {
      error('packageReferenceUrl', '참고자료 링크 형식을 확인해주세요.')
    }
  }

  function validate(): boolean {
    clearErrors()
    submissionState.value = 'validating'
    const categoryId = activeCategoryId.value
    if (categoryId === null) {
      error('category', '문의 카테고리를 선택해주세요.')
    } else {
      validateCommon(categoryId)
      switch (categoryId) {
        case 'choreography': validateChoreography(); break
        case 'composition': validateComposition(); break
        case 'costume': validateCostume(); break
        case 'video': validateVideo(); break
        case 'project-planning': validateProjectPlanning(); break
        case 'mix-master': validateMixMaster(); break
        case 'package': validatePackage(); break
      }
    }
    const valid = Object.keys(errors).length === 0
    submissionState.value = valid ? 'idle' : 'invalid'
    return valid
  }

  async function submit(): Promise<void> {
    if (submissionState.value === 'submitting' || submissionState.value === 'success') {
      return
    }
    if (!validate()) return
    if (activeCategoryId.value === null) return
    if (endpointState.status !== 'ready') {
      providerErrorKind.value = endpointState.status
      submissionState.value = 'error'
      return
    }

    submissionState.value = 'submitting'
    const payload = buildContactPayload(activeCategoryId.value, draft)
    const result = await submitContactToFormspree(endpointState.endpoint, payload)
    if (result.ok) {
      submissionState.value = 'success'
      providerErrorKind.value = null
      return
    }
    providerErrorKind.value = result.kind
    submissionState.value = 'error'
  }

  function setCategory(categoryId: ContactInquiryCategoryId): void {
    if (submissionState.value === 'success') return
    activeCategoryId.value = categoryId
    clearErrors()
    if (submissionState.value === 'invalid' || submissionState.value === 'error') {
      submissionState.value = 'idle'
    }
  }

  function addChoreographySong(): void {
    songSequence += 1
    draft.choreography.songs.push({
      id: `song-${songSequence}`,
      title: '',
      isOriginal: false,
      duration: '',
    })
  }

  function removeChoreographySong(index: number): void {
    if (draft.choreography.songs.length <= 1) return
    draft.choreography.songs.splice(index, 1)
  }

  function addPackageWorkItem(): void {
    packageWorkSequence += 1
    const item: PackageWorkItem = {
      id: `package-work-${packageWorkSequence}`,
      label: '',
      state: 'required',
    }
    draft.package.workItems.push(item)
  }

  function removePackageWorkItem(index: number): void {
    if (draft.package.workItems.length <= 1) return
    draft.package.workItems.splice(index, 1)
  }

  function addPackageDeliverable(): void {
    deliverableSequence += 1
    const item: PackageDeliverable = {
      id: `deliverable-${deliverableSequence}`,
      deliverable: '',
      finalForm: '',
      usageDate: '',
      desiredDelivery: '',
      note: '',
    }
    draft.package.deliverables.push(item)
  }

  function removePackageDeliverable(index: number): void {
    if (draft.package.deliverables.length <= 1) return
    draft.package.deliverables.splice(index, 1)
  }

  return {
    activeCategoryId,
    activeCategory,
    activePackage,
    customPackageQualification,
    draft,
    endpointState,
    errors,
    providerErrorKind,
    requiredCustomWorkCount,
    submissionState,
    videoWorkFamily,
    setCategory,
    submit,
    addChoreographySong,
    removeChoreographySong,
    addPackageWorkItem,
    removePackageWorkItem,
    addPackageDeliverable,
    removePackageDeliverable,
  }
}
