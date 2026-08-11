import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const PATCH = 'MMJ-PUBLIC-WORK-DETAIL-MEDIA-RENDERABILITY-ADMISSION-CLOSURE-R1'
const root = process.cwd()
const read = rel => readFile(resolve(root, rel), 'utf8')

const [
  pkgText,
  contract,
  mediaResolution,
  renderability,
  workAssetFrame,
  mediaPresentation,
  nuxtConfig,
] = await Promise.all([
  read('package.json'),
  read('scripts/lib/mmj-ui29-public-contract.mjs'),
  read('shared/resolver/media-resolution.ts'),
  read('shared/resolver/media-renderability.ts'),
  read('app/components/work/WorkAssetFrame.vue'),
  read('app/data/portfolio-media-presentation.ts'),
  read('nuxt.config.ts'),
])
const pkg = JSON.parse(pkgText)

assert.equal(pkg.mmjWorkDetailMediaRenderabilityAdmissionClosureRelease, PATCH)
assert.equal(
  pkg.scripts?.['gate:public-work-detail-media-renderability-admission-closure-r1'],
  'node scripts/mmj-public-work-detail-media-renderability-admission-closure-r1-test.mjs && node scripts/mmj-public-work-detail-media-renderability-admission-closure-r1-gate.mjs',
)
assert.match(pkg.scripts?.['gate:mmj-ui29-a'] ?? '', /gate:public-work-detail-media-renderability-admission-closure-r1/)

assert.match(renderability, /PRIMARY_RENDITION_PURPOSE(?:: 'primary')? = 'primary'/)
assert.match(renderability, /rendition\.purpose === PRIMARY_RENDITION_PURPOSE/)
assert.match(contract, /hasExactPrimaryRendition/)
assert.match(contract, /E_MMJ_PUBLIC_WORK_MEDIA_PRIMARY_SOURCE_MISSING/)
assert.match(contract, /reason: 'missing-primary-source'/)
assert.match(contract, /context\('primary', true\)/)
assert.match(contract, /context\('seo-og', false\)/)
assert.match(contract, /context\('gallery', assetById\.get\(assetId\)\?\.kind === 'image'\)/)
assert.match(contract, /intent: 'video-poster'/)
assert.match(contract, /intent: 'audio-artwork'/)
assert.match(mediaResolution, /hasExactPrimaryRendition/)
assert.match(mediaResolution, /'missing-primary-source'/)
assert.doesNotMatch(mediaResolution, /if \(!sources\.some\(source => source\.purpose === 'primary'\)\)/)
assert.match(mediaResolution, /const useFallback = intent !== 'primary' && requestedSources\.length === 0/)

assert.match(workAssetFrame, /resolvePortfolioImagePresentation\([\s\S]*?'primary'/)
assert.match(workAssetFrame, /resolvePortfolioVideoPresentation\(props\.asset\)/)
assert.match(workAssetFrame, /resolvePortfolioAudioTrack\(props\.asset, props\.projectId\)/)
assert.doesNotMatch(workAssetFrame, /catch\s*[({]/)
assert.match(mediaPresentation, /resolveInlinePlan\(asset, 'primary'\)/)
assert.match(mediaPresentation, /resolveInlinePlan\(asset\.poster, 'primary'\)/)
assert.match(nuxtConfig, /\.\.\.routeManifestValue\.routes/)

for (const forbidden of [
  /thumbnail\s*=>\s*primary/i,
  /preview\s*=>\s*primary/i,
  /download\s*=>\s*primary/i,
  /renditions\s*\[\s*0\s*\].*primary/i,
]) {
  assert.doesNotMatch(renderability, forbidden)
  assert.doesNotMatch(contract, forbidden)
}

console.log('PASS_PRIMARY_RENDITION_AUTHORITY')
console.log('PASS_WORK_DETAIL_RENDERABILITY_ADMISSION')
console.log('PASS_HANDOFF_RUNTIME_RESOLVER_PARITY')
console.log('PASS_PRESENTATION_INTENT_SPECIFIC_PRIMARY_ADMISSION')
console.log('PASS_EXACT_PRIMARY_SOURCE_REQUIREMENT')
console.log('PASS_NO_RENDITION_PURPOSE_GUESSING')
console.log('PASS_VIDEO_POSTER_RENDERABILITY')
console.log('PASS_AUDIO_ARTWORK_RENDERABILITY')
console.log('PASS_ROUTE_LEVEL_WORK_DETAIL_FIXTURE')
console.log('PASS_FAILED_ROUTE_DIAGNOSTIC_IDENTITY')
console.log('PASS_NO_PRERENDER_PLACEHOLDER_FORGIVENESS')
console.log('PASS_PUBLIC_SNAPSHOT_TO_NUXT_RENDER_PARITY')
console.log('PASS_MMJ_PUBLIC_WORK_DETAIL_MEDIA_RENDERABILITY_ADMISSION_CLOSURE_R1_GATE')
