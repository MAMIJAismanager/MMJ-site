import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { registerHooks, stripTypeScriptTypes } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  importMmjSharedTypeScriptModule,
} from './lib/mmj-ui29-shared-typescript-loader.mjs'

const root = process.cwd()
const assetDomain = await importMmjSharedTypeScriptModule(
  root,
  'shared/constants/asset-domain.ts',
)
const trackModule = await importMmjSharedTypeScriptModule(
  root,
  'shared/resolver/player-track.ts',
)
const admissionModule = await importMmjSharedTypeScriptModule(
  root,
  'shared/resolver/player-source-admission.ts',
)

assert.equal(
  assetDomain.isAssetMediaTypeFor('audio', 'audio/flac'),
  true,
  'audio/flac must be admitted by the audio domain registry',
)
assert.equal(
  assetDomain.getCanonicalExtensionForAssetMediaType('audio/flac'),
  'flac',
  'audio/flac canonical extension drifted',
)

function source(renditionId, mediaType, extension, durationMs = 221000) {
  return Object.freeze({
    kind: 'audio',
    renditionId,
    purpose: 'primary',
    url: `https://media.mamajing.work/assets/audio/ast_audio0001/${renditionId}.${extension}`,
    mediaType,
    byteSize: 1024,
    metadata: Object.freeze({ durationMs }),
    isDefault: mediaType === 'audio/flac',
  })
}

function artworkMedia(id = 'ast_artwork01') {
  return Object.freeze({
    kind: 'image',
    id,
    label: 'Player artwork',
    caption: null,
    credit: null,
    altText: null,
    sources: Object.freeze([]),
    defaultSource: null,
  })
}

function artworkPlan(id = 'ast_artwork01') {
  return Object.freeze({
    assetId: id,
    sourceSets: Object.freeze([]),
    fallback: Object.freeze({
      url: 'https://media.mamajing.work/assets/image/ast_artwork01/poster.webp',
      mediaType: 'image/webp',
      width: 1000,
      height: 1000,
      srcset: null,
    }),
    sizes: '(min-width: 48rem) 5rem, 4rem',
    intrinsicSize: Object.freeze({ width: 1000, height: 1000 }),
    alt: '',
    ariaHidden: true,
    loading: 'lazy',
    fetchPriority: 'auto',
    decoding: 'async',
    fit: 'contain',
  })
}

function audioPlan({
  sources,
  fallbackSource,
  artwork = artworkMedia(),
} = {}) {
  const actualSources = sources ?? Object.freeze([
    source('primary-mp3', 'audio/mpeg', 'mp3'),
    source('primary-wav', 'audio/wav', 'wav'),
    source('primary-flac', 'audio/flac', 'flac'),
  ])
  const actualFallback = fallbackSource ?? actualSources[2]
  return Object.freeze({
    media: Object.freeze({
      kind: 'audio',
      id: 'ast_audio0001',
      label: 'MMJ Audio Track',
      caption: null,
      credit: null,
      sources: actualSources,
      defaultSource: actualFallback,
      artwork,
    }),
    requestedIntent: 'primary',
    selectedPurpose: 'primary',
    usedPrimaryFallback: false,
    sources: actualSources,
    fallbackSource: actualFallback,
  })
}

const planner = trackModule.createPlayerTrackPlanningAuthority()
const plan = audioPlan()
const poster = artworkPlan()
const track = planner.resolve(plan, 'prj_audio0001', poster)

assert.equal(track.sources.length, 3, 'multi-source PlayerTrack was truncated')
assert.equal(track.defaultSource.mediaType, 'audio/flac', 'default rendition authority drifted')
assert.equal(track.artworkPlan, poster, 'artwork projection identity drifted')
assert.equal(track.declaredDurationMs, 221000, 'logical track duration drifted')
assert.deepEqual(
  track.sources.map(item => item.mediaType),
  ['audio/mpeg', 'audio/wav', 'audio/flac'],
  'source ordering drifted',
)

const defaultAdmission = admissionModule.selectPlayableAudioSource(
  track,
  1,
  mediaType => mediaType === 'audio/flac' ? 'probably' : 'maybe',
)
assert.equal(defaultAdmission.source.mediaType, 'audio/flac')
assert.equal(defaultAdmission.reason, 'default-supported')

