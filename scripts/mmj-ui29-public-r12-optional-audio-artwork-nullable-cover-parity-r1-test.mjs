import {
  canonicalDigest,
  validateSnapshot,
} from './lib/mmj-ui29-public-contract.mjs'
import {
  importMmjSharedTypeScriptModule,
} from './lib/mmj-ui29-shared-typescript-loader.mjs'

const clone = value => structuredClone(value)
const assert = (condition, message) => { if (!condition) throw new Error(message) }
let passCount = 0

function pass(name, callback) {
  callback()
  passCount += 1
  process.stdout.write(`${name}: PASS\n`)
}

function reject(name, code, callback) {
  let caught = null
  try { callback() } catch (error) { caught = error }
  if (!caught || caught.code !== code) {
    throw new Error(`${name}: expected ${code}, received ${caught?.code ?? 'none'}`)
  }
  passCount += 1
  process.stdout.write(`${name}: PASS\n`)
}

function imageAsset(id = 'ast_r12image1') {
  return {
    schemaVersion: 1,
    id,
    kind: 'image',
    label: `Image ${id}`,
    caption: null,
    credit: null,
    defaultRenditionId: 'primary-webp',
    renditions: [{
      id: 'primary-webp',
      purpose: 'primary',
      objectKey: `assets/image/${id}/primary.webp`,
      mediaType: 'image/webp',
      byteSize: 128,
      sha256: '1'.repeat(64),
      metadata: { width: 1200, height: 900 },
    }],
    altText: null,
  }
}

function audioAsset(id = 'ast_r12audio1', artworkAssetId = null) {
  return {
    schemaVersion: 1,
    id,
    kind: 'audio',
    label: `Audio ${id}`,
    caption: null,
    credit: null,
    defaultRenditionId: 'primary-mp3',
    renditions: [{
      id: 'primary-mp3',
      purpose: 'primary',
      objectKey: `assets/audio/${id}/primary.mp3`,
      mediaType: 'audio/mpeg',
      byteSize: 256,
      sha256: '2'.repeat(64),
      metadata: { durationMs: 180000 },
    }],
    artworkAssetId,
  }
}

function videoAsset(id = 'ast_r12video1', posterAssetId = 'ast_r12postr1') {
  return {
    schemaVersion: 1,
    id,
    kind: 'video',
    label: `Video ${id}`,
    caption: null,
    credit: null,
    defaultRenditionId: 'primary-mp4',
    renditions: [{
      id: 'primary-mp4',
      purpose: 'primary',
      objectKey: `assets/video/${id}/primary.mp4`,
      mediaType: 'video/mp4',
      byteSize: 512,
      sha256: '3'.repeat(64),
      metadata: { width: 1920, height: 1080, durationMs: 120000, hasAudio: true },
    }],
    posterAssetId,
  }
}

function projectFor(primaryAssetId, coverAssetId, ogAssetId, galleryAssetIds = []) {
  const mediaItems = [primaryAssetId, ...galleryAssetIds].map((assetId, position) => ({ position, assetId }))
  return {
    schemaVersion: 1,
    id: 'prj_r12audio1',
    slug: 'r12-audio-project',
    title: 'R12 audio project',
    category: 'composition',
    gatewayCategoryIds: ['lyrics-composition'],
    roles: [],
    tags: [{ token: 'r12', label: 'R12' }],
    timing: { year: null, releaseDate: null },
    client: null,
    summary: '',
    description: '',
    post: {
      comment: '',
      mediaItems,
      tags: [{ token: 'r12', label: 'R12' }],
    },
    credits: [],
    externalLinks: [],
    relatedProjectIds: [],
    assets: {
      coverAssetId,
      backdropAssetId: null,
      primaryAssetId,
      galleryAssetIds,
    },
    featured: true,
    order: 1,
    seo: {
      title: 'R12 audio project | MMJ',
      description: '',
      ogAssetId,
      indexable: true,
    },
  }
}

function snapshot(assets, project) {
  return {
    assets,
    projects: [project],
    publicationCutoff: '2026-08-19T00:00:00.000Z',
    schemaVersion: 1,
    sourceDigest: 'a'.repeat(64),
  }
}

