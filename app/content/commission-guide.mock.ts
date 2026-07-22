import type {
  CommissionGuideContent,
} from '~~/shared/types/commission-guide'

export const COMMISSION_GUIDE_MOCK = {
  schemaVersion: 2,

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
        '곡의 길이와 참여 인원을 기준으로 한 안무 창작 기본 비용입니다.',
      pricing: {
        kind: 'matrix',
        title: '안무 창작 기본 가격표',
        description:
          '곡 길이와 참여 인원을 기준으로 한 기본 비용이며, 최종 금액은 작업 조건을 확인한 뒤 확정합니다.',
        currency: 'KRW',
        displayUnit: 'manwon',
        unitLabel: '만원 · 부가세 포함',
        rowAxisLabel: '참여 인원',
        columnAxisLabel: '곡 길이',
        columns: [
          {
            id: 'short-form-30s',
            order: 10,
            enabled: true,
            label: '숏폼 에디션',
            detailLabel: '30초 이하',
            shortLabel: '30초 이하',
          },
          {
            id: 'edited-half-1-2m',
            order: 20,
            enabled: true,
            label: '반절 정도로 편집된 곡',
            detailLabel: '1~2분 내외',
            shortLabel: '1~2분 내외',
          },
          {
            id: 'full-3m',
            order: 30,
            enabled: true,
            label: '풀곡',
            detailLabel: '3분 내외',
            shortLabel: '3분 내외',
          },
          {
            id: 'full-3m30-plus',
            order: 40,
            enabled: true,
            label: '풀곡',
            detailLabel: '3분 30초 이상',
            shortLabel: '3분 30초 이상',
          },
        ],
        rows: [
          {
            id: 'solo',
            order: 10,
            enabled: true,
            label: '1인',
            detailLabel: null,
          },
          {
            id: 'duo',
            order: 20,
            enabled: true,
            label: '2인',
            detailLabel: '동선 구성 포함',
          },
          {
            id: 'group-3-plus',
            order: 30,
            enabled: true,
            label: '3인 이상',
            detailLabel: '동선 구성 포함',
          },
        ],
        cells: [
          { rowId: 'solo', columnId: 'short-form-30s', mode: 'from', amountKrw: 20_000, displayOverride: null, note: null },
          { rowId: 'solo', columnId: 'edited-half-1-2m', mode: 'from', amountKrw: 50_000, displayOverride: null, note: null },
          { rowId: 'solo', columnId: 'full-3m', mode: 'from', amountKrw: 70_000, displayOverride: null, note: null },
          { rowId: 'solo', columnId: 'full-3m30-plus', mode: 'from', amountKrw: 90_000, displayOverride: null, note: null },
          { rowId: 'duo', columnId: 'short-form-30s', mode: 'from', amountKrw: 40_000, displayOverride: null, note: null },
          { rowId: 'duo', columnId: 'edited-half-1-2m', mode: 'from', amountKrw: 100_000, displayOverride: null, note: null },
          { rowId: 'duo', columnId: 'full-3m', mode: 'from', amountKrw: 140_000, displayOverride: null, note: null },
          { rowId: 'duo', columnId: 'full-3m30-plus', mode: 'from', amountKrw: 180_000, displayOverride: null, note: null },
          { rowId: 'group-3-plus', columnId: 'short-form-30s', mode: 'from', amountKrw: 50_000, displayOverride: null, note: null },
          { rowId: 'group-3-plus', columnId: 'edited-half-1-2m', mode: 'from', amountKrw: 120_000, displayOverride: null, note: null },
          { rowId: 'group-3-plus', columnId: 'full-3m', mode: 'from', amountKrw: 170_000, displayOverride: null, note: null },
          { rowId: 'group-3-plus', columnId: 'full-3m30-plus', mode: 'from', amountKrw: 220_000, displayOverride: null, note: null },
        ],
        footnote:
          '표의 금액은 기본 기준이며 용도, 마감 일정과 수정 범위에 따라 조정될 수 있습니다.',
        mock: true,
      },
      includedItems: [
        '구성 방향 협의',
        '메인 동작 설계',
        '2인 이상 동선 구성',
        '기본 수정',
      ],
      turnaroundLabel: '일정과 곡 길이 확인 후 협의',
      revisionLabel: '기본 수정 범위는 착수 전 협의',
      additionalCostNote:
        '용도, 긴급 일정과 협의 범위를 넘어서는 수정은 추가 비용이 발생할 수 있습니다.',
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
      pricing: {
        kind: 'quote',
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
      pricing: {
        kind: 'quote',
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
      pricing: {
        kind: 'quote',
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
      pricing: {
        kind: 'quote',
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
      pricing: {
        kind: 'quote',
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
  terms: [
    {
      id: 'final-price-after-consultation',
      order: 10,
      enabled: true,
      scope: 'global',
      serviceId: null,
      label: '모든 작업비용은 상의 후 최종 결정',
      description:
        '작업 범위와 일정, 사용 목적을 확인한 뒤 최종 견적을 안내합니다.',
      iconKey: 'consultation',
    },
    {
      id: 'formation-included-over-two',
      order: 20,
      enabled: true,
      scope: 'service',
      serviceId: 'choreography',
      label: '2인 이상은 동선 구성 작업 포함',
      description:
        '2인 이상 안무에는 기본 동선 구성 작업이 포함됩니다.',
      iconKey: 'people',
    },
    {
      id: 'vat-included',
      order: 30,
      enabled: true,
      scope: 'global',
      serviceId: null,
      label: '부가세 포함',
      description:
        '안내된 비용은 부가가치세를 포함한 금액입니다.',
      iconKey: 'receipt',
    },
    {
      id: 'usage-adjustment',
      order: 40,
      enabled: true,
      scope: 'global',
      serviceId: null,
      label: '용도에 따라 기본가에서 조정 가능',
      description:
        '상업 사용, 광고, 행사 등 사용 범위에 따라 조정될 수 있습니다.',
      iconKey: 'adjustment',
    },
    {
      id: 'rush-fee',
      order: 50,
      enabled: true,
      scope: 'global',
      serviceId: null,
      label: '빠른 마감 추가금 발생',
      description:
        '일반 작업 일정보다 빠른 납기를 요청할 경우 추가 비용이 발생합니다.',
      iconKey: 'deadline',
    },
    {
      id: 'excessive-revision-fee',
      order: 60,
      enabled: true,
      scope: 'global',
      serviceId: null,
      label: '지나친 수정 요청 시 추가금 발생',
      description:
        '협의된 수정 범위를 넘어서는 반복 수정에는 추가 비용이 발생합니다.',
      iconKey: 'revision',
    },
  ],

  worksLinkLabel: '전체 작업 보기',
  contactLinkLabel: '프로젝트 문의',
} as const satisfies CommissionGuideContent