const mp3Fallback = admissionModule.selectPlayableAudioSource(
  track,
  2,
  mediaType => mediaType === 'audio/flac' ? '' : 'probably',
)
assert.equal(mp3Fallback.source.mediaType, 'audio/mpeg')
assert.equal(mp3Fallback.reason, 'mp3-compatibility-fallback')

const noMp3Sources = Object.freeze([
  source('primary-wav', 'audio/wav', 'wav'),
  source('primary-flac', 'audio/flac', 'flac'),
])
const noMp3Track = trackModule.createPlayerTrackPlanningAuthority().resolve(
  audioPlan({ sources: noMp3Sources, fallbackSource: noMp3Sources[1] }),
  'prj_audio0002',
  poster,
)
const orderedFallback = admissionModule.selectPlayableAudioSource(
  noMp3Track,
  3,
  mediaType => mediaType === 'audio/wav' ? 'maybe' : '',
)
assert.equal(orderedFallback.source.mediaType, 'audio/wav')
assert.equal(orderedFallback.reason, 'ordered-supported-fallback')

assert.throws(
  () => admissionModule.selectPlayableAudioSource(track, 4, () => ''),
  error => (
    error?.name === 'PlayerSourceAdmissionError'
    && error?.code === 'no-playable-audio-source'
  ),
  'all-unsupported source matrix must fail explicitly',
)

const duplicateMimeSources = Object.freeze([
  source('primary-mp3-a', 'audio/mpeg', 'mp3'),
  source('primary-mp3-b', 'audio/mpeg', 'mp3'),
])
assert.throws(
  () => trackModule.createPlayerTrackPlanningAuthority().resolve(
    audioPlan({
      sources: duplicateMimeSources,
      fallbackSource: duplicateMimeSources[0],
    }),
    'prj_audio0003',
    poster,
  ),
  error => error?.code === 'player-track-duplicate-media-type',
  'duplicate playback MIME must be rejected in R1',
)

const mixedDurationSources = Object.freeze([
  source('primary-mp3', 'audio/mpeg', 'mp3', 221000),
  source('primary-flac', 'audio/flac', 'flac', 221001),
])
assert.throws(
  () => trackModule.createPlayerTrackPlanningAuthority().resolve(
    audioPlan({
      sources: mixedDurationSources,
      fallbackSource: mixedDurationSources[1],
    }),
    'prj_audio0004',
    poster,
  ),
  error => error?.code === 'player-track-mixed-duration',
  'cross-rendition duration drift must be rejected',
)

assert.throws(
  () => trackModule.createPlayerTrackPlanningAuthority().resolve(
    plan,
    'prj_audio0005',
    artworkPlan('ast_artwork02'),
  ),
  error => error?.code === 'player-track-artwork-identity-mismatch',
  'player artwork must remain bound to audio artwork identity',
)

const noArtworkPlan = audioPlan({ artwork: null })
const noArtworkTrack = trackModule.createPlayerTrackPlanningAuthority().resolve(
  noArtworkPlan,
  'prj_audio0006',
  null,
)
assert.equal(noArtworkTrack.artworkPlan, null, 'null artwork must remain null')

registerHooks({
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && url.endsWith('.ts')) {
      const path = fileURLToPath(url)
      if (path.startsWith(resolve(root))) {
        return {
          format: 'module',
          source: stripTypeScriptTypes(readFileSync(path, 'utf8'), { mode: 'transform' }),
          shortCircuit: true,
        }
      }
    }
    return nextLoad(url, context)
  },
})

const stateModule = await import(
  pathToFileURL(resolve(root, 'app/utils/player-store-state.ts')).href,
)
let state = stateModule.createInitialPlayerStoreState()
assert.equal(state.schemaVersion, 2, 'player state schema must bump to v2')
assert.equal(state.sourceAdmission, null, 'initial source admission must be null')
state = stateModule.reducePlayerStoreState(state, { kind: 'select-track', track })
assert.equal(state.trackEpoch, 1, 'select-track must advance track epoch')
assert.equal(state.sourceAdmission, null, 'track selection must clear source admission')
state = stateModule.reducePlayerStoreState(state, { kind: 'request-play' })
assert.equal(state.pendingTransport?.kind, 'play', 'play request must remain pending before admission')
state = stateModule.reducePlayerStoreState(state, {
  kind: 'admit-source',
  admission: defaultAdmission,
})
assert.equal(state.sourceAdmission?.source, track.defaultSource, 'admitted source identity drifted')
assert.equal(state.pendingTransport?.kind, 'play', 'source admission must not erase pending transport')
assert.throws(
  () => stateModule.reducePlayerStoreState(state, {
    kind: 'admit-source',
    admission: Object.freeze({ ...mp3Fallback, trackEpoch: 1 }),
  }),
  error => error?.code === 'player-source-admission-conflict',
  'same-epoch codec substitution must fail',
)
state = stateModule.reducePlayerStoreState(state, {
  kind: 'observe-error',
  trackEpoch: 1,
  code: 'decode',
  message: 'decode failure',
})
assert.equal(
  state.sourceAdmission?.source,
  track.defaultSource,
  'decode failure must not silently substitute another codec',
)

