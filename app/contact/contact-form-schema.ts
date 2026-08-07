export type ContactInquiryCategoryId =
  | 'choreography'
  | 'composition'
  | 'costume'
  | 'video'
  | 'project-planning'
  | 'mix-master'
  | 'package'

export type ContactFormSchemaId = ContactInquiryCategoryId

export type ContactSubmissionState =
  | 'idle'
  | 'validating'
  | 'invalid'
  | 'submitting'
  | 'success'
  | 'error'

export type PortfolioPermission =
  | 'allowed'
  | 'not-allowed'
  | 'embargo'

export type DeadlineMode = 'same' | 'different'

export interface ContactCommonDraft {
  applicantName: string
  kakaoTalkId: string
  desiredFinalDelivery: string
  deadlineMode: DeadlineMode | null
  deadline: string
  portfolioPermission: PortfolioPermission | null
  portfolioEmbargoCondition: string
  additionalMessage: string
}

export interface ChoreographySongEntry {
  id: string
  title: string
  isOriginal: boolean
  duration: string
}

export interface ChoreographyContactDraft {
  songs: ChoreographySongEntry[]
  participantCount: number | null
  usagePurpose: string
}

export interface CompositionContactDraft {
  usagePurpose: string
  lyricsPresence: 'none' | 'present' | null
  lyricWritingRequirement: 'required' | 'not-required' | null
  compositionScaleMode: 'specified' | 'unknown' | 'irrelevant' | null
  compositionScale: string
  requestedDuration: string
}

export interface CostumeContactDraft {
  workType: 'design' | 'production' | null
  usagePurpose: string
  design: {
    designTier: 'simple' | 'formal' | null
    requestDescription: string
  }
  production: {
    requestDescription: string
    referenceUrl: string
  }
}

export type VideoWorkType =
  | 'simple-storyboard'
  | 'storyboard-coaching'
  | 'shooting-director'
  | 'camera-director'
  | 'simple-editing'
  | 'advanced-editing'

export type VideoWorkFamily = 'storyboard' | 'directing' | 'editing'

export interface VideoContactDraft {
  workType: VideoWorkType | null
  usagePurpose: string
  storyboard: {
    requestDescription: string
  }
  directing: {
    requestDescription: string
    shootingLocationState: 'decided' | 'undecided' | null
    shootingLocation: string
    shootingScheduleState: 'decided' | 'undecided' | null
    shootingSchedule: string
  }
  editing: {
    requestDescription: string
    editingReferenceUrl: string
    sourceDriveUrl: string
  }
}

export interface ProjectPlanningContactDraft {
  projectType: 'one-off' | 'short-term' | 'long-term' | 'team-formation' | null
  serviceType: 'advice-feedback' | 'light-concept' | 'simple-planning' | null
  projectDescription: string
  adviceFeedback: {
    projectReferenceUrl: string
  }
  continuousFeedback: 'requested' | 'not-requested' | null
}

export interface MixMasterContactDraft {
  usagePurpose: string
  vocalFormation: 'solo' | 'duet' | 'group' | null
  harmonyTrackPresence: 'present' | 'absent' | null
  harmonyNote: string
  isCoverSong: 'yes' | 'no' | null
  coverSongTitle: string
  coverSongDuration: string
  coverSongYoutubeUrl: string
  requestDetails: string
}

export type PackageType =
  | 'original-song-full'
  | 'music-video-full'
  | 'custom'

export interface PackageWorkItem {
  id: string
  label: string
  state: 'required' | 'considering'
}

export interface PackageDeliverable {
  id: string
  deliverable: string
  finalForm: string
  usageDate: string
  desiredDelivery: string
  note: string
}

export interface PackageContactDraft {
  packageType: PackageType | null
  usagePurpose: string
  workItems: PackageWorkItem[]
  customSameProject: 'yes' | 'no' | null
  deliverables: PackageDeliverable[]
  requestDescription: string
  referenceUrl: string
}

export interface ContactFormDraft {
  common: ContactCommonDraft
  choreography: ChoreographyContactDraft
  composition: CompositionContactDraft
  costume: CostumeContactDraft
  video: VideoContactDraft
  projectPlanning: ProjectPlanningContactDraft
  mixMaster: MixMasterContactDraft
  package: PackageContactDraft
  honeypot: string
}

export interface ContactInquiryCategory {
  readonly id: ContactInquiryCategoryId
  readonly label: string
  readonly mailSubject: string
  readonly formSchemaId: ContactFormSchemaId
  readonly enabled: boolean
}

export type ContactPayload = Record<string, string>
