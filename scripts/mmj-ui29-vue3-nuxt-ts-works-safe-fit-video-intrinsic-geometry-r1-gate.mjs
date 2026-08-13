import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')

const [
  worksProfile,
  worksPhysicalFit,
  worksComposable,
  worksPhysicalComposable,
  worksPage,
  grid,
  pagination,
  workDetailPage,
  workAssetFrame,
  videoPlayer,
  videoGeometry,
  videoCss,
  videoPreviewGate,
  pkgText,
] = await Promise.all([
  read('app/works/works-layout-profile.ts'),
  read('app/works/works-physical-fit.ts'),
  read('app/composables/useWorksLayoutProfile.ts'),
  read('app/composables/useWorksPhysicalFitAdmission.ts'),
  read('app/pages/works/index.vue'),
  read('app/components/project/ProjectGrid.vue'),
  read('app/components/works/WorksPagination.vue'),
  read('app/pages/works/[slug].vue'),
  read('app/components/work/WorkAssetFrame.vue'),
  read('app/components/media/VideoPlayer.vue'),
  read('app/video/video-geometry-profile.ts'),
  read('app/assets/css/video-player.css'),
  read('scripts/mmj-ui29-video-preview-controls-gate.mjs'),
  read('package.json'),
])

const pkg = JSON.parse(pkgText)
const release = 'MMJ-UI29-VUE3-NUXT-TS-WORKS-SAFE-FIT-AND-VIDEO-INTRINSIC-GEOMETRY-R1'
const physicalR2Release = 'MMJ-UI29-WORKS-PHYSICAL-FIT-ADMISSION-R2'

for (const token of [
  "readonly paginationPlacement: 'in-flow'",
  'readonly lockEligible: boolean',
  'readonly physicalFitPhase: WorksPhysicalFitPhase',
  'deriveReferenceCandidateTokens(',
  "const viewportLocked = physicalFitPhase === 'admitted-locked'",
  "'reference'",
  "'compact'",
  "'natural-flow'",
]) {
  assert.ok(worksProfile.includes(token), `Works candidate authority missing: ${token}`)
}
for (const forbidden of ['window.', 'document.', 'ResizeObserver', 'getBoundingClientRect']) {
  assert.equal(worksProfile.includes(forbidden), false, `pure Works candidate resolver leaked browser authority: ${forbidden}`)
}
for (const retired of [
  'WORKS_SITE_HEADER_BLOCK_PX',
  'WORKS_PAGINATION_BUTTON_BLOCK_PX',
  'rowRequiredBlockPx',
  'referenceCandidate.receipt.admitted',
]) {
  assert.equal(worksProfile.includes(retired), false, `retired synthetic lock authority remains: ${retired}`)
}

for (const token of [
  "| 'measuring-natural'",
  "| 'admitted-locked'",
  "| 'rejected-flow'",
  "| 'revoked-flow'",
  'resolveWorksNaturalPhysicalFit',
  'verifyWorksLockedPhysicalCommit',
]) {
  assert.ok(worksPhysicalFit.includes(token), `Works physical superseding authority missing: ${token}`)
}
for (const forbidden of ['window.', 'document.', 'HTMLElement', 'ResizeObserver', 'getBoundingClientRect']) {
  assert.equal(worksPhysicalFit.includes(forbidden), false, `pure Works physical resolver leaked DOM authority: ${forbidden}`)
}

for (const token of [
  "'--mm-works-fit-available-block'",
  "'--mm-works-fit-required-block'",
  'viewportRevision',
  'candidate',
  'WORKS_PHYSICAL_FIT_STATE_KEY',
]) {
  assert.ok(worksComposable.includes(token), `Works layout/physical bridge missing: ${token}`)
}
assert.equal(worksComposable.includes('ResizeObserver'), false, 'physical observation must not leak into layout composable')

for (const token of [
  'new ResizeObserver(',
  'window.requestAnimationFrame',
  'page.scrollHeight',
  'grid.scrollHeight',
  'verifyWorksLockedPhysicalCommit(snapshot)',
]) {
  assert.ok(worksPhysicalComposable.includes(token), `Nuxt physical admission missing: ${token}`)
}

for (const token of [
  ':data-mm-works-fit-admission="worksLayoutProfile.viewportFit.admission"',
  ':data-mm-works-fit-admitted="worksLayoutProfile.viewportFit.admitted ? \'true\' : \'false\'"',
  ':data-mm-works-pagination-placement="worksLayoutProfile.paginationPlacement"',
  ':data-mm-works-physical-fit-phase="worksPhysicalFitReceipt.phase"',
  ':placement="worksLayoutProfile.paginationPlacement"',
]) {
  assert.ok(worksPage.includes(token), `Works page fit projection missing: ${token}`)
}
for (const token of [
  ':data-mm-project-grid-rows="layout.pageRowCount"',
  ':data-mm-project-grid-fit="layout.viewportFit.admission"',
]) {
  assert.ok(grid.includes(token), `ProjectGrid fit projection missing: ${token}`)
}
for (const token of [
  "readonly placement: 'in-flow'",
  ':data-mm-pagination-placement="placement"',
]) {
  assert.ok(pagination.includes(token), `Pagination in-flow authority missing: ${token}`)
}

