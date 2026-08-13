import assert from 'node:assert/strict'
import { readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const statePath = resolve(root, 'app/utils/video-warmup-state.ts')
const coordinatorPath = resolve(root, 'app/utils/video-warmup-coordinator.ts')
const playerStatePath = resolve(root, 'app/utils/video-player-state.ts')

const stateModule = await import(`${pathToFileURL(statePath).href}?r1=${Date.now()}`)
const {
  createInitialVideoWarmupState,
  reduceVideoWarmupState,
  VIDEO_WARMUP_INTENT_PRIORITY,
} = stateModule

let state = createInitialVideoWarmupState('asset-a', 'metadata')
assert.equal(state.preload, 'metadata')
assert.equal(state.phase, 'cold')
assert.equal(state.sourceGeneration, 0)

state = reduceVideoWarmupState(state, { type: 'source-reset', assetId: 'asset-a', baselinePreload: 'metadata' })
assert.equal(state.phase, 'metadata')
assert.equal(state.sourceGeneration, 1)

state = reduceVideoWarmupState(state, { type: 'intent', intent: 'near-viewport' })
state = reduceVideoWarmupState(state, { type: 'queued' })
assert.equal(state.intent, 'near-viewport')
assert.equal(state.phase, 'queued')

state = reduceVideoWarmupState(state, { type: 'intent', intent: 'hover' })
state = reduceVideoWarmupState(state, { type: 'preload-auto' })
assert.equal(state.intent, 'hover')
assert.equal(state.preload, 'auto')
const loadGenerationBefore = state.loadGeneration
state = reduceVideoWarmupState(state, { type: 'preload-auto' })
assert.equal(state.loadGeneration, loadGenerationBefore)
assert.equal(state.preload, 'auto')
assert.ok(VIDEO_WARMUP_INTENT_PRIORITY['direct-play'] > VIDEO_WARMUP_INTENT_PRIORITY.pointer)
assert.ok(VIDEO_WARMUP_INTENT_PRIORITY.pointer > VIDEO_WARMUP_INTENT_PRIORITY['near-viewport'])

const playerStateModule = await import(`${pathToFileURL(playerStatePath).href}?r1=${Date.now()}`)
let playerState = playerStateModule.createInitialVideoPlayerState(true)
playerState = playerStateModule.reduceVideoPlayerState(playerState, { type: 'play-requested' })
assert.equal(playerState.activation, 'pending')
assert.equal(playerState.poster, 'loading')
playerState = playerStateModule.reduceVideoPlayerState(playerState, { type: 'native-play' })
assert.equal(playerState.activation, 'pending')
assert.notEqual(playerState.poster, 'dismissed')
playerState = playerStateModule.reduceVideoPlayerState(playerState, { type: 'can-play' })
assert.equal(playerState.activation, 'pending')
assert.notEqual(playerState.poster, 'dismissed')
playerState = playerStateModule.reduceVideoPlayerState(playerState, { type: 'waiting' })
assert.equal(playerState.buffering, 'waiting')
assert.notEqual(playerState.poster, 'dismissed')
playerState = playerStateModule.reduceVideoPlayerState(playerState, { type: 'loaded-data' })
playerState = playerStateModule.reduceVideoPlayerState(playerState, { type: 'playing' })
assert.equal(playerState.playingObserved, true)
assert.equal(playerState.activation, 'pending')
assert.notEqual(playerState.poster, 'dismissed')
playerState = playerStateModule.reduceVideoPlayerState(playerState, {
  type: 'first-frame-presented',
  mode: 'video-frame-callback',
})
assert.equal(playerState.activation, 'complete')
assert.equal(playerState.firstFrame, 'presented')
assert.equal(playerState.poster, 'dismissed')
playerState = playerStateModule.reduceVideoPlayerState(playerState, { type: 'waiting' })
assert.equal(playerState.poster, 'dismissed')

let interruptedStartup = playerStateModule.createInitialVideoPlayerState(true)
interruptedStartup = playerStateModule.reduceVideoPlayerState(interruptedStartup, { type: 'play-requested' })
interruptedStartup = playerStateModule.reduceVideoPlayerState(interruptedStartup, { type: 'paused' })
assert.equal(interruptedStartup.activation, 'required')
assert.equal(interruptedStartup.poster, 'loading')

const coordinatorSource = await readFile(coordinatorPath, 'utf8')
const stateUrl = pathToFileURL(statePath).href
const rewrittenCoordinator = coordinatorSource
  .replaceAll("from './video-warmup-state'", `from '${stateUrl}'`)
const tempCoordinatorPath = resolve(
  tmpdir(),
  `mmj-video-warmup-coordinator-${process.pid}-${Date.now()}.ts`,
)
await writeFile(tempCoordinatorPath, rewrittenCoordinator, 'utf8')

try {
  const { createVideoWarmupCoordinator } = await import(
    `${pathToFileURL(tempCoordinatorPath).href}?r1=${Date.now()}`
  )

  const coordinator = createVideoWarmupCoordinator()
  const starts = []
  const register = id => coordinator.register({
    registrationId: id,
    assetId: `asset-${id}`,
    beginWarmup: () => starts.push(id),
  })

  const a = register('a')
  const b = register('b')
  const c = register('c')

  assert.equal(a.request('near-viewport'), 'admitted')
  assert.deepEqual(starts, ['a'])
  assert.equal(b.request('near-viewport'), 'queued')
  assert.equal(c.request('hover'), 'queued')
  assert.equal(coordinator.backgroundActiveCount, 1)
  assert.equal(coordinator.queuedCount, 2)

  a.markCanPlay()
  assert.deepEqual(starts, ['a', 'c'])
  c.markCanPlay()
  assert.deepEqual(starts, ['a', 'c', 'b'])
  b.markCanPlay()
  assert.equal(coordinator.backgroundActiveCount, 0)

  a.reset()
  b.reset()
  assert.equal(a.request('near-viewport'), 'admitted')
  assert.equal(b.request('direct-play'), 'admitted')
  assert.deepEqual(starts.slice(-2), ['a', 'b'])

  a.setPlaybackActive(true)
  c.reset()
  const startCount = starts.length
  assert.equal(c.request('hover'), 'queued')
  assert.equal(starts.length, startCount)
  a.setPlaybackActive(false)
  assert.equal(starts.at(-1), 'c')

  c.markFailed()
  a.reset()
  b.reset()
  assert.equal(a.request('near-viewport'), 'admitted')
  assert.equal(b.request('hover'), 'queued')
  const startsBeforeFailure = starts.length
  a.markFailed()
  assert.equal(starts.length, startsBeforeFailure + 1)
  assert.equal(starts.at(-1), 'b')
  b.markCanPlay()
  assert.equal(coordinator.backgroundActiveCount, 0)

  a.dispose()
  b.dispose()
  c.dispose()
} finally {
  await rm(tempCoordinatorPath, { force: true })
}

console.log('PASS_METADATA_BASELINE_PRELOAD')
console.log('PASS_MONOTONIC_AUTO_PROMOTION')
console.log('PASS_PLAY_EVENT_DOES_NOT_DISMISS_POSTER')
console.log('PASS_FIRST_FRAME_DISMISSES_POSTER')
console.log('PASS_INTERRUPTED_STARTUP_REARMS_ACTIVATION')
console.log('PASS_DETERMINISTIC_SINGLE_BACKGROUND_WAVE')
console.log('PASS_DIRECT_PLAY_QUEUE_BYPASS')
console.log('PASS_ACTIVE_PLAYBACK_BACKGROUND_SUSPENSION')
console.log('PASS_BACKGROUND_FAILURE_RELEASES_WARMUP_SLOT')
console.log('PASS_MMJ_UI29_VIDEO_INTENT_WARMUP_FIRST_FRAME_READINESS_R1_POLICY')
