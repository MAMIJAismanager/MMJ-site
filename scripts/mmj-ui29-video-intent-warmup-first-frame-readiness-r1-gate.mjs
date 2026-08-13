import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')

const [
  player,
  playerState,
  warmupState,
  coordinator,
  composable,
  videoType,
  planner,
  pkgText,
] = await Promise.all([
  read('app/components/media/VideoPlayer.vue'),
  read('app/utils/video-player-state.ts'),
  read('app/utils/video-warmup-state.ts'),
  read('app/utils/video-warmup-coordinator.ts'),
  read('app/composables/useVideoWarmupAuthority.ts'),
  read('shared/types/video-player.ts'),
  read('shared/resolver/video-player-plan.ts'),
  read('package.json'),
])

const pkg = JSON.parse(pkgText)
const release = 'MMJ-UI29-VIDEO-INTENT-WARMUP-FIRST-FRAME-READINESS-R1'

assert.ok(videoType.includes("readonly preload: 'metadata'"), 'VideoPlayerPresentation metadata baseline missing')
assert.equal(videoType.includes("readonly preload: 'none'"), false, 'legacy presentation preload none remains')
assert.ok(planner.includes("preload: 'metadata' as const"), 'planner metadata baseline missing')
assert.equal(planner.includes("preload: 'none' as const"), false, 'legacy planner preload none remains')

for (const token of [
  ':preload="warmupState.preload"',
  '@loadeddata="onLoadedData"',
  '@canplay="onCanPlay"',
  '@waiting="onWaiting"',
  '@stalled="onStalled"',
  '@playing="onPlaying"',
  'requestVideoFrameCallback',
  "type: 'first-frame-presented'",
  "mode: 'video-frame-callback'",
  "mode: 'loaded-data-playing'",
  'sourceIdentity',
  'baselinePreload',
  'warmup.requestDirectPlay()',
  ':data-mm-video-warmup-phase="warmupState.phase"',
]) {
  assert.ok(player.includes(token), `VideoPlayer warmup contract missing: ${token}`)
}
assert.equal(player.includes('preload="none"'), false, 'hard-coded preload none remains in VideoPlayer')
assert.equal(player.includes("dispatch({ type: 'play-started' })"), false, 'legacy play-started authority remains')

for (const token of [
  "| 'starting'",
  "| 'waiting'",
  "| 'stalled'",
  "| 'presented'",
  "| 'video-frame-callback'",
  "| 'loaded-data-playing'",
  "case 'native-play':",
  "case 'loaded-data':",
  "case 'can-play':",
  "case 'waiting':",
  "case 'stalled':",
  "case 'playing':",
  "case 'first-frame-presented':",
]) {
  assert.ok(playerState.includes(token), `player readiness state contract missing: ${token}`)
}

const nativePlayCase = playerState.slice(
  playerState.indexOf("case 'native-play':"),
  playerState.indexOf("case 'loaded-data':"),
)
assert.equal(nativePlayCase.includes("poster: state.poster === 'absent' ? 'absent' : 'dismissed'"), false, 'native play must not dismiss poster')
assert.equal(nativePlayCase.includes("activation: 'complete'"), false, 'native play must not complete activation')

const firstFrameCase = playerState.slice(
  playerState.indexOf("case 'first-frame-presented':"),
  playerState.indexOf("case 'paused':"),
)
assert.ok(firstFrameCase.includes("activation: 'complete'"), 'first-frame must complete activation')
assert.ok(firstFrameCase.includes("'dismissed'"), 'first-frame must dismiss poster')
assert.ok(
  playerState.includes("state.firstFrame === 'pending' && state.activation === 'pending'"),
  'startup pause must re-arm activation before first frame',
)

for (const token of [
  "VIDEO_WARMUP_ROOT_MARGIN = '640px 0px'",
  "'near-viewport': 1",
  "'direct-play': 4",
  "baselinePreload: 'metadata'",
  "case 'preload-auto':",
  "sourceGeneration: state.sourceGeneration + 1",
]) {
  assert.ok(warmupState.includes(token), `warmup state authority missing: ${token}`)
}

for (const token of [
  'activeBackgroundId',
  "intent === 'direct-play'",
  'activePlaybackCount() > 0',
  'state.completed',
  'registration.beginWarmup()',
  'markFailed(): void',
]) {
  assert.ok(coordinator.includes(token), `warmup coordinator contract missing: ${token}`)
}

for (const token of [
  'new IntersectionObserver(',
  'VIDEO_WARMUP_ROOT_MARGIN',
  'options.baselinePreload.value',
  "request('near-viewport')",
  "request('direct-play')",
  "video.preload = 'auto'",
  'video.readyState < video.HAVE_FUTURE_DATA',
  'video.networkState !== video.NETWORK_LOADING',
  'registration?.markCanPlay()',
  'registration?.setPlaybackActive(true)',
  'registration?.markFailed()',
]) {
  assert.ok(composable.includes(token), `Nuxt warmup projection missing: ${token}`)
}

for (const forbidden of [
  'new Worker(',
  'new Blob(',
  '.arrayBuffer(',
  'MediaSource(',
  'new VideoDecoder(',
  'URL.createObjectURL(',
]) {
  assert.equal(
    [player, warmupState, coordinator, composable].some(source => source.includes(forbidden)),
    false,
    `forbidden full-file/custom-media warmup path found: ${forbidden}`,
  )
}

assert.equal(
  pkg.mmjUi29VideoIntentWarmupFirstFrameReadinessRelease,
  release,
  'video warmup release marker drift',
)
const gate = String(pkg.scripts?.['gate:video-intent-warmup-first-frame-readiness-r1'] || '')
assert.ok(gate.includes('mmj-ui29-video-intent-warmup-first-frame-readiness-r1-test.mjs'), 'runtime policy test missing from package gate')
assert.ok(gate.includes('mmj-ui29-video-intent-warmup-first-frame-readiness-r1-gate.mjs'), 'static gate missing from package gate')
assert.ok(gate.includes('mmj-ui29-video-preview-controls-gate.mjs'), 'existing video stage gate must remain chained')
assert.ok(
  String(pkg.scripts?.['gate:mmj-ui29-a'] || '').includes('gate:video-intent-warmup-first-frame-readiness-r1'),
  'aggregate UI29 gate missing video warmup R1',
)

console.log('PASS_METADATA_BASELINE_PRELOAD')
console.log('PASS_INTENT_BOUND_AUTO_WARMUP')
console.log('PASS_SINGLE_BACKGROUND_WARMUP_WAVE')
console.log('PASS_CANPLAY_WAITING_STALLED_PLAYING_EVIDENCE')
console.log('PASS_PLAY_EVENT_NOT_FIRST_FRAME_AUTHORITY')
console.log('PASS_FIRST_FRAME_BOUND_POSTER_DISMISSAL')
console.log('PASS_INTERRUPTED_STARTUP_REARM')
console.log('PASS_NATIVE_MEDIA_PIPELINE_PRESERVED')
console.log('PASS_MMJ_UI29_VIDEO_INTENT_WARMUP_FIRST_FRAME_READINESS_R1')
