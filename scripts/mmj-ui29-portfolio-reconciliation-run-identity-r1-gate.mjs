import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const workflow = await readFile('.github/workflows/pages.yml', 'utf8')
const legacyReceipt = await readFile('scripts/mmj-ui29-build-receipt.mjs', 'utf8')
const r07 = workflow.includes('mmj_public_converge')

if (r07) {
  const receipt = await readFile('scripts/mmj-ui29-public-convergence-receipt.mjs', 'utf8')
  assert.ok(workflow.includes('run-name: mmj-converge:${{ github.event.client_payload.convergenceKey }}'), 'R07 repository_dispatch run-name must expose exact convergenceKey')
  assert.ok(workflow.includes('continue-on-error: true'), 'site build receipt callback must remain non-blocking')
  assert.ok(receipt.includes("const attemptLimit = state === 'started' ? 1 : 3"), 'bounded site terminal receipt retry policy drift')
  const bodyIndex = receipt.indexOf('const rawBody')
  const loopIndex = receipt.indexOf('for (let attempt')
  const nonceIndex = receipt.indexOf('const nonce')
  assert.ok(bodyIndex >= 0 && loopIndex >= 0 && bodyIndex < loopIndex, 'site terminal raw body must be generated before retry loop')
  assert.ok(nonceIndex > loopIndex, 'site receipt nonce must be generated inside retry loop')
  assert.ok(legacyReceipt.includes('MMJ-PORTFOLIO-BUILD-RECEIPT-V1'), 'legacy portfolio receipt tooling must remain available for historical R00-R06 runs')
} else {
  assert.ok(
    workflow.includes("run-name: ${{ github.event_name == 'repository_dispatch' && github.event.action == 'mmj_portfolio_promoted' && format('mmj-portfolio:{0}', github.event.client_payload.deliveryKey)"),
    'portfolio repository_dispatch run-name must expose exact deliveryKey',
  )
  assert.ok(workflow.includes("format('mmj-commission:{0}', github.event.client_payload.deliveryKey)"), 'commission dispatch run-name must use a distinct namespace')
  assert.ok(workflow.includes("format('mmj-site:{0}:{1}', github.event_name, github.sha)"), 'non-portfolio runs must use a distinct run-name namespace')
  assert.ok(workflow.includes('MMJ_DELIVERY_KEY: ${{ github.event_name == \'repository_dispatch\''), 'deliveryKey workflow binding missing')
  assert.ok(workflow.includes('continue-on-error: true'), 'build receipt callback must remain non-blocking')
  assert.ok(legacyReceipt.includes("const attemptLimit = state === 'succeeded' ? 3 : 1"), 'bounded success receipt retry policy drift')
  const bodyIndex = legacyReceipt.indexOf('const rawBody')
  const loopIndex = legacyReceipt.indexOf('for (let attempt')
  const nonceIndex = legacyReceipt.indexOf('const nonce')
  assert.ok(bodyIndex >= 0 && loopIndex >= 0 && bodyIndex < loopIndex, 'terminal raw body must be generated before retry loop')
  assert.ok(nonceIndex > loopIndex, 'nonce must be generated inside retry loop')
}
console.log('PASS_MMJ_UI29_PORTFOLIO_RECONCILIATION_RUN_IDENTITY_R1')
