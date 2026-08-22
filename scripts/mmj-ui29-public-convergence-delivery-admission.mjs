import { createHash, createHmac, randomUUID } from 'node:crypto'
import { appendFile } from 'node:fs/promises'
import { derivePublicConvergenceDeliveryIdentity, readPublicConvergenceEnvironment } from './lib/mmj-ui29-public-convergence.mjs'

const required = name => { const value = process.env[name]; if (!value) throw new Error(`${name} is required.`); return value }
const integer = name => { const value = Number(required(name)); if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${name} is invalid.`); return value }
const input = readPublicConvergenceEnvironment(process.env)
const deliveryIdentity = derivePublicConvergenceDeliveryIdentity({
  repository: input.target.source.repository,
  convergenceKey: input.convergenceKey,
  convergenceRevision: input.convergenceRevision,
  convergenceDigest: input.convergenceDigest,
})
const runId = integer('GITHUB_RUN_ID')
const runAttempt = integer('GITHUB_RUN_ATTEMPT')
const body = {
  schemaVersion: 1,
  contract: 'mmj-public-convergence-delivery-admission-v1',
  deliveryIdentity,
  convergenceKey: input.convergenceKey,
  convergenceRevision: input.convergenceRevision,
  convergenceDigest: input.convergenceDigest,
  snapshotContract: input.snapshotContract,
  snapshotDigest: input.snapshotDigest,
  repository: required('GITHUB_REPOSITORY'),
  workflowName: process.env.GITHUB_WORKFLOW || 'Deploy MMJ Site to GitHub Pages',
  githubEventName: required('GITHUB_EVENT_NAME'),
  githubRunId: runId,
  githubRunAttempt: runAttempt,
  githubRunUrl: `${required('GITHUB_SERVER_URL')}/${required('GITHUB_REPOSITORY')}/actions/runs/${runId}`,
  commitSha: input.target.source.commitSha,
  occurredAt: new Date().toISOString(),
}
if (body.githubEventName !== 'repository_dispatch') throw new Error('E_MMJ_PUBLIC_CONVERGENCE_DELIVERY_EVENT_INVALID')
if (body.repository !== input.target.source.repository) throw new Error('E_MMJ_PUBLIC_CONVERGENCE_DELIVERY_REPOSITORY_MISMATCH')
const rawBody = Buffer.from(JSON.stringify(body))
const endpoint = required('MMJ_CMS_PUBLIC_CONVERGENCE_DELIVERY_ADMISSION_ENDPOINT')
const secret = required('MMJ_PORTFOLIO_BUILD_RECEIPT_SECRET')
let result = null
let finalFailure = null
for (let attempt = 1; attempt <= 3; attempt += 1) {
  const timestamp = new Date().toISOString()
  const nonce = randomUUID().replaceAll('-', '')
  const digest = createHash('sha256').update(rawBody).digest('hex')
  const material = ['MMJ-PUBLIC-CONVERGENCE-DELIVERY-ADMISSION-V1', timestamp, nonce, digest].join('\n')
  const signature = createHmac('sha256', secret).update(material).digest('hex')
  try {
    const response = await fetch(endpoint, { method: 'POST', signal: AbortSignal.timeout(5_000), headers: { 'content-type': 'application/json', 'x-mmj-convergence-admission-timestamp': timestamp, 'x-mmj-convergence-admission-nonce': nonce, 'x-mmj-convergence-admission-signature': `v1=${signature}` }, body: rawBody })
    const text = await response.text()
    if (!response.ok) throw new Error(`HTTP ${response.status} ${text.slice(0, 500)}`)
    result = JSON.parse(text)
    break
  } catch (error) { finalFailure = error }
  if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 1000))
}
if (!result) throw new Error(`E_MMJ_PUBLIC_CONVERGENCE_DELIVERY_ADMISSION_FAILED:${finalFailure?.message ?? finalFailure}`)
if (result.deliveryIdentity !== deliveryIdentity) throw new Error('E_MMJ_PUBLIC_CONVERGENCE_DELIVERY_IDENTITY_RESPONSE_MISMATCH')
if (!['admitted', 'idempotent', 'duplicate', 'terminal'].includes(result.admission)) throw new Error('E_MMJ_PUBLIC_CONVERGENCE_DELIVERY_ADMISSION_RESPONSE_INVALID')
const buildAuthorized = result.buildAuthorized === true
const output = required('GITHUB_OUTPUT')
await appendFile(output, [
  `build_authorized=${buildAuthorized ? 'true' : 'false'}`,
  `admission=${result.admission}`,
  `relation=${result.relation}`,
  `delivery_identity=${deliveryIdentity}`,
  `owner_run_id=${result.owner?.githubRunId ?? ''}`,
  `owner_run_attempt=${result.owner?.githubRunAttempt ?? ''}`,
  '',
].join('\n'), 'utf8')
console.log(JSON.stringify({ event: 'MMJ_PUBLIC_CONVERGENCE_DELIVERY_ADMISSION', convergenceKey: input.convergenceKey, deliveryIdentity, admission: result.admission, buildAuthorized, owner: result.owner ?? null }))
