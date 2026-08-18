import fs from 'node:fs'

const read = p => fs.readFileSync(p, 'utf8')
const workflow = read('.github/workflows/pages.yml')
const admission = read('scripts/lib/mmj-ui29-portfolio-deployment-authority.mjs')
const admissionRunner = read('scripts/mmj-ui29-portfolio-deployment-admission.mjs')
const receipt = read('scripts/mmj-ui29-supersession-receipt.mjs')
const packageJson = read('package.json')
const need = (source, token, label) => { if (!source.includes(token)) throw new Error(`R06_PUBLIC_GATE_MISSING[${label}]: ${token}`) }
const r07 = workflow.includes('mmj_public_converge')
const forbid = (source, token, label) => { if (source.includes(token)) throw new Error(`R06_PUBLIC_GATE_FORBIDDEN[${label}]: ${token}`) }

need(admission, 'observedCurrentAuthority: Object.freeze({', 'withheld-observation')
need(admissionRunner, 'observed_current_delivery_key', 'admission-output-delivery-key')
need(admissionRunner, 'observed_current_collection_version_id', 'admission-output-version')
need(admissionRunner, 'observed_current_snapshot_digest', 'admission-output-digest')
need(admissionRunner, 'observed_current_head_revision', 'admission-output-revision')

if (r07) {
  need(workflow, 'convergence-supersession-receipt:', 'site-supersession-job')
  need(workflow, 'always()', 'site-disposition-job-always')
  need(workflow, "needs.deployment-admission.outputs.state == 'withheld'", 'site-withheld-only')
  need(workflow, "needs.deployment-admission.outputs.relation == 'historical'", 'site-historical-only')
  forbid(workflow, 'mmj-ui29-supersession-receipt.mjs', 'legacy-supersession-no-new-pages-authority')
} else {
  need(workflow, 'portfolio-supersession-receipt:', 'dedicated-supersession-job')
  need(workflow, 'always()', 'disposition-job-always')
  need(workflow, "needs.deployment-admission.outputs.state == 'withheld'", 'withheld-only')
  need(workflow, "needs.deployment-admission.outputs.relation == 'historical'", 'historical-only')
  need(workflow, 'MMJ_SUPERSESSION_OBSERVED_CURRENT_DELIVERY_KEY: ${{ needs.deployment-admission.outputs.observed_current_delivery_key }}', 'reuse-admission-delivery')
  need(workflow, 'MMJ_SUPERSESSION_OBSERVED_CURRENT_SNAPSHOT_DIGEST: ${{ needs.deployment-admission.outputs.observed_current_snapshot_digest }}', 'reuse-admission-digest')
  const supersessionJobStart = workflow.indexOf('  portfolio-supersession-receipt:')
  const failureJobStart = workflow.indexOf('  portfolio-failure-receipt:', supersessionJobStart)
  const supersessionJob = workflow.slice(supersessionJobStart, failureJobStart)
  forbid(supersessionJob, 'needs:\n      - deploy', 'supersession-job-not-deploy-dependent')
  forbid(supersessionJob, 'failure-receipt', 'no-false-failure-receipt')
}

need(receipt, "contract: 'mmj-portfolio-supersession-receipt-v1'", 'receipt-contract')
need(receipt, "phase: 'before-deploy'", 'before-deploy-phase')
need(receipt, "'MMJ-PORTFOLIO-SUPERSESSION-RECEIPT-V1'", 'hmac-domain')
need(receipt, 'const rawBody = Buffer.from(JSON.stringify(body))', 'stable-retry-body')
need(receipt, 'for (let attempt = 1; attempt <= 3; attempt += 1)', 'bounded-retry')
need(receipt, 'randomUUID()', 'fresh-nonce')
need(receipt, 'x-mmj-portfolio-supersession-signature', 'dedicated-signature-header')
forbid(receipt, '/portfolio-snapshot/dispatch-authority', 'no-second-current-authority-query')

need(workflow, "needs.deployment-admission.outputs.deploy == 'true' && needs.deploy.result == 'failure'", 'historical-withhold-no-failed-build-receipt')
if (r07) need(workflow, "needs.deploy.outputs.convergence_deployed == 'true'", 'actual-site-deploy-only-success-path')
else need(workflow, "needs.deploy.outputs.portfolio_deployed == 'true'", 'actual-deploy-only-success-path')
need(packageJson, 'gate:supersession-without-silent-drop-06', 'public-r06-gate-wiring')
need(packageJson, 'MMJ-PUBLICATION-SUPERSESSION-WITHOUT-SILENT-DROP-06', 'public-r06-release-marker')

console.log('PASS_DEDICATED_SUPERSESSION_RECEIPT')
console.log('PASS_SUPERSESSION_HMAC_DOMAIN_SEPARATION')
console.log('PASS_SUPERSESSION_RECEIPT_RETRY_STABLE_BODY_FRESH_NONCE')
console.log('PASS_ADMISSION_OBSERVATION_REUSED')
console.log('PASS_NO_SECOND_CURRENT_AUTHORITY_QUERY')
console.log('PASS_HISTORICAL_WITHHOLD_NO_FALSE_FAILURE')
console.log('PASS_HISTORICAL_WITHHOLD_NO_FALSE_SUCCESS')
console.log('PASS_ACTUAL_DEPLOYMENT_ONLY_SUCCESS_PATH')
console.log('PASS_R05_PREDEPLOY_FENCE_PRESERVED')
