import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const observer = await readFile(new URL('./mmj-ui29-public-source-observation.mjs', import.meta.url), 'utf8')
const classifier = await readFile(new URL('./lib/mmj-ui29-public-source-observation-response-r2.mjs', import.meta.url), 'utf8')
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

assert.match(observer, /classifyPublicSourceObservationResponseR2\(payload, body\.afterSha\)/)
assert.equal(observer.includes("event: 'PASS_MMJ_PUBLIC_SOURCE_OBSERVATION', afterSha"), false)
assert.match(classifier, /admission === 'advanced'/)
assert.match(classifier, /admission === 'idempotent'/)
assert.match(classifier, /admission === 'historical'/)
assert.match(classifier, /PASS_MMJ_PUBLIC_SOURCE_OBSERVATION_ADVANCED/)
assert.match(classifier, /PASS_MMJ_PUBLIC_SOURCE_OBSERVATION_ALREADY_CURRENT/)
assert.match(classifier, /PASS_MMJ_PUBLIC_SOURCE_OBSERVATION_SUPERSEDED/)
assert.match(classifier, /E_MMJ_PUBLIC_SOURCE_OBSERVATION_RESPONSE_DISPOSITION_INVALID/)
assert.equal(
  pkg.releases?.mmjPublicSourceObservationResponseTruthR2Release,
  'MMJ-PUBLIC-SOURCE-OBSERVATION-RESPONSE-DISPOSITION-TRUTH-R2',
)

console.log('PASS_MMJ_PUBLIC_SOURCE_OBSERVATION_RESPONSE_R2_STATIC')
