import { createHash, createHmac, randomUUID } from 'node:crypto'
import { readPublicConvergenceEnvironment } from './lib/mmj-ui29-public-convergence.mjs'

const required = name => { const value = process.env[name]; if (!value) throw new Error(`${name} is required.`); return value }
const integer = name => { const value = Number(required(name)); if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${name} is invalid.`); return value }
const input = readPublicConvergenceEnvironment(process.env)
const body = {
  schemaVersion: 1,
  contract: 'mmj-public-convergence-supersession-receipt-v1',
  convergenceKey: input.convergenceKey,
  convergenceDigest: input.convergenceDigest,
  reason: 'convergence-no-longer-current',
  phase: 'before-deploy',
  observedCurrentAuthority: {
    convergenceKey: required('MMJ_CONVERGENCE_OBSERVED_CURRENT_KEY'),
    convergenceDigest: required('MMJ_CONVERGENCE_OBSERVED_CURRENT_DIGEST'),
    convergenceRevision: integer('MMJ_CONVERGENCE_OBSERVED_CURRENT_REVISION'),
  },
  repository: required('GITHUB_REPOSITORY'),
  workflowName: process.env.GITHUB_WORKFLOW || 'Deploy MMJ Site to GitHub Pages',
  githubRunId: integer('GITHUB_RUN_ID'),
  githubRunAttempt: integer('GITHUB_RUN_ATTEMPT'),
  githubRunUrl: `${required('GITHUB_SERVER_URL')}/${required('GITHUB_REPOSITORY')}/actions/runs/${required('GITHUB_RUN_ID')}`,
  commitSha: input.target.source.commitSha,
  occurredAt: new Date().toISOString(),
}
const rawBody = Buffer.from(JSON.stringify(body))
const endpoint = required('MMJ_CMS_PUBLIC_CONVERGENCE_SUPERSESSION_RECEIPT_ENDPOINT')
const secret = required('MMJ_PORTFOLIO_BUILD_RECEIPT_SECRET')
let failure = null
for (let attempt = 1; attempt <= 3; attempt += 1) {
  const timestamp = new Date().toISOString()
  const nonce = randomUUID().replaceAll('-', '')
  const digest = createHash('sha256').update(rawBody).digest('hex')
  const material = ['MMJ-PUBLIC-CONVERGENCE-SUPERSESSION-RECEIPT-V1', timestamp, nonce, digest].join('\n')
  const signature = createHmac('sha256', secret).update(material).digest('hex')
  try {
    const response = await fetch(endpoint, { method: 'POST', signal: AbortSignal.timeout(3_000), headers: { 'content-type': 'application/json', 'x-mmj-convergence-supersession-timestamp': timestamp, 'x-mmj-convergence-supersession-nonce': nonce, 'x-mmj-convergence-supersession-signature': `v1=${signature}` }, body: rawBody })
    const text = await response.text()
    if (response.ok) { console.log(JSON.stringify({ event: 'PASS_MMJ_PUBLIC_CONVERGENCE_SUPERSESSION_RECEIPT', convergenceKey: input.convergenceKey, attempt })); process.exit(0) }
    failure = new Error(`HTTP ${response.status} ${text.slice(0, 400)}`)
  } catch (error) { failure = error }
  if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 1000))
}
throw new Error(`Public convergence supersession receipt failed: ${failure?.message ?? failure}`)
