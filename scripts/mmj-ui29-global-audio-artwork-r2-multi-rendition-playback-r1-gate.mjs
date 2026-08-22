import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(path, 'utf8')
const [
  domain,
  playerTypes,
  playerPlanner,
  sourceAdmission,
  playerState,
  playerStore,
  playerRuntime,
  dock,
  dockCss,
  presentation,
  publicContract,
] = await Promise.all([
  read('shared/constants/asset-domain.ts'),
  read('shared/types/player-store.ts'),
  read('shared/resolver/player-track.ts'),
  read('shared/resolver/player-source-admission.ts'),
  read('app/utils/player-store-state.ts'),
  read('app/stores/player.ts'),
  read('app/utils/global-audio-runtime.ts'),
  read('app/components/player/GlobalAudioDock.vue'),
  read('app/assets/css/global-audio-dock.css'),
  read('app/data/portfolio-media-presentation.ts'),
  read('scripts/lib/mmj-ui29-public-contract.mjs'),
])

assert.match(domain, /token: 'audio\/flac'/)
assert.match(domain, /extensions: \['flac'\]/)
assert.match(publicContract, /'audio\/flac'/)
const audioRegistryBlock = domain.slice(
  domain.indexOf('export const AUDIO_ASSET_MEDIA_TYPE_REGISTRY'),
  domain.indexOf('export const ASSET_MEDIA_TYPE_REGISTRY'),
)
const domainAudioTypes = [...audioRegistryBlock.matchAll(/token: '(audio\/[^']+)'/g)]
  .map(match => match[1])
const publicAudioSet = publicContract.match(/const AUDIO_MEDIA_TYPES = new Set\(\[([^\]]+)\]\)/)
assert.ok(publicAudioSet, 'public audio MIME set is missing')
const publicAudioTypes = [...publicAudioSet[1].matchAll(/'(audio\/[^']+)'/g)]
  .map(match => match[1])
assert.deepEqual(publicAudioTypes, domainAudioTypes, 'public/audio domain MIME authority drifted')

assert.match(playerTypes, /readonly sources: readonly PlayerTrackSource\[\]/)
assert.match(playerTypes, /readonly defaultSource: PlayerTrackSource/)
assert.match(playerTypes, /readonly artworkPlan: ResponsiveImageRenderPlan \| null/)
assert.match(playerTypes, /readonly sourceAdmission: PlayerSourceAdmission \| null/)
assert.match(playerTypes, /readonly schemaVersion: 2/)
const playerTrackBody = playerTypes.slice(
  playerTypes.indexOf('export interface PlayerTrack {'),
  playerTypes.indexOf('export type PlayerSourceCapability'),
)
assert.doesNotMatch(playerTrackBody, /readonly source: PlayerTrackSource/)

assert.match(playerPlanner, /player-track-duplicate-media-type/)
assert.match(playerPlanner, /player-track-mixed-duration/)
assert.match(playerPlanner, /player-track-artwork-identity-mismatch/)
assert.match(playerPlanner, /sources,\s*defaultSource,\s*declaredDurationMs,\s*artworkPlan/s)

assert.match(sourceAdmission, /default-supported/)
assert.match(sourceAdmission, /mp3-compatibility-fallback/)
assert.match(sourceAdmission, /ordered-supported-fallback/)
assert.match(sourceAdmission, /no-playable-audio-source/)
assert.doesNotMatch(sourceAdmission, /catch[\s\S]{0,100}audio\/mpeg/)

assert.match(playerState, /case 'admit-source'/)
assert.match(playerState, /player-source-admission-conflict/)
assert.match(playerState, /sourceAdmission: null/)
assert.match(playerStore, /sourceUrl: state => state\.sourceAdmission\?\.source\.url/)
assert.match(playerStore, /admitSource\(admission: PlayerSourceAdmission\)/)

assert.match(playerRuntime, /selectPlayableAudioSource/)
assert.match(dock, /:src="sourceAdmission\?\.source\.url \?\? undefined"/)
assert.match(dock, /data-mm-global-audio-artwork/)
assert.match(dock, /<ResponsiveImage[^>]*:plan="artworkPlan"/)
assert.equal((dock.match(/<audio\b/g) ?? []).length, 1, 'exactly one audio element is required')
assert.doesNotMatch(dock, /<source\b/)
assert.doesNotMatch(dock, /fetch\s*\(/)
assert.doesNotMatch(dock, /MediaSource|SourceBuffer|WebSocket/)
assert.doesNotMatch(dock, /currentTrack\?\.source(?!s)|track\.source(?!s)/)

assert.match(presentation, /createGlobalAudioArtworkOptions/)
assert.match(presentation, /playerTrackPlanner\.resolve\(audioPlan, projectId, artworkPlan\)/)
assert.doesNotMatch(presentation, /route.*poster|poster.*route/i)

assert.match(dockCss, /mm-global-audio-dock__artwork/)
assert.match(dockCss, /prefers-reduced-motion: reduce/)

console.log(JSON.stringify({
  event: 'PASS_MMJ_UI29_GLOBAL_AUDIO_ARTWORK_R2_MULTI_RENDITION_PLAYBACK_R1_GATE',
  staticGithubPagesCompatible: true,
  nativeHtmlAudioAuthority: true,
  mediaSourceRequired: false,
  webSocketAudioRequired: false,
  clientFullFileFetch: false,
  singleAudioElement: true,
  trackBoundArtwork: true,
}))
