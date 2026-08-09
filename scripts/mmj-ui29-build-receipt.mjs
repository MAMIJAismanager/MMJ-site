import { createHash, createHmac, randomUUID } from 'node:crypto'

const state = process.argv[2]
if (!['started', 'succeeded', 'failed'].includes(state)) throw new Error('Expected started, succeeded, or failed.')
const required = name => {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required.`)
  return value
}
const integer = name => {
  const value = Number(required(name))
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${name} is invalid.`)
  return value
}
const optionalProbe = () => {
  const rawStatus = process.env.MMJ_PROBE_STATUS
  const rawProbedAt = process.env.MMJ_PROBED_AT
  if (!rawStatus && !rawProbedAt) return { probeStatus: null, probedAt: null }
  if (!rawStatus || !rawProbedAt) throw new Error('MMJ probe receipt fields must both be present or both be absent.')
  const probeStatus = Number(rawStatus)
  if (!Number.isSafeInteger(probeStatus) || probeStatus < 0) throw new Error('MMJ_PROBE_STATUS is invalid.')
  const parsedAt = Date.parse(rawProbedAt)
  if (!Number.isFinite(parsedAt) || new Date(parsedAt).toISOString() !== rawProbedAt) throw new Error('MMJ_PROBED_AT is invalid.')
  return { probeStatus, probedAt: rawProbedAt }
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const now = new Date().toISOString()
const expectedDigest = required('MMJ_EXPECTED_SNAPSHOT_DIGEST')
const probe = state === 'succeeded' ? optionalProbe() : { probeStatus: null, probedAt: null }
const body = {
  schemaVersion: 1,
  deliveryKey: required('MMJ_DELIVERY_KEY'),
  collectionVersionId: required('MMJ_COLLECTION_VERSION_ID'),
  snapshotDigest: expectedDigest,
  handoffReceiptId: required('MMJ_HANDOFF_RECEIPT_ID'),
  projectCount: integer('MMJ_PROJECT_COUNT'),
  assetCount: integer('MMJ_ASSET_COUNT'),
  sourceWorkbookRevision: integer('MMJ_SOURCE_WORKBOOK_REVISION'),
  collectionHeadRevision: integer('MMJ_COLLECTION_HEAD_REVISION'),
  state,
  repository: required('GITHUB_REPOSITORY'),
  workflowName: process.env.GITHUB_WORKFLOW || 'Deploy MMJ Site to GitHub Pages',
  githubRunId: integer('GITHUB_RUN_ID'),
  githubRunAttempt: integer('GITHUB_RUN_ATTEMPT'),
  githubRunUrl: `${required('GITHUB_SERVER_URL')}/${required('GITHUB_REPOSITORY')}/actions/runs/${required('GITHUB_RUN_ID')}`,
  commitSha: required('GITHUB_SHA'),
  deployment: state === 'succeeded' ? {
    provider: 'github-pages',
    deploymentId: process.env.MMJ_DEPLOYMENT_ID || `github-pages-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`,
    deploymentUrl: process.env.MMJ_DEPLOYMENT_URL || required('MMJ_CANONICAL_PUBLIC_URL'),
    canonicalPublicUrl: required('MMJ_CANONICAL_PUBLIC_URL'),
    deployedSnapshotDigest: expectedDigest,
    probeStatus: probe.probeStatus,
    probedAt: probe.probedAt,
  } : null,
  error: state === 'failed' ? {
    code: process.env.MMJ_BUILD_ERROR_CODE || 'E_PUBLIC_BUILD_FAILED',
    message: process.env.MMJ_BUILD_ERROR_MESSAGE || 'GitHub Actions portfolio build failed.',
    phase: process.env.MMJ_BUILD_ERROR_PHASE || 'workflow',
  } : null,
  occurredAt: now,
}
const rawBody = Buffer.from(JSON.stringify(body))
const endpoint = required('MMJ_CMS_BUILD_RECEIPT_ENDPOINT')
const secret = required('MMJ_PORTFOLIO_BUILD_RECEIPT_SECRET')
const attemptLimit = state === 'succeeded' ? 3 : 1
let finalFailure = null

for (let attempt = 1; attempt <= attemptLimit; attempt += 1) {
  const timestamp = new Date().toISOString()
  const nonce = randomUUID().replaceAll('-', '')
  const bodyDigest = createHash('sha256').update(rawBody).digest('hex')
  const material = ['MMJ-PORTFOLIO-BUILD-RECEIPT-V1', timestamp, nonce, bodyDigest].join('\n')
  const signature = createHmac('sha256', secret).update(material).digest('hex')

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      signal: AbortSignal.timeout(3_000),
      headers: {
        'content-type': 'application/json',
        'x-mmj-receipt-timestamp': timestamp,
        'x-mmj-receipt-nonce': nonce,
        'x-mmj-receipt-signature': `v1=${signature}`,
      },
      body: rawBody,
    })
    const responseText = await response.text()
    if (response.ok) {
      console.log(JSON.stringify({ event: 'PASS_MMJ_UI29_B_BUILD_RECEIPT_CALLBACK', state, status: response.status, deliveryKey: body.deliveryKey, attempt }))
      process.exit(0)
    }
    finalFailure = new Error(`Build receipt callback failed: HTTP ${response.status} ${responseText.slice(0, 400)}`)
  } catch (error) {
    finalFailure = error
  }

  if (attempt < attemptLimit) await sleep(attempt * 1_000)
}

throw new Error(`Build receipt callback failed after ${attemptLimit} attempt(s): ${String(finalFailure?.message || finalFailure || 'unknown error')}`)
