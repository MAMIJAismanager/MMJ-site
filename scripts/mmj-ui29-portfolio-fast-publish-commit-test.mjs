import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')

const pages = await read('.github/workflows/pages.yml')
const probe = await read('scripts/mmj-ui29-public-deployment-probe.mjs')
const receipt = await read('scripts/mmj-ui29-build-receipt.mjs')

assert.equal(pages.includes('portfolio-finalize:'), false, 'portfolio-finalize success barrier must be retired')
for (const token of [
  'portfolio-observe:',
  'portfolio-failure-receipt:',
  'Report portfolio deployment committed',
  'node scripts/mmj-ui29-public-deployment-probe.mjs --observe',
  'needs.build.result != \'success\' || needs.deploy.result != \'success\'',
]) assert.ok(pages.includes(token), `fast publish workflow token missing: ${token}`)

const deployIndex = pages.indexOf('actions/deploy-pages@')
const successReceiptIndex = pages.indexOf('node scripts/mmj-ui29-build-receipt.mjs succeeded')
assert.ok(deployIndex >= 0 && deployIndex < successReceiptIndex, 'CMS success receipt must follow deploy-pages success')

for (const forbidden of [
  "steps.probe.outcome == 'success'",
  "steps.probe.outcome != 'success'",
  'MMJ_PROBE_STATUS: ${{ steps.probe.outputs.probe_status }}',
  'MMJ_PROBED_AT: ${{ steps.probe.outputs.probed_at }}',
]) assert.equal(pages.includes(forbidden), false, `probe remains on publish commit path: ${forbidden}`)

assert.ok(probe.includes('const delaysBeforeAttemptMs = [0, 2_000, 5_000]'), 'bounded three-probe schedule missing')
assert.ok(probe.includes('requestTimeoutMs = 3_000'), 'probe request timeout missing')
assert.ok(probe.includes("process.argv.includes('--observe')"), 'non-blocking observation mode missing')
assert.ok(probe.includes('OBSERVE_MMJ_UI29_PUBLIC_PROPAGATION_PENDING'), 'pending observation receipt missing')
assert.equal(probe.includes('attempt <= 12'), false, 'retired twelve-attempt probe remains')
assert.equal((probe.match(/2_000|5_000/g) || []).length >= 2, true, 'bounded propagation delays missing')

assert.ok(receipt.includes('probeStatus: null, probedAt: null'), 'nullable unobserved probe receipt missing')
assert.equal(receipt.includes('MMJ_PROBE_STATUS || 200'), false, 'fake probe HTTP 200 fallback remains')
assert.equal(receipt.includes('MMJ_PROBED_AT || now'), false, 'fake probedAt fallback remains')
assert.ok(receipt.includes("const attemptLimit = state === 'succeeded' ? 3 : 1"), 'bounded success callback retry missing')
assert.ok(receipt.includes("provider: 'github-pages'"), 'GitHub Pages receipt provider authority missing')

console.log(JSON.stringify({
  event: 'PASS_MMJ_UI29_PORTFOLIO_FAST_PUBLISH_COMMIT_R1',
  githubPagesDeployCommitAuthority: true,
  portfolioFinalizeRetired: true,
  successReceiptAfterDeploy: true,
  propagationObservationBlocking: false,
  propagationProbeAttemptCount: 3,
  fakeProbeFallbacks: false,
  failureReceiptPreserved: true,
}))
