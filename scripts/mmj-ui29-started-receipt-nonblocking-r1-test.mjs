import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')
const pages = await read('.github/workflows/pages.yml')
const r07 = pages.includes('mmj_public_converge')
const receipt = await read(r07 ? 'scripts/mmj-ui29-public-convergence-receipt.mjs' : 'scripts/mmj-ui29-build-receipt.mjs')
if (r07) {
  const startedIndex = pages.indexOf('      - name: Report public convergence build started')
  assert.ok(startedIndex >= 0, 'site started receipt step missing')
  const startedRun = '        run: node scripts/mmj-ui29-public-convergence-receipt.mjs started'
  const startedRunIndex = pages.indexOf(startedRun, startedIndex)
  assert.ok(startedRunIndex > startedIndex, 'site started receipt command missing')
  const startedBlock = pages.slice(startedIndex, startedRunIndex + startedRun.length)
  assert.ok(startedBlock.includes('id: convergence-started-receipt'), 'site started receipt stable id missing')
  assert.ok(startedBlock.includes('continue-on-error: true'), 'site started receipt must be non-blocking')
  const warningIndex = pages.indexOf('      - name: Warn if CMS convergence started receipt delivery is pending', startedRunIndex)
  assert.ok(warningIndex > startedRunIndex, 'site started receipt warning step missing')
  const nextStepIndex = pages.indexOf('      - name:', warningIndex + 20)
  const warningBlock = pages.slice(warningIndex, nextStepIndex >= 0 ? nextStepIndex : pages.length)
  assert.ok(warningBlock.includes("steps.convergence-started-receipt.outcome != 'success'"), 'site warning must observe failed started receipt')
  assert.ok(warningBlock.includes('Public build continues.'), 'site warning must preserve build continuation evidence')
  assert.ok(pages.indexOf('Adopt exact sealed CMS public convergence content') > warningIndex, 'exact adoption must continue after started callback')
  assert.ok(pages.indexOf('actions/deploy-pages@') < pages.indexOf('node scripts/mmj-ui29-public-convergence-receipt.mjs succeeded'), 'site success receipt must follow deploy')
  const failureJob = pages.slice(pages.indexOf('  convergence-failure-receipt:'))
  assert.ok(failureJob.includes("needs.build.result == 'failure' || (needs.deployment-admission.outputs.deploy == 'true' && needs.deploy.result == 'failure')"), 'site failure receipt authority drift')
  assert.equal(failureJob.includes('convergence-started-receipt'), false, 'started callback failure must not emit failed deployment receipt')
  assert.ok(receipt.includes("const attemptLimit = state === 'started' ? 1 : 3"), 'site bounded callback attempt policy drift')
} else {
  const startedName = '      - name: Report portfolio build started'
  const startedIndex = pages.indexOf(startedName)
  assert.ok(startedIndex >= 0, 'started receipt step missing')
  const startedRun = '        run: node scripts/mmj-ui29-build-receipt.mjs started'
  const startedRunIndex = pages.indexOf(startedRun, startedIndex)
  assert.ok(startedRunIndex > startedIndex, 'started receipt command missing')
  const startedBlock = pages.slice(startedIndex, startedRunIndex + startedRun.length)
  assert.ok(startedBlock.includes('id: portfolio-started-receipt'), 'started receipt stable step id missing')
  assert.ok(startedBlock.includes('continue-on-error: true'), 'started receipt must be non-blocking')
  assert.ok(receipt.includes("const attemptLimit = state === 'succeeded' ? 3 : 1"), 'existing bounded callback attempt policy drift')
}
assert.ok(receipt.includes('const rawBody = Buffer.from(JSON.stringify(body))'), 'receipt raw body must remain stable across retry')
console.log(JSON.stringify({ event: 'PASS_MMJ_UI29_STARTED_RECEIPT_NONBLOCKING_R1', startedReceiptProjectionRole: true, startedReceiptBuildAuthority: false, startedCallbackContinueOnError: true, buildContinuationAfterCallbackFailure: true, cmsCallbackAsPagesBuildGate: false, siteConvergenceAuthority: r07 }))
