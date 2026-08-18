import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')
const pages = await read('.github/workflows/pages.yml')
const r07 = pages.includes('mmj_public_converge')
assert.equal(pages.includes('portfolio-finalize:'), false, 'portfolio-finalize success barrier must be retired')
if (r07) {
  for (const token of ['convergence-success-receipt:', 'convergence-failure-receipt:', 'deployment-admission:', 'mmj-ui29-public-convergence-receipt.mjs succeeded']) assert.ok(pages.includes(token), `site convergence workflow token missing: ${token}`)
  const deployIndex = pages.indexOf('actions/deploy-pages@')
  const successReceiptIndex = pages.indexOf('node scripts/mmj-ui29-public-convergence-receipt.mjs succeeded')
  assert.ok(deployIndex >= 0 && deployIndex < successReceiptIndex, 'site convergence success receipt must follow deploy-pages success')
  assert.ok(pages.includes("needs.deployment-admission.outputs.deploy == 'true' && needs.deploy.result == 'failure'"), 'only admitted deployment failure may emit site failed receipt')
  assert.equal(pages.includes('mmj-ui29-public-deployment-probe.mjs --observe'), false, 'legacy propagation observer must not own R07 settlement')
  const receipt = await read('scripts/mmj-ui29-public-convergence-receipt.mjs')
  assert.ok(receipt.includes("const attemptLimit = state === 'started' ? 1 : 3"), 'bounded site terminal callback retry missing')
  assert.ok(receipt.includes("provider: 'github-pages'"), 'GitHub Pages site receipt provider authority missing')
} else {
  const probe = await read('scripts/mmj-ui29-public-deployment-probe.mjs')
  const receipt = await read('scripts/mmj-ui29-build-receipt.mjs')
  for (const token of ['portfolio-observe:', 'portfolio-failure-receipt:', 'Report portfolio deployment committed', 'node scripts/mmj-ui29-public-deployment-probe.mjs --observe']) assert.ok(pages.includes(token), `fast publish workflow token missing: ${token}`)
  assert.ok(probe.includes('const delaysBeforeAttemptMs = [0, 2_000, 5_000]'), 'bounded three-probe schedule missing')
  assert.ok(receipt.includes("const attemptLimit = state === 'succeeded' ? 3 : 1"), 'bounded success callback retry missing')
}
console.log(JSON.stringify({ event: 'PASS_MMJ_UI29_PORTFOLIO_FAST_PUBLISH_COMMIT_R1', githubPagesDeployCommitAuthority: true, portfolioFinalizeRetired: true, successReceiptAfterDeploy: true, siteConvergenceAuthority: r07 }))
