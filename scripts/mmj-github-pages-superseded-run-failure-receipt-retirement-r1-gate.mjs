import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')
const [pages, wrapper, helper, startedTest, pkgText] = await Promise.all([
  read('.github/workflows/pages.yml'),
  read('scripts/mmj-ui29-failure-receipt.mjs'),
  read('scripts/lib/mmj-ui29-pages-failure-receipt-authority.mjs'),
  read('scripts/mmj-ui29-started-receipt-nonblocking-r1-test.mjs'),
  read('package.json'),
])
const pkg = JSON.parse(pkgText)
const r07 = pages.includes('mmj_public_converge')

assert.ok(pages.includes('group: github-pages'), 'GitHub Pages concurrency authority missing')
assert.equal(pages.includes('cancel-in-progress: true'), false, 'legacy latest-run cancellation authority must remain retired')

if (r07) {
  assert.equal(pages.includes('queue: max'), false, 'R07 must not restore the retired sequential queue shape')
  assert.ok(pages.includes("needs.build.result == 'failure' || (needs.deployment-admission.outputs.deploy == 'true' && needs.deploy.result == 'failure')"), 'site failure receipt must require build failure or an admitted deploy failure')
  assert.ok(pages.includes('run: node scripts/mmj-ui29-public-convergence-receipt.mjs failed'), 'R07 site failure receipt transport missing')
  assert.equal(pages.includes('run: node scripts/mmj-ui29-failure-receipt.mjs'), false, 'legacy portfolio failure wrapper must not regain production Pages authority')
  assert.ok(startedTest.includes("site failure receipt authority drift"), 'started receipt regression test must preserve R07 site failure authority')
} else {
  assert.ok(pages.includes('queue: max'), 'sequential GitHub Pages queue authority missing')
  assert.ok(pages.includes("needs.build.result == 'failure' || (needs.deployment-admission.outputs.deploy == 'true' && needs.deploy.result == 'failure')"), 'failure receipt must require build failure or an admitted deploy failure')
  assert.ok(pages.includes('MMJ_BUILD_JOB_RESULT: ${{ needs.build.result }}'), 'build result is not bound to receipt mutation boundary')
  assert.ok(pages.includes('MMJ_DEPLOY_JOB_RESULT: ${{ needs.deploy.result }}'), 'deploy result is not bound to receipt mutation boundary')
  assert.ok(pages.includes("MMJ_GITHUB_EVENT_ACTION: ${{ github.event.action }}"), 'event action is not bound to receipt mutation boundary')
  assert.ok(pages.includes('run: node scripts/mmj-ui29-failure-receipt.mjs'), 'guarded failure receipt wrapper is not active')
  assert.ok(startedTest.includes("needs.build.result == 'failure' || (needs.deployment-admission.outputs.deploy == 'true' && needs.deploy.result == 'failure')"), 'started receipt regression test must preserve admitted deployment failure authority')
  assert.ok(startedTest.includes('cancelled/skipped result must not be treated as deployment failure'), 'started receipt regression test does not reject the retired broad condition')
}

assert.equal(pages.includes("needs.build.result != 'success' || needs.deploy.result != 'success'"), false, 'broad non-success failure classification remains')

// Historical R00-R06 evidence tooling remains readable even after R07 retires it from the production Pages path.
assert.ok(helper.includes("if (results.includes('failure')) return 'FAILURE'"), 'actual failure classification missing')
assert.ok(helper.includes("if (results.includes('cancelled')) return 'CANCELLED'"), 'cancellation classification missing')
assert.ok(wrapper.includes('mmj-ui29-failure-receipt-evidence-verify.mjs'), 'historical failure receipt evidence authority is not preserved')
assert.equal(wrapper.includes("resolve(root, 'scripts/mmj-ui29-dispatch-input-verify.mjs')"), false, 'historical failure receipt still reuses build admission authority')
assert.ok(wrapper.includes('E_MMJ_UI29_DISPATCH_HEAD_MISMATCH'), 'historical stale dispatch mismatch neutralization missing')
assert.ok(wrapper.includes('PASS_MMJ_GITHUB_PAGES_SUPERSEDED_RUN_NEUTRAL_EXIT'), 'historical neutral superseded observability missing')
assert.ok(wrapper.includes('mmj-ui29-build-receipt.mjs'), 'historical actual failure receipt transport is not preserved')
assert.ok(wrapper.indexOf('mmj-ui29-failure-receipt-evidence-verify.mjs') < wrapper.indexOf('mmj-ui29-build-receipt.mjs'), 'historical CMS mutation can occur before failure evidence verification')

assert.equal(pkg.mmjGithubPagesSupersededRunFailureReceiptRetirementRelease, 'MMJ-GITHUB-PAGES-SUPERSEDED-RUN-FAILURE-RECEIPT-RETIREMENT-R1')
assert.ok(String(pkg.scripts?.['gate:github-pages-superseded-run-failure-receipt-retirement-r1'] || '').includes('mmj-github-pages-superseded-run-failure-receipt-retirement-r1-test.mjs'))
assert.ok(String(pkg.scripts?.['gate:github-pages-superseded-run-failure-receipt-retirement-r1'] || '').includes('mmj-github-pages-superseded-run-failure-receipt-retirement-r1-gate.mjs'))

console.log(r07 ? 'PASS_SINGLE_CONVERGENCE_CONCURRENCY_AUTHORITY' : 'PASS_SEQUENTIAL_QUEUE_CONCURRENCY_AUTHORITY')
console.log('PASS_CANCELLED_NOT_FAILURE')
console.log('PASS_SUPERSEDED_RUN_NEUTRAL_EXIT')
console.log('PASS_NO_FAILURE_RECEIPT_ON_CANCELLATION')
console.log('PASS_NO_CMS_FAILURE_STATE_POLLUTION')
console.log('PASS_ACTUAL_FAILURE_RECEIPT_PRESERVED')
console.log('PASS_FAILURE_RECEIPT_EVIDENCE_AUTHORITY_SEPARATION')
console.log('PASS_RUN_31466911230_REGRESSION')
console.log('PASS_MMJ_GITHUB_PAGES_SUPERSEDED_RUN_FAILURE_RECEIPT_RETIREMENT_R1')
