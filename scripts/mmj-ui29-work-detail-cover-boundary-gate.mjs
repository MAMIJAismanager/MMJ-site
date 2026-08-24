import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')
const fail = message => { throw new Error(`E_MMJ_UI29_WORK_DETAIL_COVER_BOUNDARY_R1: ${message}`) }

const slugPage = await read('app/pages/works/[slug].vue')
const workDetailCss = await read('app/assets/css/work-detail.css')
const resolver = await read('shared/resolver/portfolio-project-view-resolver.ts')
const galleryResolver = await read('shared/resolver/work-detail-gallery-presentation.ts')
const workGallery = await read('app/components/work/WorkGallery.vue')

for (const forbidden of [
  'data-mm-work-cover',
  'context-label="대표 이미지"',
  ':asset="project.assets.cover"',
  'aria-label="대표 이미지"',
  'mm-work-detail__cover',
]) {
  if (slugPage.includes(forbidden)) fail(`cover body projection remains: ${forbidden}`)
}

for (const required of [
  'v-if="project.assets.primary !== null"',
  'data-mm-work-primary',
  'createWorkDetailGalleryPresentationR1(project)',
  ':presentation="galleryPresentation"',
  'useSeoMeta',
  'project.seo.ogAsset',
]) {
  if (!slugPage.includes(required)) fail(`detail authority missing: ${required}`)
}
for (const required of [
  'const canonicalHero = project.assets.primary',
  'canonicalHero,',
]) {
  if (!galleryResolver.includes(required)) fail(`canonical primary gallery authority missing: ${required}`)
}
for (const required of [
  'presentation.canonicalHero.id',
  ':video-runtime="isCanonicalHeroActive',
  ':audio-runtime="isCanonicalHeroActive',
  "'primary-detail'",
]) {
  if (!workGallery.includes(required)) fail(`primary media runtime authority missing: ${required}`)
}

if (workDetailCss.includes('.mm-work-detail__cover')) {
  fail('cover CSS residue remains')
}

for (const required of [
  'cover: assets.cover',
  'primary: assets.primary',
  'poster,',
  'ogAsset: assets.seoOg',
]) {
  if (!resolver.includes(required)) fail(`resolver authority missing: ${required}`)
}

console.log(JSON.stringify({
  event: 'PASS_MMJ_UI29_WORK_DETAIL_COVER_BOUNDARY_R1',
  detailCoverSurfaceCount: 0,
  primaryAuthorityPreserved: true,
  videoPosterAuthorityPreserved: true,
  cardCoverAuthorityPreserved: true,
  seoOgAuthorityPreserved: true,
  duplicateCoverSurfaceCount: 0,
}))