const noArtworkAudio = audioAsset()
const noArtworkProject = projectFor(noArtworkAudio.id, null, null)
const noArtworkSnapshot = snapshot([noArtworkAudio], noArtworkProject)

pass('audio primary without artwork admits null artwork cover and SEO OG', () => {
  validateSnapshot(clone(noArtworkSnapshot))
})

pass('R11 empty comment and R12 null visual companion compose without mutation', () => {
  const value = clone(noArtworkSnapshot)
  const before = canonicalDigest(value)
  validateSnapshot(value)
  const after = canonicalDigest(value)
  assert(before === after, 'snapshot mutated while admitting R12 null companion')
})

const artwork = imageAsset()
const withArtworkAudio = audioAsset('ast_r12audio2', artwork.id)
const withArtworkProject = projectFor(withArtworkAudio.id, artwork.id, artwork.id)
const withArtworkSnapshot = snapshot([withArtworkAudio, artwork], withArtworkProject)

pass('audio primary with explicit artwork binds exact cover and SEO OG image', () => {
  validateSnapshot(clone(withArtworkSnapshot))
})

reject('audio no-artwork cannot borrow gallery image as cover', 'E_MMJ_UI29_SNAPSHOT_INVALID', () => {
  const gallery = imageAsset('ast_r12gallry')
  const value = snapshot(
    [clone(noArtworkAudio), gallery],
    projectFor(noArtworkAudio.id, gallery.id, gallery.id, [gallery.id]),
  )
  validateSnapshot(value)
})

reject('audio no-artwork cannot use primary audio as cover', 'E_MMJ_UI29_SNAPSHOT_INVALID', () => {
  const value = clone(noArtworkSnapshot)
  value.projects[0].assets.coverAssetId = noArtworkAudio.id
  value.projects[0].seo.ogAssetId = noArtworkAudio.id
  validateSnapshot(value)
})

reject('audio artwork requires matching project cover', 'E_MMJ_UI29_SNAPSHOT_INVALID', () => {
  const value = clone(withArtworkSnapshot)
  value.projects[0].assets.coverAssetId = null
  validateSnapshot(value)
})

reject('audio artwork requires matching SEO OG companion', 'E_MMJ_UI29_SNAPSHOT_INVALID', () => {
  const value = clone(withArtworkSnapshot)
  value.projects[0].seo.ogAssetId = null
  validateSnapshot(value)
})

reject('audio artwork cover and SEO OG cannot diverge', 'E_MMJ_UI29_SNAPSHOT_INVALID', () => {
  const secondImage = imageAsset('ast_r12image2')
  const value = clone(withArtworkSnapshot)
  value.assets.push(secondImage)
  value.projects[0].seo.ogAssetId = secondImage.id
  validateSnapshot(value)
})

reject('explicit audio artwork must resolve to an image', 'E_MMJ_UI29_SNAPSHOT_INVALID', () => {
  const poster = imageAsset('ast_r12postr2')
  const wrongKind = videoAsset('ast_r12video2', poster.id)
  const audio = audioAsset('ast_r12audio3', wrongKind.id)
  const value = snapshot(
    [audio, wrongKind, poster],
    projectFor(audio.id, wrongKind.id, wrongKind.id),
  )
  validateSnapshot(value)
})

reject('broken explicit audio artwork remains rejected', 'E_MMJ_UI29_SNAPSHOT_INVALID', () => {
  const missingId = 'ast_r12missng'
  const audio = audioAsset('ast_r12audio4', missingId)
  const value = snapshot(
    [audio],
    projectFor(audio.id, missingId, missingId),
  )
  validateSnapshot(value)
})

reject('image primary still requires self-cover', 'E_MMJ_UI29_SNAPSHOT_INVALID', () => {
  const image = imageAsset('ast_r12image3')
  const value = snapshot([image], projectFor(image.id, null, null))
  validateSnapshot(value)
})

pass('image primary exact self-cover remains admitted', () => {
  const image = imageAsset('ast_r12image4')
  const value = snapshot([image], projectFor(image.id, image.id, image.id))
  validateSnapshot(value)
})

pass('video primary with required poster and exact cover remains admitted', () => {
  const poster = imageAsset('ast_r12postr3')
  const video = videoAsset('ast_r12video3', poster.id)
  const value = snapshot([video, poster], projectFor(video.id, poster.id, poster.id))
  validateSnapshot(value)
})

