export interface ContactSurfaceContent {
  readonly seoTitle: string
  readonly seoDescription: string
  readonly eyebrow: string
  readonly title: string
  readonly lead: string
  readonly formHeading: string
  readonly formDescription: string
  readonly recipientEmail: string
  readonly recipientNotice: string
  readonly responseNotice: string
  readonly requiredNotice: string
  readonly packageNotice: string
  readonly submitLabel: string
  readonly submittingLabel: string
  readonly successHeading: string
  readonly successMessage: string
  readonly unavailableMessage: string
  readonly worksLinkLabel: string
  readonly worksLinkRoute: '/works'
}

export interface SiteInformation {
  readonly contact: ContactSurfaceContent
}

function deepFreeze<T>(value: T): T {
  if (
    value === null
    || typeof value !== 'object'
    || Object.isFrozen(value)
  ) {
    return value
  }

  for (const child of Object.values(
    value as Record<string, unknown>,
  )) {
    deepFreeze(child)
  }

  return Object.freeze(value)
}

export const SITE_INFORMATION: SiteInformation = deepFreeze({
  contact: {
    seoTitle: '프로젝트 문의 | 매미: 著',
    seoDescription:
      '협업과 프로젝트 문의를 위한 안내 및 문의 양식을 확인합니다.',
    eyebrow: 'Contact',
    title: '프로젝트 문의',
    lead:
      '안무, 작곡, 의상, 영상, 프로젝트 기획, 믹싱&마스터링 및 패키지 견적 문의를 받습니다.',
    formHeading: '견적 문의',
    formDescription:
      '문의 카테고리를 선택한 뒤 견적 산정에 필요한 필수 항목을 작성해주세요.',
    recipientEmail: 'm4m1ja@gmail.com',
    recipientNotice:
      '제출한 문의 내용은 m4m1ja@gmail.com 으로 전달됩니다.',
    responseNotice:
      '메일은 취침 시간을 제외하면 착신 즉시 확인하는 편이나 답신까지 시간이 걸릴 수 있습니다. 일반적으로 3시간 안에 답신드리며, 빠르면 약 30분, 늦으면 최대 2일이 걸릴 수 있습니다.',
    requiredNotice:
      '견적 문의에 정해진 자유서술 형식은 없지만, 카테고리별 필수 항목이 비어 있으면 대략적인 견적도 한 번에 산정하기 어렵습니다.',
    packageNotice:
      '여러 작업을 하나의 프로젝트로 함께 의뢰하려면 패키지 카테고리를 선택해주세요.',
    submitLabel: '견적 문의 보내기',
    submittingLabel: '문의 전송 중',
    successHeading: '문의가 접수되었습니다.',
    successMessage:
      '내용을 확인한 뒤 답변드리겠습니다.',
    unavailableMessage:
      '문의 전송 경로가 아직 연결되지 않았습니다.',
    worksLinkLabel: '작업 먼저 보기',
    worksLinkRoute: '/works',
  },
})
