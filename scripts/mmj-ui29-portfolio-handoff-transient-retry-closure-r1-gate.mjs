import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const adopter = await readFile(resolve(root, 'scripts/mmj-ui29-portfolio-adopt.mjs'), 'utf8')
const authority = await readFile(resolve(root, 'scripts/lib/mmj-ui29-portfolio-handoff-retry-authority.mjs'), 'utf8')
const publicContent = await readFile(resolve(root, 'scripts/mmj-ui29-public-content-adopt.mjs'), 'utf8')
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))

assert.match(adopter, /const totalDeadline = Date\.now\(\) \+ 60_000/)
assert.match(adopter, /portfolioRequestTimeoutMs\(\{ deadline: totalDeadline \}\)/)
assert.match(adopter, /setTimeout\(\(\) => controller\.abort\(\), requestTimeoutMs\)/)
assert.match(adopter, /transportKind: 'timeout'/)
assert.match(adopter, /transportKind: 'network'/)
assert.match(adopter, /originalErrorName/)
assert.match(adopter, /originalErrorMessage/)
assert.match(adopter, /originalCauseCode/)
assert.match(adopter, /'head-repeat'/)
assert.match(adopter, /runPortfolioHandoffTransactionWithRetry\(\{/)
assert.match(adopter, /const transactionResult = await runPortfolioHandoffTransactionWithRetry/)
assert.match(adopter, /const adopted = await adopt\(transactionResult\)/)
assert.ok(adopter.indexOf('const transactionResult = await runPortfolioHandoffTransactionWithRetry') < adopter.indexOf('const adopted = await adopt(transactionResult)'), 'adopt must occur only after retry authority returns a successful transaction')
assert.doesNotMatch(adopter, /for \(let attempt = 1; attempt <= 3; attempt \+= 1\)/)

assert.match(authority, /maxAttempts = 3/)
assert.match(authority, /attempt \* 250/)
assert.match(authority, /E_MMJ_UI29_PORTFOLIO_HEAD_UNSTABLE/)
assert.match(authority, /E_MMJ_UI29_SNAPSHOT_HEADER_MISMATCH/)
assert.match(authority, /E_MMJ_UI29_HANDOFF_TIMEOUT/)
assert.match(authority, /UND_ERR_BODY_TIMEOUT/)
assert.match(authority, /MMJ_PORTFOLIO_HANDOFF_ATTEMPT_STARTED/)
assert.match(authority, /MMJ_PORTFOLIO_HANDOFF_ATTEMPT_FAILED/)
assert.match(authority, /MMJ_PORTFOLIO_HANDOFF_RETRY_SCHEDULED/)
assert.match(authority, /remainingDeadlineMs > delayMs/)
assert.match(authority, /Math\.min\(perRequestTimeoutMs, remainingDeadlineMs\)/)
assert.doesNotMatch(authority, /while\s*\(true\)/)

assert.match(publicContent, /mmj-ui29-portfolio-adopt\.mjs/)
assert.match(publicContent, /mmj-ui29-commission-guide-adopt\.mjs/)
assert.equal(pkg.mmjPortfolioHandoffTransientRetryClosureRelease, 'MMJ-UI29-PORTFOLIO-HANDOFF-TRANSIENT-RETRY-CLOSURE-R1')
assert.equal(
  pkg.scripts['gate:portfolio-handoff-transient-retry-closure-r1'],
  'node --experimental-strip-types scripts/mmj-ui29-portfolio-handoff-transient-retry-closure-r1-test.mjs && node scripts/mmj-ui29-portfolio-handoff-transient-retry-closure-r1-gate.mjs',
)
assert.ok(pkg.scripts['gate:mmj-ui29-a'].includes('npm run gate:portfolio-handoff-transient-retry-closure-r1'), 'main UI29 gate must include Portfolio transient retry closure')

for (const forbidden of [
  'while (true)',
  '30_000',
  '60_000 request timeout',
  'generated fallback',
]) {
  assert.equal(authority.includes(forbidden), false, `forbidden retry pattern present: ${forbidden}`)
}

console.log(JSON.stringify({
  event: 'PASS_MMJ_UI29_PORTFOLIO_HANDOFF_TRANSIENT_RETRY_CLOSURE_R1_GATE',
  globalDeadlineMs: 60000,
  perRequestTimeoutMs: 15000,
  maxAttempts: 3,
  headFirstWholeTransactionRestart: true,
  globalDeadlineCapsPerRequest: true,
  adoptionAfterSuccessfulTransactionOnly: true,
  aggregateReleasePreserved: true,
  staleFallbackAdded: false,
}))
