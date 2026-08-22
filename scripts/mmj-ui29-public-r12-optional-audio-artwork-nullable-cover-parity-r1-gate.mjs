import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const contract = await readFile(new URL('./lib/mmj-ui29-public-contract.mjs', import.meta.url), 'utf8')
const projectTypes = await readFile(new URL('../shared/types/project.ts', import.meta.url), 'utf8')
const viewTypes = await readFile(new URL('../shared/view/portfolio-project-view.ts', import.meta.url), 'utf8')
const resolver = await readFile(new URL('../shared/resolver/portfolio-project-view-resolver.ts', import.meta.url), 'utf8')
const cardMedia = await readFile(new URL('../app/components/project/ProjectCardMedia.vue', import.meta.url), 'utf8')
const related = await readFile(new URL('../app/components/work/WorkRelatedProjects.vue', import.meta.url), 'utf8')
const showcase = await readFile(new URL('../app/components/showcase/ProjectShowcaseStage.vue', import.meta.url), 'utf8')

assert.match(contract, /if \(kind === 'audio'\) nullableString\(value\.artworkAssetId/)
assert.match(contract, /nullableString\(value\.assets\.coverAssetId/)
assert.match(contract, /nullableString\(value\.seo\.ogAssetId/)
assert.match(contract, /const validateProjectVisualCompanion =/)
assert.match(contract, /primary\.kind === 'image'/)
assert.match(contract, /primary\.kind === 'video'/)
assert.match(contract, /primary\.artworkAssetId/)
assert.match(contract, /project\.assets\.coverAssetId !== expectedCoverAssetId/)
assert.match(contract, /project\.seo\.ogAssetId !== expectedCoverAssetId/)
assert.match(contract, /asset\.kind === 'audio' && asset\.artworkAssetId !== null/)
assert.match(contract, /if \(project\.assets\.coverAssetId !== null\)/)
assert.match(contract, /if \(project\.seo\.ogAssetId !== null\)/)

assert.match(projectTypes, /readonly coverAssetId: AssetId \| null/)
assert.match(viewTypes, /readonly cover: ResolvedImageAssetReference \| null/)
assert.match(resolver, /project\.assets\.coverAssetId === null\s*\? null/)
assert.match(cardMedia, /readonly cover: ResolvedImageAssetReference \| null/)
assert.match(cardMedia, /props\.cover === null\s*\? null/)
assert.match(related, /if \(project\.cover === null\) return null/)
assert.match(showcase, /return project\.backdrop \?\? project\.cover/)
assert.match(showcase, /if \(asset === null\) return null/)

for (const source of [contract, resolver, cardMedia, related]) {
  assert.doesNotMatch(source, /coverAssetId\s*\|\|\s*primaryAssetId/)
  assert.doesNotMatch(source, /coverAssetId\s*\?\?\s*primaryAssetId/)
  assert.doesNotMatch(source, /coverAssetId\s*\|\|\s*galleryAssetIds\s*\[\s*0\s*\]/)
  assert.doesNotMatch(source, /coverAssetId\s*\?\?\s*galleryAssetIds\s*\[\s*0\s*\]/)
  assert.doesNotMatch(source, /default-cover|placeholder-cover|fallback-cover/i)
}

console.log(JSON.stringify({
  event: 'PASS_MMJ_PUBLIC_R12_OPTIONAL_AUDIO_ARTWORK_AND_NULLABLE_COVER_PARITY_R1_STATIC_GATE',
  optionalAudioArtwork: true,
  nullableProjectCover: true,
  nullableSeoOg: true,
  exactCompanionParity: true,
  nullGraphRootElision: true,
  nullableViewPropagation: true,
  syntheticCoverFallback: false,
}))