reject('video primary still rejects null project cover', 'E_MMJ_UI29_SNAPSHOT_INVALID', () => {
  const poster = imageAsset('ast_r12postr4')
  const video = videoAsset('ast_r12video4', poster.id)
  const value = snapshot([video, poster], projectFor(video.id, null, null))
  validateSnapshot(value)
})

reject('null project cover key cannot be omitted', 'E_MMJ_UI29_SNAPSHOT_INVALID', () => {
  const value = clone(noArtworkSnapshot)
  delete value.projects[0].assets.coverAssetId
  validateSnapshot(value)
})

reject('null SEO OG key cannot be omitted', 'E_MMJ_UI29_SNAPSHOT_INVALID', () => {
  const value = clone(noArtworkSnapshot)
  delete value.projects[0].seo.ogAssetId
  validateSnapshot(value)
})

reject('audio artwork key cannot be omitted', 'E_MMJ_UI29_SNAPSHOT_INVALID', () => {
  const value = clone(noArtworkSnapshot)
  delete value.assets[0].artworkAssetId
  validateSnapshot(value)
})

reject('empty-string cover is not canonical absence', 'E_MMJ_UI29_SNAPSHOT_INVALID', () => {
  const value = clone(noArtworkSnapshot)
  value.projects[0].assets.coverAssetId = ''
  validateSnapshot(value)
})

reject('empty-string artwork is not canonical absence', 'E_MMJ_UI29_SNAPSHOT_INVALID', () => {
  const value = clone(noArtworkSnapshot)
  value.assets[0].artworkAssetId = ''
  validateSnapshot(value)
})

reject('empty-string SEO OG is not canonical absence', 'E_MMJ_UI29_SNAPSHOT_INVALID', () => {
  const value = clone(noArtworkSnapshot)
  value.projects[0].seo.ogAssetId = ''
  validateSnapshot(value)
})

const queryModule = await importMmjSharedTypeScriptModule(
  process.cwd(),
  'shared/query/portfolio-snapshot-query.ts',
)
const viewModule = await importMmjSharedTypeScriptModule(
  process.cwd(),
  'shared/resolver/portfolio-project-view-resolver.ts',
)

pass('resolver preserves null cover and null SEO OG without fabricated asset', () => {
  const value = clone(noArtworkSnapshot)
  const queries = queryModule.createPortfolioSnapshotQueryAuthority(value)
  const views = viewModule.createPortfolioProjectViewResolver(value, queries)
  const card = views.findProjectCardById(value.projects[0].id)
  const showcase = views.findShowcaseById(value.projects[0].id)
  const related = views.findRelatedProjectById(value.projects[0].id)
  const detail = views.findWorkDetailById(value.projects[0].id)
  assert(card?.cover === null, 'card cover did not preserve null')
  assert(showcase?.cover === null, 'showcase cover did not preserve null')
  assert(related?.cover === null, 'related cover did not preserve null')
  assert(detail?.assets.cover === null, 'detail cover did not preserve null')
  assert(detail?.seo.ogAsset === null, 'detail SEO OG did not preserve null')
  assert(detail?.assets.primary?.kind === 'audio', 'audio primary was not preserved')
  assert(detail?.assets.primary?.artwork === null, 'audio artwork was fabricated')
})

pass('resolver preserves explicit audio artwork identity', () => {
  const value = clone(withArtworkSnapshot)
  const queries = queryModule.createPortfolioSnapshotQueryAuthority(value)
  const views = viewModule.createPortfolioProjectViewResolver(value, queries)
  const detail = views.findWorkDetailById(value.projects[0].id)
  assert(detail?.assets.cover?.id === artwork.id, 'resolved cover artwork drifted')
  assert(detail?.seo.ogAsset?.id === artwork.id, 'resolved SEO OG artwork drifted')
  assert(detail?.assets.primary?.kind === 'audio', 'resolved primary kind drifted')
  assert(detail?.assets.primary?.artwork?.id === artwork.id, 'resolved audio artwork drifted')
})

console.log(JSON.stringify({
  event: 'PASS_MMJ_PUBLIC_R12_OPTIONAL_AUDIO_ARTWORK_AND_NULLABLE_COVER_PARITY_R1_TEST',
  testCount: passCount,
}))
