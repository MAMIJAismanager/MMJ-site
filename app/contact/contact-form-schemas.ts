import type {
  PackageType,
  VideoWorkFamily,
  VideoWorkType,
} from './contact-form-schema'

export const PORTFOLIO_PERMISSION_OPTIONS = Object.freeze([
  { value: 'allowed', label: '허가' },
  { value: 'not-allowed', label: '비허가' },
  { value: 'embargo', label: '일정 기간 비공개 후 허가' },
] as const)

export const VIDEO_WORK_TYPES = Object.freeze([
  { id: 'simple-storyboard', label: '간단 콘티', family: 'storyboard' },
  { id: 'storyboard-coaching', label: '콘티+코칭', family: 'storyboard' },
  { id: 'shooting-director', label: '촬영현장 감독', family: 'directing' },
  { id: 'camera-director', label: '카메라 감독', family: 'directing' },
  { id: 'simple-editing', label: '간단 영상 편집', family: 'editing' },
  { id: 'advanced-editing', label: '고급 영상 편집', family: 'editing' },
] as const satisfies readonly {
  id: VideoWorkType
  label: string
  family: VideoWorkFamily
}[])

export function resolveVideoWorkFamily(
  workType: VideoWorkType | null,
): VideoWorkFamily | null {
  if (workType === null) return null
  return VIDEO_WORK_TYPES.find(item => item.id === workType)?.family ?? null
}

export const PROJECT_TYPES = Object.freeze([
  { value: 'one-off', label: '일회성' },
  { value: 'short-term', label: '단기' },
  { value: 'long-term', label: '장기' },
  { value: 'team-formation', label: '팀결성' },
] as const)

export const PROJECT_SERVICE_TYPES = Object.freeze([
  { value: 'advice-feedback', label: '조언피드백' },
  { value: 'light-concept', label: '간단 구상' },
  { value: 'simple-planning', label: '단순 기획' },
] as const)

export const MIX_MASTER_VOCAL_FORMATIONS = Object.freeze([
  { value: 'solo', label: '솔로' },
  { value: 'duet', label: '듀엣' },
  { value: 'group', label: '단체' },
] as const)

export interface ContactPackageDefinition {
  readonly id: PackageType
  readonly label: string
  readonly baseComposition: readonly string[]
  readonly recommendation: readonly string[]
  readonly discountRate: number
}

export const CONTACT_PACKAGE_DEFINITIONS = Object.freeze([
  {
    id: 'original-song-full',
    label: '오리지널곡 풀패키지',
    baseComposition: Object.freeze([
      '기본 프로듀싱',
      '작사/작곡',
      '믹싱/마스터링',
    ]),
    recommendation: Object.freeze(['버튜버', '지하돌']),
    discountRate: 0.05,
  },
  {
    id: 'music-video-full',
    label: '뮤직비디오 풀패키지',
    baseComposition: Object.freeze([
      '기본 프로듀싱',
      '영상 콘티/코칭',
      '촬영현장 감독',
      '카메라 감독',
      '영상 편집',
    ]),
    recommendation: Object.freeze(['지하돌', '코스어']),
    discountRate: 0.05,
  },
  {
    id: 'custom',
    label: '커스텀 패키지',
    baseComposition: Object.freeze([]),
    recommendation: Object.freeze([]),
    discountRate: 0.05,
  },
] as const satisfies readonly ContactPackageDefinition[])

export function findPackageDefinition(
  packageType: PackageType | null,
): ContactPackageDefinition | null {
  if (packageType === null) return null
  return CONTACT_PACKAGE_DEFINITIONS.find(item => item.id === packageType) ?? null
}
