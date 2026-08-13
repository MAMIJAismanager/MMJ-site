import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

import { decidePortfolioFailureReceiptEligibility } from './lib/mmj-ui29-pages-failure-receipt-authority.mjs'

function required(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required.`)
  return value
}

function parseVerifierError(stderr) {
  const lines = String(stderr || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean).reverse()
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line)
      if (parsed && typeof parsed === 'object' && typeof parsed.error === 'string') return parsed
    } catch {}
  }
  return null
}

const eventName = required('GITHUB_EVENT_NAME')
const eventAction = required('MMJ_GITHUB_EVENT_ACTION')
const buildResult = required('MMJ_BUILD_JOB_RESULT')
const deployResult = required('MMJ_DEPLOY_JOB_RESULT')
const decision = decidePortfolioFailureReceiptEligibility({ eventName, eventAction, buildResult, deployResult })

if (!decision.failureReceiptEligible) {
  console.log(JSON.stringify({
    event: 'PASS_MMJ_GITHUB_PAGES_SUPERSEDED_RUN_NEUTRAL_EXIT',
    classification: decision.classification,
    eventName,
    eventAction,
    buildResult,
    deployResult,
    failureReceiptEligible: false,
    cmsMutation: false,
  }))
  process.exit(0)
}

const root = process.cwd()
const verifier = resolve(root, 'scripts/mmj-ui29-failure-receipt-evidence-verify.mjs')
const authority = spawnSync(process.execPath, [verifier], {
  cwd: root,
  env: process.env,
  encoding: 'utf8',
})

if (authority.stdout) process.stdout.write(authority.stdout)

if (authority.status !== 0) {
  const verifierError = parseVerifierError(authority.stderr)
  if (verifierError?.error === 'E_MMJ_UI29_DISPATCH_HEAD_MISMATCH') {
    console.log(JSON.stringify({
      event: 'PASS_MMJ_GITHUB_PAGES_SUPERSEDED_RUN_NEUTRAL_EXIT',
      classification: 'SUPERSEDED',
      eventName,
      eventAction,
      buildResult,
      deployResult,
      failureReceiptEligible: false,
      currentDispatchAuthority: false,
      cmsMutation: false,
    }))
    process.exit(0)
  }
  if (authority.stderr) process.stderr.write(authority.stderr)
  throw new Error(`Failure receipt evidence verification failed before CMS mutation. verifierStatus=${authority.status ?? 'null'}`)
}

const receipt = resolve(root, 'scripts/mmj-ui29-build-receipt.mjs')
const delivery = spawnSync(process.execPath, [receipt, 'failed'], {
  cwd: root,
  env: process.env,
  encoding: 'utf8',
})
if (delivery.stdout) process.stdout.write(delivery.stdout)
if (delivery.stderr) process.stderr.write(delivery.stderr)
if (delivery.error) throw delivery.error
if (delivery.status !== 0) process.exit(delivery.status ?? 1)

console.log(JSON.stringify({
  event: 'PASS_MMJ_GITHUB_PAGES_ACTUAL_FAILURE_RECEIPT_ADMITTED',
  classification: 'FAILURE',
  eventName,
  eventAction,
  buildResult,
  deployResult,
  failureReceiptEligible: true,
  failureReceiptEvidenceAuthority: true,
  buildAdmissionAuthorityReused: false,
  cmsMutation: true,
}))
