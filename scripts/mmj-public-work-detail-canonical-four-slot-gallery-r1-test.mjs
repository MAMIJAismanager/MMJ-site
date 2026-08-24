import assert from 'node:assert/strict'

import {
  createWorkDetailGalleryPresentationR1,
  WorkDetailGalleryPresentationError,
} from '../shared/resolver/work-detail-gallery-presentation.ts'

const asset = id => Object.freeze({ id, kind: 'image' })
const primary = asset('ast_primary')
const secondary1 = asset('ast_secondary1')
const secondary2 = asset('ast_secondary2')
const secondary3 = asset('ast_secondary3')

const project = gallery => ({
  id: 'prj_galleryr1',
  assets: {
    primary,
    gallery,
  },
})

const one = createWorkDetailGalleryPresentationR1(project([]))
assert.equal(one?.canonicalHero.id, primary.id)
assert.deepEqual(one?.thumbnails.map(item => item.id), [])
assert.equal(Object.isFrozen(one), true)
assert.equal(Object.isFrozen(one?.thumbnails), true)

const four = createWorkDetailGalleryPresentationR1(
  project([secondary1, secondary2, secondary3]),
)
assert.equal(four?.canonicalHero.id, primary.id)
assert.deepEqual(
  four?.thumbnails.map(item => item.id),
  [secondary1.id, secondary2.id, secondary3.id],
)

const noPrimary = createWorkDetailGalleryPresentationR1({
  id: 'prj_gallerynone',
  assets: { primary: null, gallery: [] },
})
assert.equal(noPrimary, null)

assert.throws(
  () => createWorkDetailGalleryPresentationR1(project([
    secondary1,
    secondary2,
    secondary3,
    asset('ast_secondary4'),
  ])),
  error => (
    error instanceof WorkDetailGalleryPresentationError
    && error.code === 'work-detail-gallery-too-many-secondary-assets'
  ),
)

assert.throws(
  () => createWorkDetailGalleryPresentationR1(project([secondary1, secondary1])),
  error => (
    error instanceof WorkDetailGalleryPresentationError
    && error.code === 'work-detail-gallery-secondary-duplicate'
  ),
)

console.log(JSON.stringify({
  event: 'PASS_MMJ_PUBLIC_WORK_DETAIL_CANONICAL_FOUR_SLOT_GALLERY_R1_RUNTIME',
  canonicalHeroFromSlot0: true,
  secondaryThumbnailsFromSlots1To3: true,
  maximumSlots: 4,
  newMediaSsotCount: 0,
  galleryOrderPreserved: true,
}))
