import assert from 'node:assert/strict'

import {
  MMJ_PUBLIC_RELEASE_MANIFEST_SCHEMA_VERSION,
  buildPublicReleaseBootstrapSource,
  parsePublicReleaseManifest,
  publicReleaseRebootstrapKey,
  resolvePublicReleaseFreshnessDecision,
  stripPublicReleaseQuery,
  withPublicReleaseRevision,
} from '../shared/release/public-release-contract.ts'

const A = '1111111111111111111111111111111111111111'
const B = '2222222222222222222222222222222222222222'

assert.deepEqual(parsePublicReleaseManifest({
  schemaVersion: MMJ_PUBLIC_RELEASE_MANIFEST_SCHEMA_VERSION,
  revision: B,
}), {
  schemaVersion: 1,
  revision: B,
})
assert.equal(parsePublicReleaseManifest({ schemaVersion: 1, revision: 'bad' }), null)

assert.equal(resolvePublicReleaseFreshnessDecision(A, A, false), 'current')
assert.equal(resolvePublicReleaseFreshnessDecision(A, B, false), 'rebootstrap')
assert.equal(resolvePublicReleaseFreshnessDecision(A, B, true), 'propagation-pending')
assert.equal(resolvePublicReleaseFreshnessDecision('development', B, false), 'ignore')

assert.equal(publicReleaseRebootstrapKey(B), `mmj-release-rebootstrap:${B}`)

const rebound = withPublicReleaseRevision(
  'https://mamajing.work/works?page=2#grid',
  B,
  'nonce-1',
)
const reboundUrl = new URL(rebound)
assert.equal(reboundUrl.pathname, '/works')
assert.equal(reboundUrl.searchParams.get('page'), '2')
assert.equal(reboundUrl.searchParams.get('mmj_rev'), B)
assert.equal(reboundUrl.searchParams.get('mmj_probe'), 'nonce-1')
assert.equal(reboundUrl.hash, '#grid')

const clean = new URL(stripPublicReleaseQuery(rebound))
assert.equal(clean.searchParams.get('page'), '2')
assert.equal(clean.searchParams.has('mmj_rev'), false)
assert.equal(clean.searchParams.has('mmj_probe'), false)
assert.equal(clean.hash, '#grid')

const bootstrap = buildPublicReleaseBootstrapSource(A)
assert.ok(bootstrap.includes("cache:'no-store'"))
assert.ok(bootstrap.includes('location.replace('))
assert.ok(bootstrap.includes('sessionStorage.getItem(marker)'))
assert.equal(bootstrap.includes('location.reload('), false)
assert.equal(buildPublicReleaseBootstrapSource('development'), '')

console.log('PASS_BUILD_UNIQUE_RELEASE_REVISION_CONTRACT')
console.log('PASS_STALE_HTML_REVISION_DECISION')
console.log('PASS_ONE_SHOT_REBOOT_DECISION')
console.log('PASS_QUERY_AND_HASH_PRESERVATION')
console.log('PASS_INLINE_PRE_NUXT_FRESHNESS_BOOTSTRAP')
console.log('PASS_MMJ_UI29_PUBLIC_RELEASE_FRESHNESS_AUTHORITY_R1')
