import type {
  ContactInquiryCategory,
  ContactInquiryCategoryId,
} from './contact-form-schema'

export const CONTACT_INQUIRY_CATEGORIES = Object.freeze([
  {
    id: 'choreography',
    label: '안무',
    mailSubject: '안무창작 견적 문의',
    formSchemaId: 'choreography',
    enabled: true,
  },
  {
    id: 'composition',
    label: '작곡',
    mailSubject: '작곡 견적 문의',
    formSchemaId: 'composition',
    enabled: true,
  },
  {
    id: 'costume',
    label: '의상',
    mailSubject: '의상디자인 견적 문의',
    formSchemaId: 'costume',
    enabled: true,
  },
  {
    id: 'video',
    label: '영상',
    mailSubject: '영상편집 견적 문의',
    formSchemaId: 'video',
    enabled: true,
  },
  {
    id: 'project-planning',
    label: '프로젝트 기획',
    mailSubject: '프로젝트 기획 견적 문의',
    formSchemaId: 'project-planning',
    enabled: true,
  },
  {
    id: 'mix-master',
    label: '믹싱&마스터링',
    mailSubject: '믹싱&마스터링 견적 문의',
    formSchemaId: 'mix-master',
    enabled: true,
  },
  {
    id: 'package',
    label: '패키지',
    mailSubject: '패키지 견적 문의',
    formSchemaId: 'package',
    enabled: true,
  },
] as const satisfies readonly ContactInquiryCategory[])

export function findContactInquiryCategory(
  id: ContactInquiryCategoryId | null,
): ContactInquiryCategory | null {
  if (id === null) return null
  return CONTACT_INQUIRY_CATEGORIES.find(item => item.id === id) ?? null
}
