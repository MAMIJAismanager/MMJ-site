import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  classifyPagesRunOutcome,
  decidePortfolioFailureReceiptEligibility,
} from './lib/mmj-ui29-pages-failure-receipt-authority.mjs'

const cases = [
  ['success', 'success', 'SUCCESS', false],
  ['failure', 'skipped', 'FAILURE', true],
  ['success', 'failure', 'FAILURE', true],
  ['cancelled', 'skipped', 'CANCELLED', false],
  ['cancelled', 'cancelled', 'CANCELLED', false],
  ['failure', 'cancelled', 'FAILURE', true],
  ['skipped', 'skipped', 'NEUTRAL', false],
]

for (const [buildResult, deployResult, classification, eligible] of cases) {
  assert.equal(classifyPagesRunOutcome({ buildResult, deployResult }), classification)
  const decision = decidePortfolioFailureReceiptEligibility({
    eventName: 'repository_dispatch',
    eventAction: 'mmj_portfolio_promoted',
    buildResult,
    deployResult,
  })
  assert.equal(decision.classification, classification)
  assert.equal(decision.failureReceiptEligible, eligible)
}

const pushFailure = decidePortfolioFailureReceiptEligibility({
  eventName: 'push',
  eventAction: '',
  buildResult: 'failure',
  deployResult: 'skipped',
})
assert.equal(pushFailure.classification, 'FAILURE')
assert.equal(pushFailure.failureReceiptEligible, false)

const here = dirname(fileURLToPath(import.meta.url))
const wrapper = resolve(here, 'mmj-ui29-failure-receipt.mjs')
const cancellation = spawnSync(process.execPath, [wrapper], {
  cwd: process.cwd(),
  encoding: 'utf8',
  env: {
    ...process.env,
    GITHUB_EVENT_NAME: 'repository_dispatch',
    MMJ_GITHUB_EVENT_ACTION: 'mmj_portfolio_promoted',
    MMJ_BUILD_JOB_RESULT: 'cancelled',
    MMJ_DEPLOY_JOB_RESULT: 'skipped',
  },
})
assert.equal(cancellation.status, 0, cancellation.stderr)
const neutral = JSON.parse(cancellation.stdout.trim())
assert.equal(neutral.event, 'PASS_MMJ_GITHUB_PAGES_SUPERSEDED_RUN_NEUTRAL_EXIT')
assert.equal(neutral.classification, 'CANCELLED')
assert.equal(neutral.failureReceiptEligible, false)
assert.equal(neutral.cmsMutation, false)

async function runMutationBoundaryFixture({ verifierSource, expectedEvent, markerExpected }) {
  const fixtureRoot = await mkdtemp(resolve(tmpdir(), 'mmj-superseded-r1-'))
  const scriptsRoot = resolve(fixtureRoot, 'scripts')
  const marker = resolve(fixtureRoot, 'receipt-called.txt')
  await mkdir(scriptsRoot, { recursive: true })
  await writeFile(resolve(scriptsRoot, 'mmj-ui29-dispatch-input-verify.mjs'), verifierSource, 'utf8')
  await writeFile(resolve(scriptsRoot, 'mmj-ui29-build-receipt.mjs'), `import { writeFileSync } from 'node:fs'; writeFileSync(process.env.MMJ_TEST_MARKER, 'called'); console.log(JSON.stringify({event:'FAKE_RECEIPT_OK'}));\n`, 'utf8')
  try {
    const result = spawnSync(process.execPath, [wrapper], {
      cwd: fixtureRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        GITHUB_EVENT_NAME: 'repository_dispatch',
        MMJ_GITHUB_EVENT_ACTION: 'mmj_portfolio_promoted',
        MMJ_BUILD_JOB_RESULT: 'failure',
        MMJ_DEPLOY_JOB_RESULT: 'skipped',
        MMJ_TEST_MARKER: marker,
      },
    })
    assert.equal(result.status, 0, result.stderr)
    assert.ok(result.stdout.includes(expectedEvent), result.stdout)
    let markerExists = true
    try { await readFile(marker, 'utf8') } catch { markerExists = false }
    assert.equal(markerExists, markerExpected)
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true })
  }
}

await runMutationBoundaryFixture({
  verifierSource: `console.error(JSON.stringify({schemaVersion:1,error:'E_MMJ_UI29_DISPATCH_HEAD_MISMATCH',message:'stale'})); process.exit(1);\n`,
  expectedEvent: 'PASS_MMJ_GITHUB_PAGES_SUPERSEDED_RUN_NEUTRAL_EXIT',
  markerExpected: false,
})

await runMutationBoundaryFixture({
  verifierSource: `console.log(JSON.stringify({event:'PASS_MMJ_UI29_B_DISPATCH_PREFLIGHT'}));\n`,
  expectedEvent: 'PASS_MMJ_GITHUB_PAGES_ACTUAL_FAILURE_RECEIPT_ADMITTED',
  markerExpected: true,
})

console.log(JSON.stringify({
  event: 'PASS_MMJ_GITHUB_PAGES_SUPERSEDED_RUN_FAILURE_RECEIPT_RETIREMENT_R1_TEST',
  cancelledEqualsFailure: false,
  skippedEqualsFailure: false,
  cancellationCmsMutation: false,
  staleFailureCmsMutation: false,
  actualFailureReceiptPreserved: true,
  pushCmsFailureIsolation: true,
  regressionRun31466911230: 'cancelled-neutral-no-failure-receipt',
}))
