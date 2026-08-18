import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')
const [pages, wrapper, evidenceVerifier, evidenceAuthority, buildReceipt, dispatchVerifier, generationAuthority, pkgText] = await Promise.all([
  read('.github/workflows/pages.yml'),
  read('scripts/mmj-ui29-failure-receipt.mjs'),
  read('scripts/mmj-ui29-failure-receipt-evidence-verify.mjs'),
  read('scripts/lib/mmj-ui29-failure-receipt-evidence-authority.mjs'),
  read('scripts/mmj-ui29-build-receipt.mjs'),
  read('scripts/mmj-ui29-dispatch-input-verify.mjs'),
  read('scripts/lib/mmj-ui29-portfolio-dispatch-generation.mjs'),
  read('package.json'),
])
const pkg = JSON.parse(pkgText)
const r07 = pages.includes('mmj_public_converge')

if (r07) {
  assert.ok(pages.includes('run: node scripts/mmj-ui29-public-convergence-input-verify.mjs preflight'), 'R07 site generation admission authority must remain active')
  assert.ok(pages.includes('run: node scripts/mmj-ui29-public-convergence-receipt.mjs failed'), 'R07 site failure receipt transport missing')
  assert.equal(pages.includes('run: node scripts/mmj-ui29-failure-receipt.mjs'), false, 'legacy portfolio failure wrapper must not regain production Pages authority')
} else {
  assert.ok(pages.includes('run: node scripts/mmj-ui29-dispatch-input-verify.mjs preflight'), 'build admission authority must remain active')
}

// The old Portfolio path remains an immutable historical evidence reader for R00-R06 runs.
assert.ok(dispatchVerifier.includes('assertPortfolioDispatchGenerationInput'), 'historical generation input verifier is not preserved')
assert.ok(generationAuthority.includes("sourceWorkbookRevision: integer(env.MMJ_SOURCE_WORKBOOK_REVISION, 'source_workbook_revision', 1)"), 'historical build admission sourceWorkbookRevision strictness weakened')
assert.ok(wrapper.includes('mmj-ui29-failure-receipt-evidence-verify.mjs'), 'historical failure receipt evidence authority is not active')
assert.equal(wrapper.includes("resolve(root, 'scripts/mmj-ui29-dispatch-input-verify.mjs')"), false, 'historical failure receipt still reuses build admission authority')
assert.ok(wrapper.includes('mmj-ui29-build-receipt.mjs'), 'historical CMS failure receipt transport was not preserved')
assert.ok(wrapper.indexOf('mmj-ui29-failure-receipt-evidence-verify.mjs') < wrapper.indexOf('mmj-ui29-build-receipt.mjs'), 'historical CMS mutation may occur before failure evidence admission')
assert.ok(evidenceVerifier.includes('inspectFailureReceiptEvidence'), 'failure evidence verifier is not bound to its authority')
assert.equal(evidenceVerifier.includes('fetch('), false, 'historical failure evidence verification must not silently substitute current-head admission')
assert.ok(evidenceAuthority.includes("sourceWorkbookRevision',\n  'collectionHeadRevision'"), 'historical revision evidence fields missing')
assert.ok(evidenceAuthority.includes('parsed < 0'), 'failure evidence authority must admit zero-valued historical revision evidence')
assert.ok(evidenceAuthority.includes('parsed < 1'), 'build-admission failure inspection must still classify zero revision as invalid')
assert.ok(evidenceAuthority.includes("field: 'issuedAt'"), 'invalid issuedAt evidence attribution missing')
assert.ok(evidenceAuthority.includes('githubRunId'), 'GitHub run identity binding missing')
assert.ok(evidenceAuthority.includes('githubRunAttempt'), 'GitHub run attempt binding missing')
assert.ok(evidenceAuthority.includes('githubSha'), 'GitHub commit identity binding missing')
assert.ok(buildReceipt.includes("sourceWorkbookRevision: integer('MMJ_SOURCE_WORKBOOK_REVISION')"), 'historical failure receipt no longer preserves raw source revision evidence')
assert.ok(buildReceipt.includes("collectionHeadRevision: integer('MMJ_COLLECTION_HEAD_REVISION')"), 'historical failure receipt no longer preserves collection head revision evidence')
assert.ok(buildReceipt.includes("state === 'failed' ?"), 'historical failure receipt error authority missing')
assert.equal(wrapper.includes('repository_dispatch'), false, 'historical failure receipt wrapper must not redispatch')
assert.equal(wrapper.includes('MMJ_SOURCE_WORKBOOK_REVISION ='), false, 'historical payload repair detected')

assert.equal(
  pkg.mmjUi29FailureReceiptPreflightAuthoritySeparationHistoricalSettlementClosureRelease,
  'MMJ-UI29-FAILURE-RECEIPT-PREFLIGHT-AUTHORITY-SEPARATION-AND-HISTORICAL-SETTLEMENT-CLOSURE-R1',
)
const gate = String(pkg.scripts?.['gate:ui29-failure-receipt-preflight-authority-separation-and-historical-settlement-closure-r1'] || '')
assert.ok(gate.includes('mmj-ui29-failure-receipt-preflight-authority-separation-and-historical-settlement-closure-r1-test.mjs'))
assert.ok(gate.includes('mmj-ui29-failure-receipt-preflight-authority-separation-and-historical-settlement-closure-r1-gate.mjs'))
assert.ok(gate.includes('mmj-github-pages-superseded-run-failure-receipt-retirement-r1-test.mjs'))
assert.ok(gate.includes('mmj-github-pages-superseded-run-failure-receipt-retirement-r1-gate.mjs'))

console.log(r07 ? 'PASS_SITE_CONVERGENCE_ADMISSION_AUTHORITY_PRESERVED' : 'PASS_BUILD_ADMISSION_AUTHORITY_PRESERVED')
console.log('PASS_FAILURE_RECEIPT_EVIDENCE_AUTHORITY_SEPARATED')
console.log('PASS_HISTORICAL_ZERO_SOURCE_REVISION_REPORTABLE')
console.log('PASS_EXACT_DELIVERY_AND_GITHUB_RUN_BINDING')
console.log('PASS_NO_HISTORICAL_PAYLOAD_REPAIR')
console.log('PASS_NO_REDISPATCH')
console.log('PASS_ACCEPTED_FAILURE_RECEIPT_TRANSPORT_RECONNECTED')
console.log('PASS_MMJ_UI29_FAILURE_RECEIPT_PREFLIGHT_AUTHORITY_SEPARATION_AND_HISTORICAL_SETTLEMENT_CLOSURE_R1')
