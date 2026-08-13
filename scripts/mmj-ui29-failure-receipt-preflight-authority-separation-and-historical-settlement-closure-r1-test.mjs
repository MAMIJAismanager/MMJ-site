import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { inspectFailureReceiptEvidence } from './lib/mmj-ui29-failure-receipt-evidence-authority.mjs'

const historicalEnv = {
  MMJ_DELIVERY_KEY: `pdispatch_v1_${'1'.repeat(64)}`,
  MMJ_COLLECTION_VERSION_ID: 'pcol_historical01',
  MMJ_EXPECTED_SNAPSHOT_DIGEST: '2'.repeat(64),
  MMJ_HANDOFF_RECEIPT_ID: 'phnd_historical01',
  MMJ_PROJECT_COUNT: '0',
  MMJ_ASSET_COUNT: '0',
  MMJ_SOURCE_WORKBOOK_REVISION: '0',
  MMJ_COLLECTION_HEAD_REVISION: '1',
  MMJ_ISSUED_AT: '2026-07-30T03:32:08.678Z',
  GITHUB_REPOSITORY: 'MAMIJAismanager/MMJ-site',
  GITHUB_RUN_ID: '123456789',
  GITHUB_RUN_ATTEMPT: '1',
  GITHUB_SHA: '3'.repeat(40),
  GITHUB_SERVER_URL: 'https://github.com',
}

const historical = inspectFailureReceiptEvidence(historicalEnv)
assert.equal(historical.failureReceiptEvidenceEligible, true)
assert.equal(historical.buildAdmissionEligible, false)
assert.equal(historical.delivery.sourceWorkbookRevision, 0)
assert.equal(historical.delivery.collectionHeadRevision, 1)
assert.equal(historical.buildAdmissionFailure?.error, 'E_MMJ_UI29_DISPATCH_INPUT_INVALID')
assert.equal(historical.buildAdmissionFailure?.field, 'sourceWorkbookRevision')
assert.equal(historical.buildAdmissionFailure?.observedValue, 0)

const current = inspectFailureReceiptEvidence({
  ...historicalEnv,
  MMJ_SOURCE_WORKBOOK_REVISION: '41',
  MMJ_COLLECTION_HEAD_REVISION: '7',
})
assert.equal(current.failureReceiptEvidenceEligible, true)
assert.equal(current.buildAdmissionEligible, true)
assert.equal(current.buildAdmissionFailure, null)

assert.throws(
  () => inspectFailureReceiptEvidence({ ...historicalEnv, MMJ_DELIVERY_KEY: 'broken' }),
  error => error?.code === 'E_MMJ_UI29_FAILURE_RECEIPT_EVIDENCE_INVALID',
)

const here = dirname(fileURLToPath(import.meta.url))
const wrapper = resolve(here, 'mmj-ui29-failure-receipt.mjs')
const fixtureRoot = await mkdtemp(resolve(tmpdir(), 'mmj-failure-authority-r1-'))
const scriptsRoot = resolve(fixtureRoot, 'scripts')
const receiptMarker = resolve(fixtureRoot, 'receipt-called.txt')
const forbiddenMarker = resolve(fixtureRoot, 'build-admission-called.txt')
await mkdir(scriptsRoot, { recursive: true })
await writeFile(resolve(scriptsRoot, 'mmj-ui29-failure-receipt-evidence-verify.mjs'), `console.log(JSON.stringify({event:'PASS_MMJ_UI29_FAILURE_RECEIPT_EVIDENCE_AUTHORITY_R1',failureReceiptEvidenceEligible:true,buildAdmissionEligible:false,buildAdmissionFailure:{error:'E_MMJ_UI29_DISPATCH_INPUT_INVALID',field:'sourceWorkbookRevision',observedValue:0}}));\n`, 'utf8')
await writeFile(resolve(scriptsRoot, 'mmj-ui29-dispatch-input-verify.mjs'), `import { writeFileSync } from 'node:fs'; writeFileSync(process.env.MMJ_FORBIDDEN_MARKER, 'called'); process.exit(99);\n`, 'utf8')
await writeFile(resolve(scriptsRoot, 'mmj-ui29-build-receipt.mjs'), `import { writeFileSync } from 'node:fs'; writeFileSync(process.env.MMJ_RECEIPT_MARKER, 'called'); console.log(JSON.stringify({event:'FAKE_FAILURE_RECEIPT_POST',state:'failed'}));\n`, 'utf8')

try {
  const run = spawnSync(process.execPath, [wrapper], {
    cwd: fixtureRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      GITHUB_EVENT_NAME: 'repository_dispatch',
      MMJ_GITHUB_EVENT_ACTION: 'mmj_portfolio_promoted',
      MMJ_BUILD_JOB_RESULT: 'failure',
      MMJ_DEPLOY_JOB_RESULT: 'skipped',
      MMJ_RECEIPT_MARKER: receiptMarker,
      MMJ_FORBIDDEN_MARKER: forbiddenMarker,
    },
  })
  assert.equal(run.status, 0, run.stderr)
  assert.ok(run.stdout.includes('PASS_MMJ_UI29_FAILURE_RECEIPT_EVIDENCE_AUTHORITY_R1'))
  assert.ok(run.stdout.includes('PASS_MMJ_GITHUB_PAGES_ACTUAL_FAILURE_RECEIPT_ADMITTED'))
  assert.equal(await readFile(receiptMarker, 'utf8'), 'called')
  let forbiddenCalled = true
  try { await readFile(forbiddenMarker, 'utf8') } catch { forbiddenCalled = false }
  assert.equal(forbiddenCalled, false, 'failure receipt path must not call build admission authority')
} finally {
  await rm(fixtureRoot, { recursive: true, force: true })
}

console.log(JSON.stringify({
  event: 'PASS_MMJ_UI29_FAILURE_RECEIPT_PREFLIGHT_AUTHORITY_SEPARATION_AND_HISTORICAL_SETTLEMENT_CLOSURE_R1_TEST',
  historicalZeroSourceRevisionReportable: true,
  buildAdmissionStillRejectsHistoricalZero: true,
  failureReceiptBuildAdmissionReuse: false,
  exactDeliveryIdentityPreserved: true,
  exactGithubRunIdentityRequired: true,
  cmsFailureReceiptMutationReached: true,
  historicalPayloadRepaired: false,
  redispatchPerformed: false,
}))
