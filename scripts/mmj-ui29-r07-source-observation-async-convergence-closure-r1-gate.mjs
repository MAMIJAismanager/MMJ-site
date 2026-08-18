import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const observer = await readFile(new URL('./mmj-ui29-public-source-observation.mjs', import.meta.url), 'utf8')
const boundary = await readFile(new URL('./public-boundary-gate.mjs', import.meta.url), 'utf8')
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

assert.match(observer, /const SOURCE_OBSERVATION_REQUEST_TIMEOUT_MS = 20_000/)
assert.match(observer, /AbortSignal\.timeout\(SOURCE_OBSERVATION_REQUEST_TIMEOUT_MS\)/)
assert.match(observer, /for \(let attempt = 1; attempt <= 3; attempt \+= 1\)/)
const rawBodyAt = observer.indexOf('const rawBody = Buffer.from(JSON.stringify(body))')
const loopAt = observer.indexOf('for (let attempt = 1; attempt <= 3; attempt += 1)')
const nonceAt = observer.indexOf("const nonce = randomUUID().replaceAll('-', '')", loopAt)
assert.ok(rawBodyAt >= 0 && loopAt > rawBodyAt && nonceAt > loopAt)
assert.match(boundary, /scripts\/mmj-ui29-public-source-observation\.mjs/)
assert.match(boundary, /scripts\/mmj-ui29-public-convergence-receipt\.mjs/)
assert.match(boundary, /scripts\/mmj-ui29-public-convergence-supersession-receipt\.mjs/)
assert.equal(pkg.releases?.mmjPublicationR07SourceObservationAsyncConvergenceClosureR1PublicRelease, 'MMJ-PUBLICATION-R07-SOURCE-OBSERVATION-ASYNC-CONVERGENCE-CLOSURE-R1')

console.log('PASS_PUBLIC_SOURCE_OBSERVER_20S_CALLBACK_BUDGET')
console.log('PASS_PUBLIC_SOURCE_OBSERVER_THREE_ATTEMPT_RETRY')
console.log('PASS_PUBLIC_SOURCE_OBSERVER_STABLE_RAW_BODY')
console.log('PASS_PUBLIC_SOURCE_OBSERVER_FRESH_NONCE_PER_ATTEMPT')
console.log('PASS_PUBLIC_BOUNDARY_BUILD_CALLBACK_ALLOWLIST_PRESERVED')
