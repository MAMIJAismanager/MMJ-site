import { createHash, createHmac, randomUUID } from 'node:crypto'
import { readPublicConvergenceEnvironment } from './lib/mmj-ui29-public-convergence.mjs'

const state = process.argv[2]
if (!['started', 'succeeded', 'failed'].includes(state)) throw new Error('Expected started, succeeded, or failed.')
const required = name => { const value = process.env[name]; if (!value) throw new Error(`${name} is required.`); return value }
const integer = name => { const value = Number(required(name)); if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${name} is invalid.`); return value }
const input = readPublicConvergenceEnvironment(process.env)
const body = {
  schemaVersion: 1,
  contract: 'mmj-public-convergence-build-receipt-v1',
  convergenceKey: input.convergenceKey,
  convergenceDigest: input.convergenceDigest,
  state,
  repository: required('GITHUB_REPOSITORY'),
  workflowName: process.env.GITHUB_WORKFLOW || 'Deploy MMJ Site to GitHub Pages',
  githubRunId: integer('GITHUB_RUN_ID'),
  githubRunAttempt: integer('GITHUB_RUN_ATTEMPT'),
  githubRunUrl: `${required('GITHUB_SERVER_URL')}/${required('GITHUB_REPOSITORY')}/actions/runs/${required('GITHUB_RUN_ID')}`,
  commitSha: input.target.source.commitSha,
  deployment: state === 'succeeded' ? {
    provider: 'github-pages',
    deploymentId: process.env.MMJ_DEPLOYMENT_ID || `github-pages-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`,
    deploymentUrl: process.env.MMJ_DEPLOYMENT_URL || required('MMJ_CANONICAL_PUBLIC_URL'),
    canonicalPublicUrl: required('MMJ_CANONICAL_PUBLIC_URL'),
    publicConvergenceDigest: input.convergenceDigest,
  } : null,
  error: state === 'failed' ? {
    code: process.env.MMJ_BUILD_ERROR_CODE || 'E_PUBLIC_CONVERGENCE_BUILD_FAILED',
    message: process.env.MMJ_BUILD_ERROR_MESSAGE || 'GitHub Actions public convergence build failed.',
    phase: process.env.MMJ_BUILD_ERROR_PHASE || 'workflow',
  } : null,
  occurredAt: new Date().toISOString(),
}
const rawBody = Buffer.from(JSON.stringify(body))
const endpoint = required('MMJ_CMS_PUBLIC_CONVERGENCE_BUILD_RECEIPT_ENDPOINT')
const secret = required('MMJ_PORTFOLIO_BUILD_RECEIPT_SECRET')
const attemptLimit = state === 'started' ? 1 : 3
let finalFailure = null
for (let attempt = 1; attempt <= attemptLimit; attempt += 1) {
  const timestamp = new Date().toISOString()
  const nonce = randomUUID().replaceAll('-', '')
  const digest = createHash('sha256').update(rawBody).digest('hex')
  const material = ['MMJ-PUBLIC-CONVERGENCE-BUILD-RECEIPT-V1', timestamp, nonce, digest].join('\n')
  const signature = createHmac('sha256', secret).update(material).digest('hex')
  try {
    const response = await fetch(endpoint, { method: 'POST', signal: AbortSignal.timeout(3_000), headers: { 'content-type': 'application/json', 'x-mmj-convergence-receipt-timestamp': timestamp, 'x-mmj-convergence-receipt-nonce': nonce, 'x-mmj-convergence-receipt-signature': `v1=${signature}` }, body: rawBody })
    const text = await response.text()
    if (response.ok) { console.log(JSON.stringify({ event: 'PASS_MMJ_PUBLIC_CONVERGENCE_RECEIPT', state, attempt, convergenceKey: input.convergenceKey })); process.exit(0) }
    finalFailure = new Error(`HTTP ${response.status} ${text.slice(0, 400)}`)
  } catch (error) { finalFailure = error }
  if (attempt < attemptLimit) await new Promise(resolve => setTimeout(resolve, attempt * 1000))
}
throw new Error(`Public convergence receipt failed after ${attemptLimit} attempt(s): ${finalFailure?.message ?? finalFailure}`)
