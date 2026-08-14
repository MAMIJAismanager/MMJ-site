import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')

const [
  contract,
  plugin,
  nuxtConfig,
  pagesWorkflow,
  emitter,
  verifier,
  publicBoundaryGate,
  packageText,
] = await Promise.all([
  read('shared/release/public-release-contract.ts'),
  read('app/plugins/public-release-freshness.client.ts'),
  read('nuxt.config.ts'),
  read('.github/workflows/pages.yml'),
  read('scripts/mmj-ui29-public-release-manifest-emit.mjs'),
  read('scripts/mmj-ui29-public-release-manifest-verify.mjs'),
  read('scripts/public-boundary-gate.mjs'),
  read('package.json'),
])

const pkg = JSON.parse(packageText)
const release = 'MMJ-UI29-PUBLIC-RELEASE-FRESHNESS-AUTHORITY-R1'

for (const token of [
  "MMJ_PUBLIC_RELEASE_QUERY_KEY = 'mmj_rev'",
  "MMJ_PUBLIC_RELEASE_REBOOT_PREFIX = 'mmj-release-rebootstrap:'",
  'parsePublicReleaseManifest(',
  'resolvePublicReleaseFreshnessDecision(',
  'buildPublicReleaseBootstrapSource(',
  'location.replace(next.toString())',
  "cache:'no-store'",
]) {
  assert.ok(contract.includes(token), `release contract missing: ${token}`)
}
assert.equal(contract.includes('location.reload('), false, 'hard reload authority forbidden')

for (const token of [
  "new URL('/mmj-release.json', window.location.origin)",
  "cache: 'no-store'",
  "nuxtApp.hook('app:mounted'",
  "window.addEventListener('pageshow'",
  "document.addEventListener('visibilitychange'",
  'window.location.replace(',
  'window.sessionStorage.setItem(',
]) {
  assert.ok(plugin.includes(token), `client freshness authority missing: ${token}`)
}
for (const forbidden of [
  'location.reload(',
  'caches.delete(',
  'navigator.serviceWorker.register(',
  'setInterval(',
]) {
  assert.equal(plugin.includes(forbidden), false, `forbidden cache workaround remains: ${forbidden}`)
}

for (const token of [
  "MMJ_PUBLIC_RELEASE_REVISION",
  "MMJ_PUBLIC_RELEASE_REQUIRED",
  "runtimeEnv.MMJ_PUBLIC_RELEASE_REQUIRED === '1'",
  'mmjPublicReleaseRevision: publicReleaseRevision',
  'buildPublicReleaseBootstrapSource(publicReleaseRevision)',
  "id: 'mmj-public-release-bootstrap'",
  'innerHTML: publicReleaseBootstrapSource',
]) {
  assert.ok(nuxtConfig.includes(token), `Nuxt release binding missing: ${token}`)
}

assert.ok(
  pagesWorkflow.includes("MMJ_PUBLIC_RELEASE_REQUIRED: '1'"),
  'explicit GitHub Pages release requirement missing',
)
assert.ok(
  pagesWorkflow.includes('MMJ_PUBLIC_RELEASE_REVISION: ${{ github.sha }}'),
  'GitHub SHA release binding missing',
)
assert.equal(
  nuxtConfig.includes("environmentClass === 'production'\n  && !isCanonicalPublicReleaseRevision"),
  false,
  'ambient production class must not make local typecheck require a release SHA',
)

for (const token of [
  "'mmj-release.json'",
  'MMJ_PUBLIC_RELEASE_REVISION',
  'schemaVersion: 1',
]) {
  assert.ok(emitter.includes(token), `manifest emitter missing: ${token}`)
}
assert.ok(verifier.includes('PASS_MMJ_PUBLIC_RELEASE_MANIFEST_VERIFY'))
assert.ok(
  publicBoundaryGate.includes("'shared/release/public-release-contract.ts'"),
  'public release contract must be explicitly allowlisted by public boundary',
)
console.log('PASS_PUBLIC_RELEASE_CONTRACT_BOUNDARY_ALLOWLIST_CLOSURE')

const gateName = 'gate:public-release-freshness-authority-r1'
const gateCommand = 'node --experimental-strip-types scripts/mmj-ui29-public-release-freshness-authority-r1-test.mjs && node scripts/mmj-ui29-public-release-freshness-authority-r1-gate.mjs'
assert.equal(pkg.scripts?.[gateName], gateCommand, 'package freshness gate binding drift')
assert.ok(String(pkg.scripts?.['gate:mmj-ui29-a'] ?? '').includes(`npm run ${gateName}`), 'aggregate gate missing freshness R1')
assert.ok(String(pkg.scripts?.['build:local'] ?? '').includes('mmj-ui29-public-release-manifest-emit.mjs'))
assert.ok(String(pkg.scripts?.['build:local'] ?? '').includes('mmj-ui29-public-release-manifest-verify.mjs'))
assert.ok(String(pkg.scripts?.['generate:local'] ?? '').includes('mmj-ui29-public-release-manifest-emit.mjs'))
assert.ok(String(pkg.scripts?.['generate:local'] ?? '').includes('mmj-ui29-public-release-manifest-verify.mjs'))
assert.equal(pkg.mmjUi29PublicReleaseFreshnessAuthorityR1Release, release, 'freshness release marker drift')

console.log('PASS_GITHUB_SHA_BUILD_REVISION_BINDING')
console.log('PASS_NUXT_INLINE_STALE_HTML_BOOTSTRAP')
console.log('PASS_CLIENT_LONG_LIVED_TAB_FRESHNESS_CHECK')
console.log('PASS_RELEASE_MANIFEST_OUTPUT_BINDING')
console.log('PASS_NO_GLOBAL_CACHE_DISABLE')
console.log('PASS_NO_USER_HARD_REFRESH_REQUIREMENT')
console.log('PASS_MMJ_UI29_PUBLIC_RELEASE_FRESHNESS_AUTHORITY_R1')
