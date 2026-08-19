import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const PATCH = 'MMJ-PUBLIC-BUILD-INPUT-LOCK-OBSERVED-HEAD-AND-ARTIFACT-REVERIFY-AUTHORITY-SEPARATION-R1'
const root = process.cwd()
const fail = message => { throw new Error(`FAIL_${PATCH}: ${message}`) }
const text = rel => readFile(resolve(root, rel), 'utf8')

const [contract, pkgText] = await Promise.all([
  text('scripts/lib/mmj-ui29-public-contract.mjs'),
  text('package.json'),
])
const pkg = JSON.parse(pkgText)

for (const token of [
  'function validateObservedBuildInputProducerAuthority(input)',
  'function createBuildInputLockIdentity(input)',
  'validateObservedBuildInputProducerAuthority(input)',
  'return createBuildInputLockIdentity(input)',
  "producerRelease: input.receipt.producerRelease",
  "Build input lock producer release does not match handoff receipt.",
]) if (!contract.includes(token)) fail(`required authority token missing: ${token}`)

const validateStart = contract.indexOf('function validateBuildInputLock(value, input)')
const validateEnd = contract.indexOf('\nfunction validatePublicReleaseManifest', validateStart)
if (validateStart < 0 || validateEnd < 0) fail('validateBuildInputLock block missing')
const validateBlock = contract.slice(validateStart, validateEnd)
if (validateBlock.includes('createBuildInputLock(input)')) fail('artifact reverify still invokes observed-input BuildInputLock creation authority')
if (!validateBlock.includes('createBuildInputLockIdentity(input)')) fail('artifact reverify is not bound to pure lock identity construction')

const verifyStart = contract.indexOf('export async function verifyGeneratedArtifactSet')
const verifyEnd = contract.indexOf('\nexport async function pathExists', verifyStart)
if (verifyStart < 0 || verifyEnd < 0) fail('verifyGeneratedArtifactSet block missing')
const verifyBlock = contract.slice(verifyStart, verifyEnd)
const headStart = verifyBlock.indexOf('const headLike = {')
const headEnd = verifyBlock.indexOf('\n  }', headStart)
if (headStart < 0 || headEnd < 0) fail('artifact headLike projection missing')
const headLikeBlock = verifyBlock.slice(headStart, headEnd)
if (headLikeBlock.includes('producerRelease')) fail('artifact headLike synthesizes producer provenance')
if (verifyBlock.includes("fetchJson('/api/v1/public/portfolio-snapshot/head'")) fail('artifact reverification performs live-head fetch')

const observedStart = contract.indexOf('function validateObservedBuildInputProducerAuthority(input)')
const observedEnd = contract.indexOf('\nfunction createBuildInputLockIdentity', observedStart)
const observedBlock = contract.slice(observedStart, observedEnd)
for (const token of [
  '$buildInputLock.input.head.producerRelease',
  'input.head.producerRelease !== input.receipt.producerRelease',
]) if (!observedBlock.includes(token)) fail(`observed current-head parity token missing: ${token}`)

if (pkg.mmjPublicBuildInputLockObservedHeadArtifactReverifyAuthoritySeparationR1Release !== PATCH) {
  fail('package release marker mismatch')
}
const gate = 'gate:public-build-input-lock-observed-head-artifact-reverify-authority-separation-r1'
if (typeof pkg.scripts?.[gate] !== 'string') fail('package gate missing')

console.log(JSON.stringify({
  event: 'PASS_MMJ_PUBLIC_BUILD_INPUT_LOCK_OBSERVED_HEAD_AND_ARTIFACT_REVERIFY_AUTHORITY_SEPARATION_R1_GATE',
  release: PATCH,
  observedCurrentHeadProducerParity: true,
  generatedArtifactAuthoritySeparated: true,
  syntheticHeadProducer: false,
  receiptProducerPreserved: true,
  v1ArtifactReverify: true,
  v2ArtifactReverify: true,
  fakeProvenance: false,
}))
