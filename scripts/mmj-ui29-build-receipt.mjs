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
const now = new Date().toISOString()
const expectedDigest = required('MMJ_EXPECTED_SNAPSHOT_DIGEST')
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
    probeStatus: Number(process.env.MMJ_PROBE_STATUS || 200),
    probedAt: process.env.MMJ_PROBED_AT || now,
  } : null,
  error: state === 'failed' ? {
    code: process.env.MMJ_BUILD_ERROR_CODE || 'E_PUBLIC_BUILD_FAILED',
    message: process.env.MMJ_BUILD_ERROR_MESSAGE || 'GitHub Actions portfolio build failed.',
    phase: process.env.MMJ_BUILD_ERROR_PHASE || 'workflow',
  } : null,
  occurredAt: now,
}
const rawBody = Buffer.from(JSON.stringify(body))
const timestamp = now
const nonce = randomUUID().replaceAll('-', '')
const bodyDigest = createHash('sha256').update(rawBody).digest('hex')
const material = ['MMJ-PORTFOLIO-BUILD-RECEIPT-V1', timestamp, nonce, bodyDigest].join('\n')
const signature = createHmac('sha256', required('MMJ_PORTFOLIO_BUILD_RECEIPT_SECRET')).update(material).digest('hex')
const response = await fetch(required('MMJ_CMS_BUILD_RECEIPT_ENDPOINT'), {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-mmj-receipt-timestamp': timestamp,
    'x-mmj-receipt-nonce': nonce,
    'x-mmj-receipt-signature': `v1=${signature}`,
  },
  body: rawBody,
})
const responseText = await response.text()
if (!response.ok) throw new Error(`Build receipt callback failed: HTTP ${response.status} ${responseText.slice(0, 400)}`)
console.log(JSON.stringify({ event: 'PASS_MMJ_UI29_B_BUILD_RECEIPT_CALLBACK', state, status: response.status, deliveryKey: body.deliveryKey }))
