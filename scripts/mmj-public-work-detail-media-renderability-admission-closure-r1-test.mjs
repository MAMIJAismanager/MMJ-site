import assert from 'node:assert/strict'

import {
  validateSnapshot,
} from './lib/mmj-ui29-public-contract.mjs'
import {
  hasExactPrimaryRendition,
} from '../shared/resolver/media-renderability.ts'

const PATCH = 'MMJ-PUBLIC-WORK-DETAIL-MEDIA-RENDERABILITY-ADMISSION-CLOSURE-R1'
const HEX_A = 'a'.repeat(64)
const HEX_B = 'b'.repeat(64)

function imageAsset({
  id,
  purposes = ['primary'],
  defaultIndex = 0,
  label = 'Fixture image',
}) {
  const renditions = purposes.map((purpose, index) => ({
    id: `rend_${id.slice(4)}_${index}`,
    purpose,
    objectKey: `assets/image/${id}/image-${index}.webp`,
    mediaType: 'image/webp',
    byteSize: 100 + index,
    sha256: HEX_A,
    metadata: { width: 64, height: 64 },
  }))
  return {
    schemaVersion: 1,
    id,
    kind: 'image',
    label,
    caption: null,
    credit: null,
    defaultRenditionId: renditions[defaultIndex].id,
    renditions,
    altText: label,
  }
}

function videoAsset({ id, posterAssetId, purposes = ['primary'] }) {
  const renditions = purposes.map((purpose, index) => ({
    id: `rend_${id.slice(4)}_${index}`,
    purpose,
    objectKey: `assets/video/${id}/video-${index}.mp4`,
    mediaType: 'video/mp4',
    byteSize: 200 + index,
    sha256: HEX_A,
    metadata: { width: 64, height: 64, durationMs: 1000, hasAudio: true },
  }))
  return {
    schemaVersion: 1,
    id,
    kind: 'video',
    label: 'Fixture video',
    caption: null,
    credit: null,
    defaultRenditionId: renditions[0].id,
    renditions,
    posterAssetId,
  }
}

function audioAsset({ id, artworkAssetId, purposes = ['primary'] }) {
  const renditions = purposes.map((purpose, index) => ({
    id: `rend_${id.slice(4)}_${index}`,
    purpose,
    objectKey: `assets/audio/${id}/audio-${index}.mp3`,
    mediaType: 'audio/mpeg',
    byteSize: 300 + index,
    sha256: HEX_A,
    metadata: { durationMs: 1000 },
  }))
  return {
    schemaVersion: 1,
    id,
    kind: 'audio',
    label: 'Fixture audio',
    caption: null,
    credit: null,
    defaultRenditionId: renditions[0].id,
    renditions,
    artworkAssetId,
  }
}

