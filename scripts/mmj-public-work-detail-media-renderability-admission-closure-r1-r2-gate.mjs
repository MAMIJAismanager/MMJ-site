import assert from 'node:assert/strict'
import { access, readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const PATCH = 'MMJ-PUBLIC-WORK-DETAIL-MEDIA-RENDERABILITY-ADMISSION-CLOSURE-R1-R2'
const root = process.cwd()
const read = rel => readFile(resolve(root, rel), 'utf8')
const exists = async rel => {
  try { await access(resolve(root, rel)); return true } catch { return false }
}

const [
  pkgText,
  lockText,
  authority,
  runtime,
  contract,
  boundary,
  r1Test,
  r1Gate,
] = await Promise.all([
  read('package.json'),
  read('package-lock.json'),
  read('shared/resolver/media-renderability.ts'),
  read('shared/resolver/media-resolution.ts'),
  read('scripts/lib/mmj-ui29-public-contract.mjs'),
  read('scripts/public-boundary-gate.mjs'),
  read('scripts/mmj-public-work-detail-media-renderability-admission-closure-r1-test.mjs'),
  read('scripts/mmj-public-work-detail-media-renderability-admission-closure-r1-gate.mjs'),
])
const pkg = JSON.parse(pkgText)
const lock = JSON.parse(lockText)

assert.equal(pkg.engines?.node, '>=22.18.0')
assert.equal(lock.packages?.['']?.engines?.node, '>=22.18.0')
assert.equal(pkg.mmjWorkDetailMediaRenderabilityAdmissionClosureR1R2Release, PATCH)
assert.equal(
  pkg.scripts?.['gate:public-work-detail-media-renderability-admission-closure-r1-r2'],
  'node scripts/mmj-public-work-detail-media-renderability-admission-closure-r1-test.mjs && node scripts/mmj-public-work-detail-media-renderability-admission-closure-r1-gate.mjs && node scripts/mmj-public-work-detail-media-renderability-admission-closure-r1-r2-test.mjs && node scripts/mmj-public-work-detail-media-renderability-admission-closure-r1-r2-gate.mjs',
)
assert.match(pkg.scripts?.['gate:mmj-ui29-a'] ?? '', /gate:public-work-detail-media-renderability-admission-closure-r1-r2/)
assert.doesNotMatch(pkg.scripts?.['gate:mmj-ui29-a'] ?? '', /gate:public-work-detail-media-renderability-admission-closure-r1(?:\s|$)/)
assert.ok((pkg.scripts?.['gate:mmj-ui29-a'] ?? '').indexOf('npm run generate:local') < (pkg.scripts?.['gate:mmj-ui29-a'] ?? '').indexOf('npm run gate:public-work-detail-media-renderability-admission-closure-r1-r2'))

assert.equal(await exists('shared/resolver/media-renderability.mjs'), false)
assert.equal(await exists('shared/resolver/media-renderability.d.mts'), false)
assert.equal(await exists('shared/resolver/media-renderability.ts'), true)
assert.match(authority, /PRIMARY_RENDITION_PURPOSE: 'primary' = 'primary'/)
assert.match(authority, /rendition\.purpose === PRIMARY_RENDITION_PURPOSE/)
assert.match(authority, /hasExactPrimaryRendition/)
assert.doesNotMatch(authority, /process\.env|useRuntimeConfig|document|window|fetch\s*\(|node:fs|node:path/)

assert.match(runtime, /from '\.\/media-renderability'/)
assert.doesNotMatch(runtime, /media-renderability\.mjs/)
assert.match(runtime, /'missing-primary-source'/)
assert.match(contract, /from '\.\.\/\.\.\/shared\/resolver\/media-renderability\.ts'/)
assert.doesNotMatch(contract, /media-renderability\.mjs/)
assert.match(contract, /E_MMJ_PUBLIC_WORK_MEDIA_PRIMARY_SOURCE_MISSING/)
assert.match(r1Test, /media-renderability\.ts/)
assert.doesNotMatch(r1Test, /media-renderability\.mjs/)
assert.match(r1Gate, /shared\/resolver\/media-renderability\.ts/)
assert.doesNotMatch(r1Gate, /media-renderability\.mjs/)

assert.match(boundary, /'shared\/resolver\/media-renderability\.ts'/)
assert.doesNotMatch(boundary, /'shared\/resolver\/media-renderability\.mjs'/)
assert.doesNotMatch(boundary, /'shared\/resolver\/media-renderability\.d\.mts'/)

const workflowDir = resolve(root, '.github/workflows')
const workflowFiles = (await readdir(workflowDir)).filter(name => /\.ya?ml$/i.test(name))
let pinnedNodeCount = 0
for (const name of workflowFiles) {
  const source = await read(`.github/workflows/${name}`)
  assert.doesNotMatch(source, /node-version:\s*['"]?22\.16\.0['"]?/)
  const matches = source.match(/node-version:\s*['"]22\.18\.0['"]/g) ?? []
  pinnedNodeCount += matches.length
}
assert.ok(pinnedNodeCount >= 1)

for (const source of [authority, runtime, contract, r1Test, r1Gate]) {
  assert.doesNotMatch(source, /D:\\11124\\m2|D:\/11124\/m2/i)
  assert.doesNotMatch(source, /\.\.\/\.\.\/\.\.\/shared\/resolver\/media-renderability/)
}

const forbiddenPurposeCoercions = [
  /thumbnail\s*=>\s*primary/i,
  /preview\s*=>\s*primary/i,
  /download\s*=>\s*primary/i,
  /renditions\s*\[\s*0\s*\].*primary/i,
]
for (const pattern of forbiddenPurposeCoercions) {
  assert.doesNotMatch(authority, pattern)
  assert.doesNotMatch(contract, pattern)
}

console.log('PASS_RUNTIME_MODULE_OWNERSHIP_REBASE')
console.log('PASS_TYPESCRIPT_SHARED_AUTHORITY')
console.log('PASS_MJS_EXTERNALIZATION_RETIREMENT')
console.log('PASS_D_MTS_SHIM_RETIREMENT')
console.log('PASS_NODE_22_18_BUILD_RUNTIME_PIN')
console.log('PASS_SHARED_AUTHORITY_SINGLE_FILE_IDENTITY')
console.log('PASS_EXACT_PRIMARY_SEMANTIC_PRESERVED')
console.log('PASS_NO_PURPOSE_GUESSING')
console.log('PASS_PUBLIC_BOUNDARY_EXACT_ALLOWLIST')
console.log('PASS_NO_FILESYSTEM_ESCAPE')
console.log('PASS_NO_PARENT_ROOT_RESOLUTION')
console.log('PASS_NO_ABSOLUTE_PATH_BINDING')
console.log('PASS_EXACT_PRIMARY_RENDITION_AUTHORITY_PRESERVATION')
console.log('PASS_MMJ_PUBLIC_WORK_DETAIL_MEDIA_RENDERABILITY_ADMISSION_CLOSURE_R1_R2_GATE')
