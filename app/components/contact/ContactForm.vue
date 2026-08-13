<script setup lang="ts">
import ContactCategorySelector from '~/components/contact/ContactCategorySelector.vue'
import {
  CONTACT_PACKAGE_DEFINITIONS,
  MIX_MASTER_VOCAL_FORMATIONS,
  PORTFOLIO_PERMISSION_OPTIONS,
  PROJECT_SERVICE_TYPES,
  PROJECT_TYPES,
  VIDEO_WORK_TYPES,
} from '~/contact/contact-form-schemas'
import type { ContactInquiryCategoryId } from '~/contact/contact-form-schema'
import type { ContactSurfaceContent } from '~/content/site-information'
import { useContactForm } from '~/composables/useContactForm'

interface Props {
  readonly content: ContactSurfaceContent
}

defineProps<Props>()

const {
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
} = useContactForm()

function updateCategory(value: ContactInquiryCategoryId): void {
  setCategory(value)
}

function providerMessage(): string {
  switch (providerErrorKind.value) {
    case 'rate-limit':
      return '요청이 너무 빠르게 반복되었습니다. 잠시 후 다시 시도해주세요.'
    case 'unconfigured':
    case 'invalid':
      return '문의 전송 경로가 아직 연결되지 않았습니다.'
    default:
      return '문의 전송에 실패했습니다. 잠시 후 다시 시도해주세요.'
  }
}
</script>