function project({
  id = 'prj_fixture01',
  slug = 'fixture',
  coverAssetId,
  primaryAssetId,
  galleryAssetIds = [],
  ogAssetId = coverAssetId,
}) {
  const tag = { token: 'fixture', label: 'Fixture' }
  const mediaAssetIds = [primaryAssetId, ...galleryAssetIds]
  return {
    schemaVersion: 1,
    id,
    slug,
    title: 'Fixture',
    category: 'choreography',
    gatewayCategoryIds: ['choreography'],
    roles: [],
    tags: [tag],
    timing: { year: null, releaseDate: null },
    client: null,
    summary: 'Fixture summary',
    description: 'Fixture description',
    post: {
      comment: 'Fixture description',
      mediaItems: mediaAssetIds.map((assetId, position) => ({ position, assetId })),
      tags: [tag],
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
    featured: false,
    order: 0,
    seo: {
      title: 'Fixture',
      description: 'Fixture description',
      ogAssetId,
      indexable: false,
    },
  }
}

function snapshot(projects, assets) {
  return {
    schemaVersion: 1,
    sourceDigest: HEX_B,
    publicationCutoff: '2026-08-11T00:00:00.000Z',
    projects,
    assets,
  }
}

function expectRenderabilityFailure(value, expected) {
  assert.throws(
    () => validateSnapshot(value),
    error => {
      assert.equal(error?.code, 'E_MMJ_PUBLIC_WORK_MEDIA_PRIMARY_SOURCE_MISSING')
      assert.equal(error?.details?.projectId, expected.projectId)
      assert.equal(error?.details?.route, expected.route)
      assert.equal(error?.details?.assetId, expected.assetId)
      assert.equal(error?.details?.intent, expected.intent)
      assert.equal(error?.details?.reason, 'missing-primary-source')
      return true
    },
  )
}

assert.equal(hasExactPrimaryRendition([{ purpose: 'primary' }]), true)
assert.equal(hasExactPrimaryRendition([{ purpose: 'thumbnail' }]), false)
assert.equal(hasExactPrimaryRendition([{ purpose: 'preview' }]), false)
assert.equal(hasExactPrimaryRendition([{ purpose: 'download' }]), false)
assert.equal(hasExactPrimaryRendition([{ purpose: 'thumbnail' }, { purpose: 'primary' }]), true)

{
  const primary = imageAsset({ id: 'ast_primary01' })
  const result = validateSnapshot(snapshot([
    project({ coverAssetId: primary.id, primaryAssetId: primary.id }),
  ], [primary]))
  assert.deepEqual(result.routes, ['/works/fixture'])
}

{
  const cover = imageAsset({ id: 'ast_cover0001' })
  const primary = imageAsset({ id: 'ast_badprim01', purposes: ['thumbnail', 'download'] })
  expectRenderabilityFailure(snapshot([
    project({ coverAssetId: cover.id, primaryAssetId: primary.id }),
  ], [cover, primary]), {
    projectId: 'prj_fixture01',
    route: '/works/fixture',
    assetId: primary.id,
    intent: 'primary',
  })
}

{
  const cover = imageAsset({ id: 'ast_cover0002' })
  const poster = imageAsset({ id: 'ast_badpost01', purposes: ['thumbnail'] })
  const primary = videoAsset({ id: 'ast_video0001', posterAssetId: poster.id })
  expectRenderabilityFailure(snapshot([
    project({ coverAssetId: cover.id, primaryAssetId: primary.id }),
  ], [cover, primary, poster]), {
    projectId: 'prj_fixture01',
    route: '/works/fixture',
    assetId: poster.id,
    intent: 'video-poster',
  })
}

{
  const cover = imageAsset({ id: 'ast_cover0003' })
  const artwork = imageAsset({ id: 'ast_badart001', purposes: ['download'] })
  const primary = audioAsset({ id: 'ast_audio0001', artworkAssetId: artwork.id })
  expectRenderabilityFailure(snapshot([
    project({ coverAssetId: cover.id, primaryAssetId: primary.id }),
  ], [cover, primary, artwork]), {
    projectId: 'prj_fixture01',
    route: '/works/fixture',
    assetId: artwork.id,
    intent: 'audio-artwork',
  })
}

{
  const cover = imageAsset({ id: 'ast_cover0004' })
  const primary = imageAsset({ id: 'ast_primary02' })
  const poster = imageAsset({ id: 'ast_poster002' })
  const galleryVideo = videoAsset({
    id: 'ast_video0002',
    posterAssetId: poster.id,
    purposes: ['preview'],
  })
  const result = validateSnapshot(snapshot([
    project({
      coverAssetId: cover.id,
      primaryAssetId: primary.id,
      galleryAssetIds: [galleryVideo.id],
    }),
  ], [cover, primary, galleryVideo, poster]))
  assert.deepEqual(result.routes, ['/works/fixture'])
}

console.log(JSON.stringify({
  event: 'PASS_MMJ_PUBLIC_WORK_DETAIL_MEDIA_RENDERABILITY_ADMISSION_CLOSURE_R1',
  release: PATCH,
  exactPrimaryPurpose: true,
  noPurposeGuessing: true,
  handoffPrimaryAdmission: true,
  videoPosterRenderability: true,
  audioArtworkRenderability: true,
  routeDiagnosticIdentity: true,
  intentSpecificAdmission: true,
}))
