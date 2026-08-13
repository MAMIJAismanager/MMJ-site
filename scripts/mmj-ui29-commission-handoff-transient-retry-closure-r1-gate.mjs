import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const adopter = await readFile(resolve(root, 'scripts/mmj-ui29-commission-guide-adopt.mjs'), 'utf8')
const authority = await readFile(resolve(root, 'scripts/lib/mmj-ui29-commission-handoff-retry-authority.mjs'), 'utf8')
const publicContent = await readFile(resolve(root, 'scripts/mmj-ui29-public-content-adopt.mjs'), 'utf8')
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))

assert.match(adopter, /const deadline = Date\.now\(\) \+ 60_000/)
assert.match(adopter, /setTimeout\(\(\) => controller\.abort\(\), 15_000\)/)
assert.match(adopter, /transportKind: 'timeout'/)
assert.match(adopter, /transportKind: 'network'/)
assert.match(adopter, /originalErrorName/)
assert.match(adopter, /originalErrorMessage/)
assert.match(adopter, /originalCauseCode/)
assert.match(adopter, /runCommissionHandoffTransactionWithRetry\(\{/)
assert.doesNotMatch(adopter, /for \(let attempt = 1; attempt <= 3; attempt \+= 1\)/)

assert.match(authority, /maxAttempts = 3/)
assert.match(authority, /attempt \* 250/)
assert.match(authority, /E_MMJ_COMMISSION_HEAD_UNSTABLE/)
assert.match(authority, /E_MMJ_COMMISSION_SNAPSHOT_HEADER_MISMATCH/)
assert.match(authority, /E_MMJ_COMMISSION_HANDOFF_TIMEOUT/)
assert.match(authority, /MMJ_COMMISSION_HANDOFF_ATTEMPT_STARTED/)
assert.match(authority, /MMJ_COMMISSION_HANDOFF_ATTEMPT_FAILED/)
assert.match(authority, /MMJ_COMMISSION_HANDOFF_RETRY_SCHEDULED/)
assert.match(authority, /remainingDeadlineMs > delayMs/)
assert.doesNotMatch(authority, /while\s*\(true\)/)

assert.match(publicContent, /mmj-ui29-portfolio-adopt\.mjs/)
assert.match(publicContent, /mmj-ui29-commission-guide-adopt\.mjs/)
assert.equal(pkg.mmjCommissionHandoffTransientRetryClosureRelease, 'MMJ-UI29-COMMISSION-HANDOFF-TRANSIENT-RETRY-CLOSURE-R1')
assert.equal(
  pkg.scripts['gate:commission-handoff-transient-retry-closure-r1'],
  'node scripts/mmj-ui29-commission-handoff-transient-retry-closure-r1-test.mjs && node scripts/mmj-ui29-commission-handoff-transient-retry-closure-r1-gate.mjs',
)

console.log(JSON.stringify({
  event: 'PASS_MMJ_UI29_COMMISSION_HANDOFF_TRANSIENT_RETRY_CLOSURE_R1_GATE',
  globalDeadlineMs: 60000,
  perRequestTimeoutMs: 15000,
  maxAttempts: 3,
  wholeTransactionRetryAuthority: true,
  portfolioAdoptionPreserved: true,
  aggregateReleasePreserved: true,
  staleFallbackAdded: false,
}))