<template>
  <div
    class="mm-contact-form"
    data-mm-contact-form
    :data-mm-contact-submission-state="submissionState"
    :data-mm-contact-endpoint-state="endpointState.status"
  >
    <div class="mm-contact-form__notice" data-mm-contact-common-notice>
      <p>{{ content.recipientNotice }}</p>
      <p>{{ content.responseNotice }}</p>
      <p>{{ content.requiredNotice }}</p>
      <p>{{ content.packageNotice }}</p>
    </div>

    <form
      novalidate
      @submit.prevent="submit"
    >
      <ContactCategorySelector
        :model-value="activeCategoryId"
        @update:model-value="updateCategory"
      />

      <p
        v-if="errors.category"
        class="mm-contact-form__error"
        role="alert"
      >
        {{ errors.category }}
      </p>

      <template v-if="submissionState === 'success'">
        <section
          class="mm-contact-form__status mm-contact-form__status--success"
          role="status"
          aria-live="polite"
          tabindex="-1"
          data-mm-contact-success
        >
          <h3>{{ content.successHeading }}</h3>
          <p>{{ content.successMessage }}</p>
        </section>
      </template>

      <template v-else-if="activeCategory !== null">
        <p class="mm-contact-form__subject" data-mm-contact-subject-preview>
          <span>메일 제목</span>
          <strong>{{ activeCategory.mailSubject }}</strong>
        </p>

        <section class="mm-contact-form__section" data-mm-contact-common-fields>
          <h3 class="mm-contact-form__section-title">기본 정보</h3>

          <div class="mm-contact-form__grid mm-contact-form__grid--two">
            <label class="mm-contact-form__field">
              <span class="mm-contact-form__label">신청자명 *</span>
              <span class="mm-contact-form__help">닉네임으로 작성하셔도 됩니다.</span>
              <input
                v-model="draft.common.applicantName"
                name="applicant_name"
                type="text"
                autocomplete="name"
                :aria-invalid="errors.applicantName ? 'true' : 'false'"
              >
              <span v-if="errors.applicantName" class="mm-contact-form__error">
                {{ errors.applicantName }}
              </span>
            </label>

            <label class="mm-contact-form__field">
              <span class="mm-contact-form__label">신청자 카카오톡 아이디 *</span>
              <input
                v-model="draft.common.kakaoTalkId"
                name="kakao_talk_id"
                type="text"
                autocomplete="off"
                :aria-invalid="errors.kakaoTalkId ? 'true' : 'false'"
              >
              <span v-if="errors.kakaoTalkId" class="mm-contact-form__error">
                {{ errors.kakaoTalkId }}
              </span>
            </label>
          </div>

          <template v-if="activeCategoryId !== 'package'">
            <label class="mm-contact-form__field">
              <span class="mm-contact-form__label">최종 작업물을 받고 싶은 날짜 *</span>
              <span class="mm-contact-form__help">
                1차 작업본이 아닌 최종 작업물을 기준으로 작성해주세요.
              </span>
              <input
                v-model="draft.common.desiredFinalDelivery"
                name="desired_final_delivery"
                type="text"
                placeholder="예: 10월 20일, 2026-10-20"
                :aria-invalid="errors.desiredFinalDelivery ? 'true' : 'false'"
              >
              <span v-if="errors.desiredFinalDelivery" class="mm-contact-form__error">
                {{ errors.desiredFinalDelivery }}
              </span>
            </label>

            <fieldset class="mm-contact-form__fieldset">
              <legend class="mm-contact-form__legend">별도 데드라인이 있나요? *</legend>
              <div class="mm-contact-form__inline-choices">
                <label class="mm-contact-form__choice">
                  <input
                    v-model="draft.common.deadlineMode"
                    type="radio"
                    name="deadline_mode"
                    value="same"
                  >
                  <span>받고 싶은 날짜와 동일</span>
                </label>
                <label class="mm-contact-form__choice">
                  <input
                    v-model="draft.common.deadlineMode"
                    type="radio"
                    name="deadline_mode"
                    value="different"
                  >
                  <span>별도 데드라인 있음</span>
                </label>
              </div>
              <p v-if="errors.deadlineMode" class="mm-contact-form__error">
                {{ errors.deadlineMode }}
              </p>
            </fieldset>

            <label
              v-if="draft.common.deadlineMode === 'different'"
              class="mm-contact-form__field"
            >
              <span class="mm-contact-form__label">별도 데드라인 *</span>
              <input
                v-model="draft.common.deadline"
                name="deadline"
                type="text"
                placeholder="예: 10월 25일 행사 전"
                :aria-invalid="errors.deadline ? 'true' : 'false'"
              >
              <span v-if="errors.deadline" class="mm-contact-form__error">
                {{ errors.deadline }}
              </span>
            </label>
          </template>

          <fieldset
            class="mm-contact-form__fieldset"
            data-mm-portfolio-permission
          >
            <legend class="mm-contact-form__legend">
              최종 작업물 포트폴리오 사용 허가 여부 *
            </legend>
            <div class="mm-contact-form__choice-grid mm-contact-form__choice-grid--portfolio">
              <label
                v-for="option in PORTFOLIO_PERMISSION_OPTIONS"
                :key="option.value"
                class="mm-contact-form__choice"
              >
                <input
                  v-model="draft.common.portfolioPermission"
                  type="radio"
                  name="portfolio_permission"
                  :value="option.value"
                >
                <span>{{ option.label }}</span>
              </label>
            </div>
            <p v-if="errors.portfolioPermission" class="mm-contact-form__error">
              {{ errors.portfolioPermission }}
            </p>
          </fieldset>

          <label
            v-if="draft.common.portfolioPermission === 'embargo'"
            class="mm-contact-form__field"
          >
            <span class="mm-contact-form__label">포트폴리오 공개 가능 시점 또는 조건 *</span>
            <input
              v-model="draft.common.portfolioEmbargoCondition"
              name="portfolio_embargo_condition"
              type="text"
              placeholder="예: 2026년 12월 이후 공개 가능"
              :aria-invalid="errors.portfolioEmbargoCondition ? 'true' : 'false'"
            >
            <span v-if="errors.portfolioEmbargoCondition" class="mm-contact-form__error">
              {{ errors.portfolioEmbargoCondition }}
            </span>
          </label>
        </section>

        <section
          v-if="activeCategoryId === 'choreography'"
          class="mm-contact-form__section"
          data-mm-contact-schema="choreography"
        >
          <h3 class="mm-contact-form__section-title">안무 정보</h3>

          <div class="mm-contact-form__repeat-list">
            <fieldset
              v-for="(song, index) in draft.choreography.songs"
              :key="song.id"
              class="mm-contact-form__repeat-card"
            >
              <legend>곡 {{ index + 1 }}</legend>
              <label class="mm-contact-form__field">
                <span class="mm-contact-form__label">안무가 필요한 곡명 *</span>
                <input v-model="song.title" type="text" :name="`song_${index + 1}_title`">
                <span v-if="errors[`song-${index}-title`]" class="mm-contact-form__error">
                  {{ errors[`song-${index}-title`] }}
                </span>
              </label>
              <label class="mm-contact-form__check">
                <input v-model="song.isOriginal" type="checkbox">
                <span>오리지널곡</span>
              </label>
              <label class="mm-contact-form__field">
                <span class="mm-contact-form__label">곡의 총 길이 *</span>
                <input v-model="song.duration" type="text" :name="`song_${index + 1}_duration`" placeholder="예: 3:20">
                <span v-if="errors[`song-${index}-duration`]" class="mm-contact-form__error">
                  {{ errors[`song-${index}-duration`] }}
                </span>
              </label>
              <button
                v-if="draft.choreography.songs.length > 1"
                class="mm-contact-form__minor-button"
                type="button"
                @click="removeChoreographySong(index)"
              >
                이 곡 삭제
              </button>
            </fieldset>
          </div>

          <button class="mm-contact-form__minor-button" type="button" @click="addChoreographySong">
            + 곡 추가
          </button>

          <label class="mm-contact-form__field">
            <span class="mm-contact-form__label">안무에 참여하는 총 인원수 *</span>
            <input v-model.number="draft.choreography.participantCount" type="number" min="1" step="1" name="participant_count">
            <span v-if="errors.participantCount" class="mm-contact-form__error">{{ errors.participantCount }}</span>
          </label>

          <label class="mm-contact-form__field">
            <span class="mm-contact-form__label">작업물 사용목적 *</span>
            <span class="mm-contact-form__help">
              '상업용', '비상업용'처럼 넓은 표현보다 실제 사용처를 구체적으로 작성해주세요. 예: 서브컬쳐 행사 무대 이벤트용, 유튜브 업로드 영상 촬영용, 지하돌 오리지널곡 전용 안무.
            </span>
            <textarea v-model="draft.choreography.usagePurpose" name="usage_purpose" rows="5"></textarea>
            <span v-if="errors.choreographyUsagePurpose" class="mm-contact-form__error">{{ errors.choreographyUsagePurpose }}</span>
          </label>
        </section>

        <section
          v-if="activeCategoryId === 'composition'"
          class="mm-contact-form__section"
          data-mm-contact-schema="composition"
        >
          <h3 class="mm-contact-form__section-title">작곡 정보</h3>

          <label class="mm-contact-form__field">
            <span class="mm-contact-form__label">작업물 사용목적 *</span>
            <span class="mm-contact-form__help">예: 자캐커뮤니티 로그용, 자캐 테마곡, 개인 앨범 발매용, 버튜버 오리지널곡.</span>
            <textarea v-model="draft.composition.usagePurpose" rows="5"></textarea>
            <span v-if="errors.compositionUsagePurpose" class="mm-contact-form__error">{{ errors.compositionUsagePurpose }}</span>
          </label>

          <fieldset class="mm-contact-form__fieldset">
            <legend class="mm-contact-form__legend">가사가 있나요? *</legend>
            <div class="mm-contact-form__inline-choices">
              <label class="mm-contact-form__choice"><input v-model="draft.composition.lyricsPresence" type="radio" name="lyrics_presence" value="none"><span>없음</span></label>
              <label class="mm-contact-form__choice"><input v-model="draft.composition.lyricsPresence" type="radio" name="lyrics_presence" value="present"><span>있음</span></label>
            </div>
            <p v-if="errors.lyricsPresence" class="mm-contact-form__error">{{ errors.lyricsPresence }}</p>
          </fieldset>

          <fieldset v-if="draft.composition.lyricsPresence === 'present'" class="mm-contact-form__fieldset">
            <legend class="mm-contact-form__legend">작사가 필요한가요? *</legend>
            <div class="mm-contact-form__inline-choices">
              <label class="mm-contact-form__choice"><input v-model="draft.composition.lyricWritingRequirement" type="radio" name="lyric_writing_requirement" value="required"><span>작사 필요</span></label>
              <label class="mm-contact-form__choice"><input v-model="draft.composition.lyricWritingRequirement" type="radio" name="lyric_writing_requirement" value="not-required"><span>작사 불필요</span></label>
            </div>
            <p v-if="errors.lyricWritingRequirement" class="mm-contact-form__error">{{ errors.lyricWritingRequirement }}</p>
          </fieldset>

          <fieldset class="mm-contact-form__fieldset">
            <legend class="mm-contact-form__legend">곡의 유형과 규모 *</legend>
            <span class="mm-contact-form__help">의뢰 안내 페이지를 참고해 작성해주세요. 예: 악기 10개 이하의 일반 테마곡. 모르거나 무관하면 그대로 선택할 수 있습니다.</span>
            <div class="mm-contact-form__inline-choices">
              <label class="mm-contact-form__choice"><input v-model="draft.composition.compositionScaleMode" type="radio" name="composition_scale_mode" value="specified"><span>직접 작성</span></label>
              <label class="mm-contact-form__choice"><input v-model="draft.composition.compositionScaleMode" type="radio" name="composition_scale_mode" value="unknown"><span>잘 모르겠음</span></label>
              <label class="mm-contact-form__choice"><input v-model="draft.composition.compositionScaleMode" type="radio" name="composition_scale_mode" value="irrelevant"><span>무관</span></label>
            </div>
            <p v-if="errors.compositionScaleMode" class="mm-contact-form__error">{{ errors.compositionScaleMode }}</p>
          </fieldset>

          <label v-if="draft.composition.compositionScaleMode === 'specified'" class="mm-contact-form__field">
            <span class="mm-contact-form__label">곡의 유형과 규모 *</span>
            <input v-model="draft.composition.compositionScale" type="text" name="composition_scale">
            <span v-if="errors.compositionScale" class="mm-contact-form__error">{{ errors.compositionScale }}</span>
          </label>

          <label class="mm-contact-form__field">
            <span class="mm-contact-form__label">원하는 곡의 길이 *</span>
            <span class="mm-contact-form__help">정확하지 않아도 괜찮습니다. 예: 3분 미만, 약 2분.</span>
            <input v-model="draft.composition.requestedDuration" type="text" name="requested_duration">
            <span v-if="errors.requestedDuration" class="mm-contact-form__error">{{ errors.requestedDuration }}</span>
          </label>
        </section>

        <section
          v-if="activeCategoryId === 'costume'"
          class="mm-contact-form__section"
          data-mm-contact-schema="costume"
        >
          <h3 class="mm-contact-form__section-title">의상 정보</h3>
          <fieldset class="mm-contact-form__fieldset">
            <legend class="mm-contact-form__legend">의뢰하고자 하는 작업유형 *</legend>
            <div class="mm-contact-form__inline-choices">
              <label class="mm-contact-form__choice"><input v-model="draft.costume.workType" type="radio" name="costume_work_type" value="design"><span>디자인</span></label>
              <label class="mm-contact-form__choice"><input v-model="draft.costume.workType" type="radio" name="costume_work_type" value="production"><span>제작</span></label>
            </div>
            <p v-if="errors.costumeWorkType" class="mm-contact-form__error">{{ errors.costumeWorkType }}</p>
          </fieldset>

          <fieldset v-if="draft.costume.workType === 'design'" class="mm-contact-form__fieldset">
            <legend class="mm-contact-form__legend">디자인 유형 *</legend>
            <div class="mm-contact-form__inline-choices">
              <label class="mm-contact-form__choice"><input v-model="draft.costume.design.designTier" type="radio" name="costume_design_tier" value="simple"><span>간단 디자인</span></label>
              <label class="mm-contact-form__choice"><input v-model="draft.costume.design.designTier" type="radio" name="costume_design_tier" value="formal"><span>정식 디자인</span></label>
            </div>
            <p v-if="errors.costumeDesignTier" class="mm-contact-form__error">{{ errors.costumeDesignTier }}</p>
          </fieldset>

          <label class="mm-contact-form__field">
            <span class="mm-contact-form__label">작업물 사용목적 *</span>
            <span class="mm-contact-form__help">예: 자캐커뮤니티에서 사용할 캐릭터 의상, 코스프레, 상업용 1차 창작 캐릭터 오리지널 룩.</span>
            <textarea v-model="draft.costume.usagePurpose" rows="5"></textarea>
            <span v-if="errors.costumeUsagePurpose" class="mm-contact-form__error">{{ errors.costumeUsagePurpose }}</span>
          </label>

          <label v-if="draft.costume.workType === 'design'" class="mm-contact-form__field">
            <span class="mm-contact-form__label">필요한 디자인에 대해 알려주세요 *</span>
            <span class="mm-contact-form__help">간략하게 설명해도 되고 자세해도 괜찮습니다.</span>
            <textarea v-model="draft.costume.design.requestDescription" rows="6"></textarea>
            <span v-if="errors.costumeDesignDescription" class="mm-contact-form__error">{{ errors.costumeDesignDescription }}</span>
          </label>

          <template v-if="draft.costume.workType === 'production'">
            <label class="mm-contact-form__field">
              <span class="mm-contact-form__label">제작할 원본 의상에 대해 알려주세요 *</span>
              <textarea v-model="draft.costume.production.requestDescription" rows="6"></textarea>
              <span v-if="errors.costumeProductionDescription" class="mm-contact-form__error">{{ errors.costumeProductionDescription }}</span>
            </label>
            <label class="mm-contact-form__field">
              <span class="mm-contact-form__label">참고자료 링크</span>
              <span class="mm-contact-form__help">참고사진이나 자료를 볼 수 있는 링크가 있다면 입력해주세요. R1에서는 파일 직접 첨부는 지원하지 않습니다.</span>
              <input v-model="draft.costume.production.referenceUrl" type="url" name="costume_reference_url">
              <span v-if="errors.costumeReferenceUrl" class="mm-contact-form__error">{{ errors.costumeReferenceUrl }}</span>
            </label>
          </template>
        </section>

        <section
          v-if="activeCategoryId === 'video'"
          class="mm-contact-form__section"
          data-mm-contact-schema="video"
        >
          <h3 class="mm-contact-form__section-title">영상 정보</h3>
          <fieldset class="mm-contact-form__fieldset">
            <legend class="mm-contact-form__legend">의뢰하고자 하는 작업유형 *</legend>
            <div class="mm-contact-form__choice-grid">
              <label v-for="option in VIDEO_WORK_TYPES" :key="option.id" class="mm-contact-form__choice">
                <input v-model="draft.video.workType" type="radio" name="video_work_type" :value="option.id">
                <span>{{ option.label }}</span>
              </label>
            </div>
            <p v-if="errors.videoWorkType" class="mm-contact-form__error">{{ errors.videoWorkType }}</p>
          </fieldset>

          <label class="mm-contact-form__field">
            <span class="mm-contact-form__label">작업물 사용목적 *</span>
            <span class="mm-contact-form__help">예: 동인 행사 홍보 목적의 영상, 코스프레 PV, 오리지널 뮤직비디오, 자캐커뮤니티 업로드용 로그.</span>
            <textarea v-model="draft.video.usagePurpose" rows="5"></textarea>
            <span v-if="errors.videoUsagePurpose" class="mm-contact-form__error">{{ errors.videoUsagePurpose }}</span>
          </label>

          <label v-if="videoWorkFamily === 'storyboard'" class="mm-contact-form__field">
            <span class="mm-contact-form__label">만들고자 하는 영상에 대해 알려주세요 *</span>
            <span class="mm-contact-form__help">간략하게 설명해도 되고 자세해도 괜찮습니다.</span>
            <textarea v-model="draft.video.storyboard.requestDescription" rows="6"></textarea>
            <span v-if="errors.videoStoryboardDescription" class="mm-contact-form__error">{{ errors.videoStoryboardDescription }}</span>
          </label>

          <template v-if="videoWorkFamily === 'directing'">
            <label class="mm-contact-form__field">
              <span class="mm-contact-form__label">촬영 또는 감독 의뢰내용 *</span>
              <textarea v-model="draft.video.directing.requestDescription" rows="6"></textarea>
              <span v-if="errors.videoDirectingDescription" class="mm-contact-form__error">{{ errors.videoDirectingDescription }}</span>
            </label>

            <fieldset class="mm-contact-form__fieldset">
              <legend class="mm-contact-form__legend">촬영 장소가 정해져 있나요? *</legend>
              <div class="mm-contact-form__inline-choices">
                <label class="mm-contact-form__choice"><input v-model="draft.video.directing.shootingLocationState" type="radio" name="shooting_location_state" value="decided"><span>정해져 있음</span></label>
                <label class="mm-contact-form__choice"><input v-model="draft.video.directing.shootingLocationState" type="radio" name="shooting_location_state" value="undecided"><span>아직 정해지지 않음</span></label>
              </div>
              <p v-if="errors.shootingLocationState" class="mm-contact-form__error">{{ errors.shootingLocationState }}</p>
            </fieldset>
            <label v-if="draft.video.directing.shootingLocationState === 'decided'" class="mm-contact-form__field">
              <span class="mm-contact-form__label">촬영 장소 *</span>
              <input v-model="draft.video.directing.shootingLocation" type="text">
              <span v-if="errors.shootingLocation" class="mm-contact-form__error">{{ errors.shootingLocation }}</span>
            </label>

            <fieldset class="mm-contact-form__fieldset">
              <legend class="mm-contact-form__legend">촬영 일정이 정해져 있나요? *</legend>
              <div class="mm-contact-form__inline-choices">
                <label class="mm-contact-form__choice"><input v-model="draft.video.directing.shootingScheduleState" type="radio" name="shooting_schedule_state" value="decided"><span>정해져 있음</span></label>
                <label class="mm-contact-form__choice"><input v-model="draft.video.directing.shootingScheduleState" type="radio" name="shooting_schedule_state" value="undecided"><span>아직 정해지지 않음</span></label>
              </div>
              <p v-if="errors.shootingScheduleState" class="mm-contact-form__error">{{ errors.shootingScheduleState }}</p>
            </fieldset>
            <label v-if="draft.video.directing.shootingScheduleState === 'decided'" class="mm-contact-form__field">
              <span class="mm-contact-form__label">촬영 일정 *</span>
              <input v-model="draft.video.directing.shootingSchedule" type="text">
              <span v-if="errors.shootingSchedule" class="mm-contact-form__error">{{ errors.shootingSchedule }}</span>
            </label>
          </template>

          <template v-if="videoWorkFamily === 'editing'">
            <label class="mm-contact-form__field">
              <span class="mm-contact-form__label">편집하고자 하는 영상에 대해 알려주세요 *</span>
              <textarea v-model="draft.video.editing.requestDescription" rows="6"></textarea>
              <span v-if="errors.videoEditingDescription" class="mm-contact-form__error">{{ errors.videoEditingDescription }}</span>
            </label>
            <label class="mm-contact-form__field">
              <span class="mm-contact-form__label">편집 레퍼런스 링크</span>
              <span class="mm-contact-form__help">추구하는 편집 방향과 비슷한 영상이 있다면 입력해주세요.</span>
              <input v-model="draft.video.editing.editingReferenceUrl" type="url">
              <span v-if="errors.editingReferenceUrl" class="mm-contact-form__error">{{ errors.editingReferenceUrl }}</span>
            </label>
            <label class="mm-contact-form__field">
              <span class="mm-contact-form__label">영상 소스 링크</span>
              <span class="mm-contact-form__help">편집할 소스를 모아둔 Drive 등의 링크가 있다면 입력해주세요.</span>
              <input v-model="draft.video.editing.sourceDriveUrl" type="url">
              <span v-if="errors.sourceDriveUrl" class="mm-contact-form__error">{{ errors.sourceDriveUrl }}</span>
            </label>
          </template>
        </section>

        <section
          v-if="activeCategoryId === 'project-planning'"
          class="mm-contact-form__section"
          data-mm-contact-schema="project-planning"
        >
          <h3 class="mm-contact-form__section-title">프로젝트 기획 정보</h3>
          <fieldset class="mm-contact-form__fieldset">
            <legend class="mm-contact-form__legend">진행하고자 하는 프로젝트의 유형 *</legend>
            <div class="mm-contact-form__inline-choices">
              <label v-for="option in PROJECT_TYPES" :key="option.value" class="mm-contact-form__choice">
                <input v-model="draft.projectPlanning.projectType" type="radio" name="project_type" :value="option.value">
                <span>{{ option.label }}</span>
              </label>
            </div>
            <p v-if="errors.projectType" class="mm-contact-form__error">{{ errors.projectType }}</p>
          </fieldset>

          <fieldset class="mm-contact-form__fieldset">
            <legend class="mm-contact-form__legend">의뢰하고자 하는 작업유형 *</legend>
            <div class="mm-contact-form__inline-choices">
              <label v-for="option in PROJECT_SERVICE_TYPES" :key="option.value" class="mm-contact-form__choice">
                <input v-model="draft.projectPlanning.serviceType" type="radio" name="planning_service_type" :value="option.value">
                <span>{{ option.label }}</span>
              </label>
            </div>
            <p v-if="errors.projectServiceType" class="mm-contact-form__error">{{ errors.projectServiceType }}</p>
          </fieldset>

          <label class="mm-contact-form__field">
            <span class="mm-contact-form__label">진행하고자 하는 프로젝트에 대해 알려주세요 *</span>
            <span class="mm-contact-form__help">현재 정해진 만큼 작성해주세요. 공개 일정이나 예정된 절차가 있다면 함께 적어주세요.</span>
            <textarea v-model="draft.projectPlanning.projectDescription" rows="7"></textarea>
            <span v-if="errors.projectDescription" class="mm-contact-form__error">{{ errors.projectDescription }}</span>
          </label>

          <label v-if="draft.projectPlanning.serviceType === 'advice-feedback'" class="mm-contact-form__field">
            <span class="mm-contact-form__label">정리된 프로젝트 자료 링크 *</span>
            <span class="mm-contact-form__help">조언 및 피드백 요청은 프로젝트에 대해 완전히 정리된 자료가 필요합니다. R1에서는 파일 직접 첨부 대신 링크를 입력해주세요.</span>
            <input v-model="draft.projectPlanning.adviceFeedback.projectReferenceUrl" type="url">
            <span v-if="errors.projectReferenceUrl" class="mm-contact-form__error">{{ errors.projectReferenceUrl }}</span>
          </label>

          <fieldset class="mm-contact-form__fieldset">
            <legend class="mm-contact-form__legend">지속적인 피드백을 추가로 의뢰하시겠습니까? *</legend>
            <div class="mm-contact-form__inline-choices">
              <label class="mm-contact-form__choice"><input v-model="draft.projectPlanning.continuousFeedback" type="radio" name="continuous_feedback" value="requested"><span>추가 의뢰함</span></label>
              <label class="mm-contact-form__choice"><input v-model="draft.projectPlanning.continuousFeedback" type="radio" name="continuous_feedback" value="not-requested"><span>추가 의뢰하지 않음</span></label>
            </div>
            <p v-if="errors.continuousFeedback" class="mm-contact-form__error">{{ errors.continuousFeedback }}</p>
          </fieldset>
        </section>

        <section
          v-if="activeCategoryId === 'mix-master'"
          class="mm-contact-form__section"
          data-mm-contact-schema="mix-master"
        >
          <h3 class="mm-contact-form__section-title">믹싱&마스터링 정보</h3>
          <label class="mm-contact-form__field">
            <span class="mm-contact-form__label">작업물 사용목적 *</span>
            <span class="mm-contact-form__help">예: 지인에게 선물용, 자캐 테마곡, 상업 앨범 발매용, 지하돌 오리지널곡.</span>
            <textarea v-model="draft.mixMaster.usagePurpose" rows="5"></textarea>
            <span v-if="errors.mixMasterUsagePurpose" class="mm-contact-form__error">{{ errors.mixMasterUsagePurpose }}</span>
          </label>

          <fieldset class="mm-contact-form__fieldset">
            <legend class="mm-contact-form__legend">인원수 *</legend>
            <div class="mm-contact-form__inline-choices">
              <label v-for="option in MIX_MASTER_VOCAL_FORMATIONS" :key="option.value" class="mm-contact-form__choice">
                <input v-model="draft.mixMaster.vocalFormation" type="radio" name="vocal_formation" :value="option.value">
                <span>{{ option.label }}</span>
              </label>
            </div>
            <p v-if="errors.vocalFormation" class="mm-contact-form__error">{{ errors.vocalFormation }}</p>
          </fieldset>

          <fieldset class="mm-contact-form__fieldset">
            <legend class="mm-contact-form__legend">화음 트랙이 있나요? *</legend>
            <span class="mm-contact-form__help">직접 녹음해주시는 경우 기본 곡에 있는 화음만 부탁드립니다. 인공 화음 제작도 가능합니다.</span>
            <div class="mm-contact-form__inline-choices">
              <label class="mm-contact-form__choice"><input v-model="draft.mixMaster.harmonyTrackPresence" type="radio" name="harmony_track_presence" value="present"><span>있음</span></label>
              <label class="mm-contact-form__choice"><input v-model="draft.mixMaster.harmonyTrackPresence" type="radio" name="harmony_track_presence" value="absent"><span>없음</span></label>
            </div>
            <p v-if="errors.harmonyTrackPresence" class="mm-contact-form__error">{{ errors.harmonyTrackPresence }}</p>
          </fieldset>

          <label class="mm-contact-form__field">
            <span class="mm-contact-form__label">화음 관련 추가사항</span>
            <textarea v-model="draft.mixMaster.harmonyNote" rows="3"></textarea>
          </label>

          <fieldset class="mm-contact-form__fieldset">
            <legend class="mm-contact-form__legend">커버곡인가요? *</legend>
            <div class="mm-contact-form__inline-choices">
              <label class="mm-contact-form__choice"><input v-model="draft.mixMaster.isCoverSong" type="radio" name="cover_song" value="yes"><span>예</span></label>
              <label class="mm-contact-form__choice"><input v-model="draft.mixMaster.isCoverSong" type="radio" name="cover_song" value="no"><span>아니오</span></label>
            </div>
            <p v-if="errors.isCoverSong" class="mm-contact-form__error">{{ errors.isCoverSong }}</p>
          </fieldset>

          <div v-if="draft.mixMaster.isCoverSong === 'yes'" class="mm-contact-form__grid mm-contact-form__grid--two">
            <label class="mm-contact-form__field">
              <span class="mm-contact-form__label">원곡 제목 *</span>
              <input v-model="draft.mixMaster.coverSongTitle" type="text">
              <span v-if="errors.coverSongTitle" class="mm-contact-form__error">{{ errors.coverSongTitle }}</span>
            </label>
            <label class="mm-contact-form__field">
              <span class="mm-contact-form__label">원곡 길이 *</span>
              <input v-model="draft.mixMaster.coverSongDuration" type="text" placeholder="예: 3:42">
              <span v-if="errors.coverSongDuration" class="mm-contact-form__error">{{ errors.coverSongDuration }}</span>
            </label>
            <label class="mm-contact-form__field mm-contact-form__field--full">
              <span class="mm-contact-form__label">원곡 유튜브 링크</span>
              <input v-model="draft.mixMaster.coverSongYoutubeUrl" type="url">
              <span v-if="errors.coverSongYoutubeUrl" class="mm-contact-form__error">{{ errors.coverSongYoutubeUrl }}</span>
            </label>
          </div>

          <label class="mm-contact-form__field">
            <span class="mm-contact-form__label">요청사항 *</span>
            <span class="mm-contact-form__help">예: 오토튠 짱짱하게, 특수 디스토션 사용, 리버브 짱짱하게.</span>
            <textarea v-model="draft.mixMaster.requestDetails" rows="6"></textarea>
            <span v-if="errors.mixMasterRequestDetails" class="mm-contact-form__error">{{ errors.mixMasterRequestDetails }}</span>
          </label>
        </section>

        <section
          v-if="activeCategoryId === 'package'"
          class="mm-contact-form__section"
          data-mm-contact-schema="package"
        >
          <h3 class="mm-contact-form__section-title">패키지 정보</h3>
          <div class="mm-contact-form__notice">
            <p>패키지별 기본구성은 최종가에서 5% 할인됩니다.</p>
            <p>기본구성 외 추가 작업과 재료비·장비 추가금·영상 소스 구매비용 등 옵션 요소는 할인 없이 별도로 계산됩니다.</p>
          </div>

          <fieldset class="mm-contact-form__fieldset">
            <legend class="mm-contact-form__legend">패키지 유형 *</legend>
            <div class="mm-contact-form__package-grid">
              <label v-for="definition in CONTACT_PACKAGE_DEFINITIONS" :key="definition.id" class="mm-contact-form__package-option">
                <input v-model="draft.package.packageType" type="radio" name="package_type" :value="definition.id">
                <span class="mm-contact-form__package-title">{{ definition.label }}</span>
                <span v-if="definition.baseComposition.length > 0" class="mm-contact-form__package-copy">
                  {{ definition.baseComposition.join(' + ') }}
                </span>
                <span v-if="definition.recommendation.length > 0" class="mm-contact-form__package-copy">
                  추천: {{ definition.recommendation.join(', ') }}
                </span>
                <span v-if="definition.id === 'custom'" class="mm-contact-form__package-copy">
                  하나의 프로젝트에 필요한 확정 작업 3가지 이상을 함께 신청하는 경우 검토 후 패키지 할인가 적용
                </span>
              </label>
            </div>
            <p v-if="errors.packageType" class="mm-contact-form__error">{{ errors.packageType }}</p>
          </fieldset>

          <p v-if="activePackage !== null && activePackage.baseComposition.length > 0" class="mm-contact-form__subject">
            <span>기본 구성</span>
            <strong>{{ activePackage.baseComposition.join(' / ') }}</strong>
          </p>

          <label class="mm-contact-form__field">
            <span class="mm-contact-form__label">작업물 사용목적 *</span>
            <span class="mm-contact-form__help">예: 코스프레 커버콘서트 팀 홍보, 버추얼 팀 오리지널곡 런칭.</span>
            <textarea v-model="draft.package.usagePurpose" rows="5"></textarea>
            <span v-if="errors.packageUsagePurpose" class="mm-contact-form__error">{{ errors.packageUsagePurpose }}</span>
          </label>

          <div class="mm-contact-form__repeat-list">
            <fieldset
              v-for="(item, index) in draft.package.workItems"
              :key="item.id"
              class="mm-contact-form__repeat-card"
            >
              <legend>{{ draft.package.packageType === 'custom' ? '필요한 작업' : '추가로 필요한 작업' }} {{ index + 1 }}</legend>
              <label class="mm-contact-form__field">
                <span class="mm-contact-form__label">작업 카테고리</span>
                <input v-model="item.label" type="text" placeholder="예: 작곡, 믹싱마스터링, 의상디자인">
              </label>
              <div class="mm-contact-form__inline-choices">
                <label class="mm-contact-form__choice"><input v-model="item.state" type="radio" :name="`package_work_state_${index}`" value="required"><span>필요</span></label>
                <label class="mm-contact-form__choice"><input v-model="item.state" type="radio" :name="`package_work_state_${index}`" value="considering"><span>고려 중</span></label>
              </div>
              <button v-if="draft.package.workItems.length > 1" class="mm-contact-form__minor-button" type="button" @click="removePackageWorkItem(index)">
                이 작업 삭제
              </button>
            </fieldset>
          </div>
          <button class="mm-contact-form__minor-button" type="button" @click="addPackageWorkItem">+ 작업 추가</button>
          <p v-if="errors.packageWorkItems" class="mm-contact-form__error">{{ errors.packageWorkItems }}</p>

          <fieldset v-if="draft.package.packageType === 'custom'" class="mm-contact-form__fieldset">
            <legend class="mm-contact-form__legend">선택한 작업들은 모두 하나의 프로젝트를 위한 작업인가요? *</legend>
            <div class="mm-contact-form__inline-choices">
              <label class="mm-contact-form__choice"><input v-model="draft.package.customSameProject" type="radio" name="custom_same_project" value="yes"><span>예</span></label>
              <label class="mm-contact-form__choice"><input v-model="draft.package.customSameProject" type="radio" name="custom_same_project" value="no"><span>아니오</span></label>
            </div>
            <p v-if="errors.customSameProject" class="mm-contact-form__error">{{ errors.customSameProject }}</p>
            <p class="mm-contact-form__help">
              확정 작업 {{ requiredCustomWorkCount }}개 ·
              <template v-if="customPackageQualification === 'review-eligible'">패키지 할인 적용 검토 조건 충족</template>
              <template v-else-if="customPackageQualification === 'insufficient-components'">확정 작업 3개 이상부터 할인 검토 대상</template>
              <template v-else-if="customPackageQualification === 'cross-project'">동일 프로젝트 조건 확인 필요</template>
            </p>
          </fieldset>

          <div class="mm-contact-form__repeat-list">
            <fieldset
              v-for="(item, index) in draft.package.deliverables"
              :key="item.id"
              class="mm-contact-form__repeat-card"
            >
              <legend>작업물 {{ index + 1 }}</legend>
              <div class="mm-contact-form__grid mm-contact-form__grid--two">
                <label class="mm-contact-form__field">
                  <span class="mm-contact-form__label">작업물 *</span>
                  <input v-model="item.deliverable" type="text" placeholder="예: 오리지널곡">
                  <span v-if="errors[`deliverable-${index}-name`]" class="mm-contact-form__error">{{ errors[`deliverable-${index}-name`] }}</span>
                </label>
                <label class="mm-contact-form__field">
                  <span class="mm-contact-form__label">원하는 최종형태 *</span>
                  <input v-model="item.finalForm" type="text">
                  <span v-if="errors[`deliverable-${index}-final`]" class="mm-contact-form__error">{{ errors[`deliverable-${index}-final`] }}</span>
                </label>
                <label class="mm-contact-form__field">
                  <span class="mm-contact-form__label">사용일자 *</span>
                  <input v-model="item.usageDate" type="text" placeholder="예: 10월 20일 공개">
                  <span v-if="errors[`deliverable-${index}-usage`]" class="mm-contact-form__error">{{ errors[`deliverable-${index}-usage`] }}</span>
                </label>
                <label class="mm-contact-form__field">
                  <span class="mm-contact-form__label">받고 싶은 날짜 *</span>
                  <input v-model="item.desiredDelivery" type="text">
                  <span v-if="errors[`deliverable-${index}-delivery`]" class="mm-contact-form__error">{{ errors[`deliverable-${index}-delivery`] }}</span>
                </label>
                <label class="mm-contact-form__field mm-contact-form__field--full">
                  <span class="mm-contact-form__label">추가 일정·절차</span>
                  <textarea v-model="item.note" rows="3"></textarea>
                </label>
              </div>
              <button v-if="draft.package.deliverables.length > 1" class="mm-contact-form__minor-button" type="button" @click="removePackageDeliverable(index)">
                이 작업물 삭제
              </button>
            </fieldset>
          </div>
          <button class="mm-contact-form__minor-button" type="button" @click="addPackageDeliverable">+ 작업물 추가</button>

          <label class="mm-contact-form__field">
            <span class="mm-contact-form__label">프로젝트와 의뢰내용을 전체적으로 정리해주세요 *</span>
            <span class="mm-contact-form__help">필요한 작업물의 최종형태와 사용 일정, 컨셉, 참여 인원, 작업 시 고려할 사항 등 중요한 내용을 전체적으로 정리해주세요.</span>
            <textarea v-model="draft.package.requestDescription" rows="8"></textarea>
            <span v-if="errors.packageRequestDescription" class="mm-contact-form__error">{{ errors.packageRequestDescription }}</span>
          </label>

          <label class="mm-contact-form__field">
            <span class="mm-contact-form__label">참고자료 링크</span>
            <span class="mm-contact-form__help">관련 자료가 있다면 링크로 전달해주세요. R1에서는 파일 직접 첨부는 지원하지 않습니다.</span>
            <input v-model="draft.package.referenceUrl" type="url">
            <span v-if="errors.packageReferenceUrl" class="mm-contact-form__error">{{ errors.packageReferenceUrl }}</span>
          </label>
        </section>

        <section class="mm-contact-form__section">
          <label class="mm-contact-form__field">
            <span class="mm-contact-form__label">추가로 전달할 내용</span>
            <span class="mm-contact-form__help">필수 항목 외에 추가로 알려주실 내용이 있으면 자유롭게 작성해주세요.</span>
            <textarea v-model="draft.common.additionalMessage" name="additional_message" rows="5"></textarea>
          </label>
        </section>

        <div class="mm-contact-form__honeypot" aria-hidden="true">
          <label>
            Leave this field empty
            <input v-model="draft.honeypot" name="_gotcha" type="text" tabindex="-1" autocomplete="off">
          </label>
        </div>

        <section
          v-if="submissionState === 'invalid'"
          class="mm-contact-form__status"
          role="alert"
          data-mm-contact-validation-error
        >
          필수 항목을 확인해주세요.
        </section>

        <section
          v-if="submissionState === 'error'"
          class="mm-contact-form__status"
          role="alert"
          data-mm-contact-submit-error
        >
          {{ providerMessage() }}
        </section>

        <p
          v-if="endpointState.status !== 'ready'"
          class="mm-contact-form__status"
          role="status"
          data-mm-contact-endpoint-unavailable
        >
          {{ content.unavailableMessage }}
        </p>

        <div class="mm-contact-form__actions">
          <button
            class="mm-info-action mm-info-action--primary mm-contact-form__submit"
            type="submit"
            :disabled="submissionState === 'submitting' || endpointState.status !== 'ready'"
          >
            {{ submissionState === 'submitting' ? content.submittingLabel : content.submitLabel }}
          </button>
        </div>
      </template>
    </form>

    <nav
      class="mm-info-actions mm-contact-form__utility-actions"
      aria-label="문의 페이지 이동"
      data-mm-contact-utility-actions
    >
      <NuxtLink
        class="mm-info-action mm-info-action--secondary"
        :to="content.worksLinkRoute"
      >
        {{ content.worksLinkLabel }}
      </NuxtLink>
    </nav>
  </div>
</template>

<style src="~/assets/css/contact-form.css"></style>
