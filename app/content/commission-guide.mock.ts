import type {
  CommissionGuideContent,
} from '~~/shared/types/commission-guide'

export const COMMISSION_GUIDE_MOCK = {
  schemaVersion: 1,

  eyebrow: 'Commission Guide',
  title: '의뢰 안내',
  lead:
    '서비스별 작업 범위와 기본 견적 기준을 확인할 수 있습니다.',
  seoTitle: '의뢰 안내 | 매미: 著',
  seoDescription:
    '안무, 작사·작곡, 의상 디자인·제작, 영상감독, 프로젝트 기획, 믹싱·마스터링 의뢰 범위와 견적 기준을 안내합니다.',

  sectionHeading: '의뢰 분야',
  services: [
    {
      id: 'choreography',
      order: 10,
      enabled: true,
      label: '안무',
      summary: '곡과 무대의 흐름에 맞춘 안무 설계',
      description:
        '곡의 분위기와 무대 구성에 맞춰 안무 흐름과 주요 동선을 설계합니다.',
      price: {
        mode: 'quote',
        currency: 'KRW',
        minimumKrw: null,
        maximumKrw: null,
        unitLabel: null,
        displayLabel: '곡 길이와 참여 인원 확인 후 견적',
        note: '현재 목업 문구이며 실제 견적은 상담 후 확정됩니다.',
        mock: true,
      },
      includedItems: [
        '구성 방향 협의',
        '메인 동작 설계',
        '무대 동선 제안',
        '기본 수정',
      ],
      turnaroundLabel: '일정과 곡 길이 확인 후 협의',
      revisionLabel: '기본 수정 범위는 착수 전 협의',
      additionalCostNote:
        '인원 증가, 긴급 일정, 추가 촬영용 버전은 별도 비용이 발생할 수 있습니다.',
      inquiryLabel: '안무 의뢰 문의하기',
    },
    {
      id: 'lyrics-composition',
      order: 20,
      enabled: true,
      label: '작사/작곡',
      summary: '콘셉트와 사용 목적에 맞춘 음원 제작',
      description:
        '곡의 콘셉트와 사용 목적에 맞춰 작사, 작곡 또는 두 작업을 함께 진행합니다.',
      price: {
        mode: 'quote',
        currency: 'KRW',
        minimumKrw: null,
        maximumKrw: null,
        unitLabel: null,
        displayLabel: '작업 범위와 납품 형태 확인 후 견적',
        note: '현재 목업 문구이며 실제 견적은 상담 후 확정됩니다.',
        mock: true,
      },
      includedItems: [
        '콘셉트 협의',
        '가사 또는 곡 초안',
        '기본 수정',
        '최종 납품 파일',
      ],
      turnaroundLabel: '곡 구성과 작업 범위 확인 후 협의',
      revisionLabel: '초안 확인 뒤 기본 수정 범위 제공',
      additionalCostNote:
        '편곡, 가이드 녹음, 긴급 납기와 추가 버전은 별도 협의합니다.',
      inquiryLabel: '작사/작곡 의뢰 문의하기',
    },
    {
      id: 'costume-design-production',
      order: 30,
      enabled: true,
      label: '의상디자인 / 제작',
      summary: '무대와 촬영 콘셉트에 맞춘 의상 설계',
      description:
        '무대와 촬영 콘셉트에 맞춰 의상 방향을 정리하고 디자인 또는 제작 범위를 협의합니다.',
      price: {
        mode: 'quote',
        currency: 'KRW',
        minimumKrw: null,
        maximumKrw: null,
        unitLabel: null,
        displayLabel: '소재, 수량, 제작 방식 확인 후 견적',
        note: '현재 목업 문구이며 실제 견적은 상담 후 확정됩니다.',
        mock: true,
      },
      includedItems: [
        '디자인 방향 제안',
        '소재와 부자재 협의',
        '제작 범위 정리',
        '피팅 및 수정 조건 협의',
      ],
      turnaroundLabel: '수량과 소재 수급 일정 확인 후 협의',
      revisionLabel: '디자인 확정 전 수정 범위 협의',
      additionalCostNote:
        '특수 소재, 추가 피팅, 긴급 제작과 배송은 별도 비용이 발생할 수 있습니다.',
      inquiryLabel: '의상 의뢰 문의하기',
    },
    {
      id: 'video-direction',
      order: 40,
      enabled: true,
      label: '영상감독',
      summary: '촬영 목적에 맞춘 장면 구성과 현장 진행',
      description:
        '촬영 목적과 결과물의 톤에 맞춰 장면 구성, 현장 진행과 디렉션 방향을 설계합니다.',
      price: {
        mode: 'quote',
        currency: 'KRW',
        minimumKrw: null,
        maximumKrw: null,
        unitLabel: null,
        displayLabel: '촬영 시간, 장소와 장비 조건 확인 후 견적',
        note: '현재 목업 문구이며 실제 견적은 상담 후 확정됩니다.',
        mock: true,
      },
      includedItems: [
        '촬영 구성안',
        '현장 디렉션',
        '컷 진행 관리',
        '후반 작업 인계 정리',
      ],
      turnaroundLabel: '촬영일과 준비 범위 확인 후 협의',
      revisionLabel: '촬영 전 구성안 수정 범위 협의',
      additionalCostNote:
        '장거리 이동, 장비 대여, 추가 촬영과 긴급 일정은 별도 협의합니다.',
      inquiryLabel: '영상감독 의뢰 문의하기',
    },
    {
      id: 'project-planning',
      order: 50,
      enabled: true,
      label: '프로젝트 기획',
      summary: '목표, 일정과 역할을 연결하는 제작 구조 설계',
      description:
        '프로젝트의 목표와 일정, 참여자의 역할을 정리하고 실제 제작이 굴러갈 수 있는 흐름을 설계합니다.',
      price: {
        mode: 'quote',
        currency: 'KRW',
        minimumKrw: null,
        maximumKrw: null,
        unitLabel: null,
        displayLabel: '프로젝트 규모와 참여 범위 확인 후 견적',
        note: '현재 목업 문구이며 실제 견적은 상담 후 확정됩니다.',
        mock: true,
      },
      includedItems: [
        '기획 구조 정리',
        '일정 설계',
        '역할과 협업 흐름 정리',
        '진행 문서 구성',
      ],
      turnaroundLabel: '프로젝트 규모와 마감일 확인 후 협의',
      revisionLabel: '기획안 기준 기본 수정 범위 협의',
      additionalCostNote:
        '장기 운영, 현장 참여와 추가 문서 제작은 별도 범위로 산정합니다.',
      inquiryLabel: '프로젝트 기획 문의하기',
    },
    {
      id: 'mixing-mastering',
      order: 60,
      enabled: true,
      label: '믹싱 / 마스터링',
      summary: '음원 밸런스 정리와 최종 출력',
      description:
        '보컬과 반주의 밸런스를 정리하고 최종 사용 환경에 맞춰 음원을 출력합니다.',
      price: {
        mode: 'quote',
        currency: 'KRW',
        minimumKrw: null,
        maximumKrw: null,
        unitLabel: null,
        displayLabel: '트랙 수, 러닝타임과 수정 범위 확인 후 견적',
        note: '현재 목업 문구이며 실제 견적은 상담 후 확정됩니다.',
        mock: true,
      },
      includedItems: [
        '기본 믹싱',
        '음량과 밸런스 조정',
        '마스터 출력',
        '기본 수정',
      ],
      turnaroundLabel: '트랙 상태와 납기 확인 후 협의',
      revisionLabel: '기본 수정 범위는 납품 형식과 함께 협의',
      additionalCostNote:
        '트랙 정리, 피치 보정, 추가 출력 규격과 긴급 납기는 별도 비용이 발생할 수 있습니다.',
      inquiryLabel: '믹싱 / 마스터링 문의하기',
    },
  ],

  commonNoticeHeading: '공통 안내',
  commonNotices: [
    '최종 견적은 작업 분량, 일정, 사용 범위와 수정 횟수에 따라 달라질 수 있습니다.',
    '상업 이용, 긴급 일정, 원본 파일 제공과 추가 수정은 별도 비용이 발생할 수 있습니다.',
    '상세 일정과 납품 형식은 문의 접수 후 협의합니다.',
  ],

  worksLinkLabel: '전체 작업 보기',
  contactLinkLabel: '프로젝트 문의',
} as const satisfies CommissionGuideContent