const publicContract = await import(
  `${pathToFileURL(resolve(root, 'scripts/lib/mmj-ui29-public-contract.mjs')).href}?audio-r1-public-contract`,
)
const publicArtwork = {
  schemaVersion: 1,
  id: 'ast_artwork01',
  kind: 'image',
  label: 'Audio artwork',
  caption: null,
  credit: null,
  defaultRenditionId: 'primary-webp',
  renditions: [{
    id: 'primary-webp',
    purpose: 'primary',
    objectKey: 'assets/image/ast_artwork01/primary.webp',
    mediaType: 'image/webp',
    byteSize: 128,
    sha256: '1'.repeat(64),
    metadata: { width: 1000, height: 1000 },
  }],
  altText: null,
}
const publicAudio = {
  schemaVersion: 1,
  id: 'ast_audio0001',
  kind: 'audio',
  label: 'MMJ Audio Track',
  caption: null,
  credit: null,
  defaultRenditionId: 'primary-flac',
  renditions: [
    {
      id: 'primary-mp3',
      purpose: 'primary',
      objectKey: 'assets/audio/ast_audio0001/primary.mp3',
      mediaType: 'audio/mpeg',
      byteSize: 1024,
      sha256: '2'.repeat(64),
      metadata: { durationMs: 221000 },
    },
    {
      id: 'primary-wav',
      purpose: 'primary',
      objectKey: 'assets/audio/ast_audio0001/primary.wav',
      mediaType: 'audio/wav',
      byteSize: 2048,
      sha256: '3'.repeat(64),
      metadata: { durationMs: 221000 },
    },
    {
      id: 'primary-flac',
      purpose: 'primary',
      objectKey: 'assets/audio/ast_audio0001/primary.flac',
      mediaType: 'audio/flac',
      byteSize: 1536,
      sha256: '4'.repeat(64),
      metadata: { durationMs: 221000 },
    },
  ],
  artworkAssetId: publicArtwork.id,
}
const publicProject = {
  schemaVersion: 1,
  id: 'prj_audio0007',
  slug: 'audio-r1',
  title: 'Audio R1',
  category: 'composition',
  gatewayCategoryIds: ['audio-mixing-mastering'],
  roles: [],
  tags: [{ token: 'audio', label: 'Audio' }],
  timing: { year: 2026, releaseDate: '2026-08-14' },
  client: null,
  summary: 'Audio R1 summary',
  description: 'Audio R1 description',
  post: {
    comment: 'Audio R1 description',
    mediaItems: [{ position: 0, assetId: publicAudio.id }],
    tags: [{ token: 'audio', label: 'Audio' }],
  },
  credits: [],
  externalLinks: [],
  relatedProjectIds: [],
  assets: {
    coverAssetId: publicArtwork.id,
    backdropAssetId: null,
    primaryAssetId: publicAudio.id,
    galleryAssetIds: [],
  },
  featured: false,
  order: 1,
  seo: {
    title: 'Audio R1 | MMJ',
    description: 'Audio R1 SEO',
    ogAssetId: publicArtwork.id,
    indexable: true,
  },
}
publicContract.validateSnapshot({
  assets: [publicArtwork, publicAudio],
  projects: [publicProject],
  publicationCutoff: '2026-08-14T00:00:00.000Z',
  schemaVersion: 1,
  sourceDigest: 'a'.repeat(64),
})

console.log(JSON.stringify({
  event: 'PASS_MMJ_UI29_GLOBAL_AUDIO_ARTWORK_R2_MULTI_RENDITION_PLAYBACK_R1_TESTS',
  tests: 18,
  codecs: ['audio/mpeg', 'audio/wav', 'audio/flac'],
  defaultPolicy: 'cms-default-when-playable',
  compatibilityFallback: 'audio/mpeg',
}))
