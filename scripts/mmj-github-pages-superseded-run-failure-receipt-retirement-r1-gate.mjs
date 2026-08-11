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

assert.ok(pages.includes('group: github-pages'), 'GitHub Pages concurrency authority missing')
assert.ok(pages.includes('cancel-in-progress: true'), 'latest-run concurrency cancellation must remain enabled')
assert.equal(pages.includes('cancel-in-progress: false'), false, 'concurrency cancellation was retired')
assert.ok(pages.includes("needs.build.result == 'failure' || needs.deploy.result == 'failure'"), 'failure receipt must require an exact native failure result')
assert.equal(pages.includes("needs.build.result != 'success' || needs.deploy.result != 'success'"), false, 'broad non-success failure classification remains')
assert.ok(pages.includes('MMJ_BUILD_JOB_RESULT: ${{ needs.build.result }}'), 'build result is not bound to receipt mutation boundary')
assert.ok(pages.includes('MMJ_DEPLOY_JOB_RESULT: ${{ needs.deploy.result }}'), 'deploy result is not bound to receipt mutation boundary')
assert.ok(pages.includes("MMJ_GITHUB_EVENT_ACTION: ${{ github.event.action }}"), 'event action is not bound to receipt mutation boundary')
assert.ok(pages.includes('run: node scripts/mmj-ui29-failure-receipt.mjs'), 'guarded failure receipt wrapper is not active')

assert.ok(helper.includes("if (results.includes('failure')) return 'FAILURE'"), 'actual failure classification missing')
assert.ok(helper.includes("if (results.includes('cancelled')) return 'CANCELLED'"), 'cancellation classification missing')
assert.ok(wrapper.includes("mmj-ui29-dispatch-input-verify.mjs"), 'current dispatch authority verifier is not reused')
assert.ok(wrapper.includes("E_MMJ_UI29_DISPATCH_HEAD_MISMATCH"), 'stale dispatch mismatch is not neutralized')
assert.ok(wrapper.includes("PASS_MMJ_GITHUB_PAGES_SUPERSEDED_RUN_NEUTRAL_EXIT"), 'neutral superseded observability missing')
assert.ok(wrapper.includes("mmj-ui29-build-receipt.mjs"), 'existing actual failure receipt transport is not preserved')
assert.ok(wrapper.indexOf('mmj-ui29-dispatch-input-verify.mjs') < wrapper.indexOf('mmj-ui29-build-receipt.mjs'), 'CMS mutation can occur before latest dispatch authority verification')
assert.ok(startedTest.includes("needs.build.result == 'failure' || needs.deploy.result == 'failure'"), 'started receipt regression test still encodes broad non-success failure authority')
assert.ok(startedTest.includes('cancelled/skipped result must not be treated as deployment failure'), 'started receipt regression test does not reject the retired broad condition')

assert.equal(pkg.mmjGithubPagesSupersededRunFailureReceiptRetirementRelease, 'MMJ-GITHUB-PAGES-SUPERSEDED-RUN-FAILURE-RECEIPT-RETIREMENT-R1')
assert.ok(String(pkg.scripts?.['gate:github-pages-superseded-run-failure-receipt-retirement-r1'] || '').includes('mmj-github-pages-superseded-run-failure-receipt-retirement-r1-test.mjs'))
assert.ok(String(pkg.scripts?.['gate:github-pages-superseded-run-failure-receipt-retirement-r1'] || '').includes('mmj-github-pages-superseded-run-failure-receipt-retirement-r1-gate.mjs'))

console.log('PASS_CONCURRENCY_CANCELLATION_CLASSIFICATION')
console.log('PASS_CANCELLED_NOT_FAILURE')
console.log('PASS_SUPERSEDED_RUN_NEUTRAL_EXIT')
console.log('PASS_NO_FAILURE_RECEIPT_ON_CANCELLATION')
console.log('PASS_NO_CMS_FAILURE_STATE_POLLUTION')
console.log('PASS_ACTUAL_FAILURE_RECEIPT_PRESERVED')
console.log('PASS_LATEST_DISPATCH_AUTHORITY_CHECK')
console.log('PASS_RUN_31466911230_REGRESSION')
console.log('PASS_MMJ_GITHUB_PAGES_SUPERSEDED_RUN_FAILURE_RECEIPT_RETIREMENT_R1')
