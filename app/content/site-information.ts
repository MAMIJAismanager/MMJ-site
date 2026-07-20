export interface ContactSurfaceContent {
  readonly eyebrow: string
  readonly title: string
  readonly lead: string
  readonly outboundHeading: string
  readonly outboundDescription: string
  readonly formLinkLabel: string
  readonly formUrl: string | null
  readonly unavailableMessage: string
  readonly worksLinkLabel: string
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
    eyebrow: 'Contact',
    title: '프로젝트 문의',
    lead:
      '협업 및 프로젝트 문의는 외부 Google Form을 통해 받습니다.',
    outboundHeading: '문의하기',
    outboundDescription:
      '링크를 열면 외부 Google Form으로 이동합니다. 이 사이트는 문의 내용을 직접 저장하거나 전송하지 않습니다.',
    formLinkLabel: 'Google Form에서 문의하기',
    formUrl: null,
    unavailableMessage:
      '문의 폼 주소가 아직 설정되지 않았습니다.',
    worksLinkLabel: '작업 먼저 보기',
  },
})