for (const token of [
  ':media-max-inline-px="layoutProfile.mediaMaxInlinePx"',
  ':media-max-block-px="layoutProfile.mediaMaxBlockPx"',
]) {
  assert.ok(workDetailPage.includes(token), `Work Detail video constraint projection missing: ${token}`)
}
for (const token of [
  'readonly mediaMaxInlinePx?: number',
  'readonly mediaMaxBlockPx?: number',
  'VideoGeometryConstraint',
  'videoGeometryConstraint',
  ':geometry-constraint="videoGeometryConstraint"',
]) {
  assert.ok(workAssetFrame.includes(token), `WorkAssetFrame geometry bridge missing: ${token}`)
}

for (const token of [
  'export interface VideoGeometryProfile',
  "readonly fit: 'contain'",
  'readonly allowCrop: false',
  'readonly allowStretch: false',
  'readonly allowUpscale: false',
  "| 'fullscreen-contain'",
  'const scale = Math.min(1, inlineScale, blockScale)',
]) {
  assert.ok(videoGeometry.includes(token), `Video geometry SSOT missing: ${token}`)
}
for (const forbidden of ['window.', 'document.', 'HTMLElement', 'ResizeObserver']) {
  assert.equal(videoGeometry.includes(forbidden), false, `pure video geometry resolver leaked DOM authority: ${forbidden}`)
}

for (const token of [
  'resolveVideoGeometryProfile',
  'readonly geometryConstraint?: VideoGeometryConstraint',
  'geometryProfile',
  ':data-mm-video-geometry-mode="geometryProfile.mode"',
  ':data-mm-video-crop="geometryProfile.allowCrop ? \'allowed\' : \'denied\'"',
  ':data-mm-video-fullscreen="runtimeState.fullscreen ? \'true\' : \'false\'"',
  "'--mm-video-player-inline-size'",
  "'--mm-video-player-intrinsic-inline-size'",
  "'--mm-video-player-intrinsic-block-size'",
]) {
  assert.ok(videoPlayer.includes(token), `VideoPlayer Vue geometry projection missing: ${token}`)
}

for (const token of [
  'width: min(100%, var(--mm-video-player-inline-size))',
  'aspect-ratio: var(--mm-video-player-ratio)',
  'object-fit: contain',
  ".mm-video-player[data-mm-video-fullscreen='true']",
  'var(--mm-video-player-intrinsic-inline-size)',
  'var(--mm-video-player-intrinsic-block-size)',
]) {
  assert.ok(videoCss.includes(token), `video CSS renderer missing projected geometry: ${token}`)
}
for (const forbidden of [
  'width: min(100%, clamp(40rem, 50vw, 60rem))',
  'aspect-ratio: 16 / 9',
  'width: 100vw',
  'height: 100vh',
  'object-fit: cover',
]) {
  assert.equal(videoCss.includes(forbidden), false, `layout-owned video geometry remains: ${forbidden}`)
}

assert.ok(videoPreviewGate.includes('PASS_MMJ_UI29_VIDEO_PREVIEW_INTRINSIC_GEOMETRY_R4'), 'legacy video preview gate not rebound to intrinsic geometry')
assert.equal(videoPreviewGate.includes("stageAspectRatio: '16:9'"), false, 'legacy 16:9 preview gate authority remains')

const gateName = 'gate:vue3-nuxt-ts-works-safe-fit-video-intrinsic-geometry-r1'
const gateCommand = 'node --experimental-strip-types scripts/mmj-ui29-vue3-nuxt-ts-works-safe-fit-video-intrinsic-geometry-r1-test.mjs && node scripts/mmj-ui29-vue3-nuxt-ts-works-safe-fit-video-intrinsic-geometry-r1-gate.mjs && node scripts/mmj-ui29-video-preview-controls-gate.mjs'
assert.equal(pkg.scripts?.[gateName], gateCommand, 'package gate binding drift')
assert.ok(String(pkg.scripts?.['gate:mmj-ui29-a'] ?? '').includes(`npm run ${gateName}`), 'aggregate UI29 gate missing safe-fit/video geometry R1')
assert.equal(pkg.mmjUi29Vue3NuxtTsWorksSafeFitVideoIntrinsicGeometryRelease, release, 'release marker drift')
assert.equal(pkg.mmjUi29WorksPhysicalFitAdmissionR2Release, physicalR2Release, 'physical R2 superseding release missing')

console.log('PASS_TYPESCRIPT_WORKS_CANDIDATE_AUTHORITY')
console.log('PASS_NUXT_PHYSICAL_FIT_SUPERSEDING_AUTHORITY')
console.log('PASS_VUE3_PAGINATION_IN_FLOW_PROJECTION')
console.log('PASS_TYPESCRIPT_VIDEO_INTRINSIC_GEOMETRY_AUTHORITY')
console.log('PASS_VUE3_VIDEO_GEOMETRY_PROJECTION')
console.log('PASS_NO_FORCED_16X9_OR_VIEWPORT_CROP_AUTHORITY')
console.log('PASS_MMJ_UI29_VUE3_NUXT_TS_WORKS_SAFE_FIT_AND_VIDEO_INTRINSIC_GEOMETRY_R1')
