import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')
const pages = await read('.github/workflows/pages.yml')
const receipt = await read('scripts/mmj-ui29-build-receipt.mjs')

const startedName = '      - name: Report portfolio build started'
const startedIndex = pages.indexOf(startedName)
assert.ok(startedIndex >= 0, 'started receipt step missing')
const startedRun = '        run: node scripts/mmj-ui29-build-receipt.mjs started'
const startedRunIndex = pages.indexOf(startedRun, startedIndex)
assert.ok(startedRunIndex > startedIndex, 'started receipt command missing')
const startedBlock = pages.slice(startedIndex, startedRunIndex + startedRun.length)
assert.ok(startedBlock.includes('id: portfolio-started-receipt'), 'started receipt stable step id missing')
assert.ok(startedBlock.includes('continue-on-error: true'), 'started receipt must be non-blocking')
assert.ok(startedBlock.includes("github.event.action == 'mmj_portfolio_promoted'"), 'started receipt portfolio scope missing')

const warningName = '      - name: Warn if CMS started receipt delivery is pending'
const warningIndex = pages.indexOf(warningName, startedRunIndex)
assert.ok(warningIndex > startedRunIndex, 'started receipt warning step missing')
const nextStepIndex = pages.indexOf('      - name:', warningIndex + warningName.length)
const warningBlock = pages.slice(warningIndex, nextStepIndex >= 0 ? nextStepIndex : pages.length)
assert.ok(warningBlock.includes("steps.portfolio-started-receipt.outcome != 'success'"), 'warning must observe failed started receipt')
assert.ok(warningBlock.includes('Public build continues.'), 'warning must preserve build continuation evidence')

const adoptionIndex = pages.indexOf('      - name: Adopt sealed CMS public content')
assert.ok(adoptionIndex > warningIndex, 'public-content adoption must remain after the non-blocking started receipt')
for (const forbidden of [
  "steps.portfolio-started-receipt.outcome == 'success'",
  "needs.portfolio-started-receipt",
]) assert.equal(pages.includes(forbidden), false, 'started receipt remains a build gate: ' + forbidden)

const deployIndex = pages.indexOf('actions/deploy-pages@')
assert.ok(deployIndex > adoptionIndex, 'GitHub Pages deploy authority ordering drift')
const successName = '      - name: Report portfolio deployment committed'
const successIndex = pages.indexOf(successName)
assert.ok(successIndex > deployIndex, 'success receipt must remain after deploy-pages')
const successRun = '        run: node scripts/mmj-ui29-build-receipt.mjs succeeded'
const successRunIndex = pages.indexOf(successRun, successIndex)
assert.ok(successRunIndex > successIndex, 'success receipt command missing')
const successBlock = pages.slice(successIndex, successRunIndex + successRun.length)
assert.ok(successBlock.includes('id: portfolio-success-receipt'), 'success receipt step id missing')
assert.ok(successBlock.includes('continue-on-error: true'), 'success receipt existing non-blocking authority regressed')

const failureJobIndex = pages.indexOf('  portfolio-failure-receipt:')
assert.ok(failureJobIndex >= 0, 'portfolio failure receipt job missing')
const failureJob = pages.slice(failureJobIndex)
assert.ok(failureJob.includes("needs.build.result != 'success' || needs.deploy.result != 'success'"), 'actual build/deploy failure authority drift')
assert.equal(failureJob.includes('portfolio-started-receipt'), false, 'started callback failure must not emit failed deployment receipt')

assert.ok(receipt.includes('Build receipt callback failed after'), 'receipt transport failure truth must remain non-zero')
assert.ok(receipt.includes("const attemptLimit = state === 'succeeded' ? 3 : 1"), 'existing bounded callback attempt policy drift')

console.log(JSON.stringify({
  event: 'PASS_MMJ_UI29_STARTED_RECEIPT_NONBLOCKING_R1',
  startedReceiptProjectionRole: true,
  startedReceiptBuildAuthority: false,
  startedCallbackContinueOnError: true,
  timeoutWarningPreserved: true,
  buildContinuationAfterCallbackFailure: true,
  successReceiptNonBlockingPreserved: true,
  cmsCallbackAsPagesBuildGate: false,
}))
