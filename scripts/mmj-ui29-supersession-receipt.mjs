import { createHash, createHmac, randomUUID } from 'node:crypto'

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
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const observedCurrentAuthority = {
  deliveryKey: required('MMJ_SUPERSESSION_OBSERVED_CURRENT_DELIVERY_KEY'),
  collectionVersionId: required('MMJ_SUPERSESSION_OBSERVED_CURRENT_COLLECTION_VERSION_ID'),
  snapshotDigest: required('MMJ_SUPERSESSION_OBSERVED_CURRENT_SNAPSHOT_DIGEST'),
  collectionHeadRevision: integer('MMJ_SUPERSESSION_OBSERVED_CURRENT_HEAD_REVISION'),
}
const body = {
  schemaVersion: 1,
  contract: 'mmj-portfolio-supersession-receipt-v1',
  deliveryKey: required('MMJ_DELIVERY_KEY'),
  generationContract: required('MMJ_DISPATCH_GENERATION_CONTRACT'),
  generationDigest: required('MMJ_DISPATCH_GENERATION_DIGEST'),
  reason: 'delivery-no-longer-current',
  phase: 'before-deploy',
  observedCurrentAuthority,
  repository: required('GITHUB_REPOSITORY'),
  workflowName: process.env.GITHUB_WORKFLOW || 'Deploy MMJ Site to GitHub Pages',
  githubRunId: integer('GITHUB_RUN_ID'),
  githubRunAttempt: integer('GITHUB_RUN_ATTEMPT'),
  githubRunUrl: `${required('GITHUB_SERVER_URL')}/${required('GITHUB_REPOSITORY')}/actions/runs/${required('GITHUB_RUN_ID')}`,
  commitSha: required('GITHUB_SHA'),
  occurredAt: new Date().toISOString(),
}
const rawBody = Buffer.from(JSON.stringify(body))
const endpoint = required('MMJ_CMS_SUPERSESSION_RECEIPT_ENDPOINT')
const secret = required('MMJ_PORTFOLIO_BUILD_RECEIPT_SECRET')
let finalFailure = null
for (let attempt = 1; attempt <= 3; attempt += 1) {
  const timestamp = new Date().toISOString()
  const nonce = randomUUID().replaceAll('-', '')
  const bodyDigest = createHash('sha256').update(rawBody).digest('hex')
  const material = ['MMJ-PORTFOLIO-SUPERSESSION-RECEIPT-V1', timestamp, nonce, bodyDigest].join('\n')
  const signature = createHmac('sha256', secret).update(material).digest('hex')
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      signal: AbortSignal.timeout(3_000),
      headers: {
        'content-type': 'application/json',
        'x-mmj-portfolio-supersession-timestamp': timestamp,
        'x-mmj-portfolio-supersession-nonce': nonce,
        'x-mmj-portfolio-supersession-signature': `v1=${signature}`,
      },
      body: rawBody,
    })
    const responseText = await response.text()
    if (response.ok) {
      console.log(JSON.stringify({ event: 'PASS_MMJ_UI29_SUPERSESSION_RECEIPT_CALLBACK', status: response.status, deliveryKey: body.deliveryKey, attempt }))
      process.exit(0)
    }
    finalFailure = new Error(`Supersession receipt callback failed: HTTP ${response.status} ${responseText.slice(0, 400)}`)
  } catch (error) {
    finalFailure = error
  }
  if (attempt < 3) await sleep(attempt * 1_000)
}
throw new Error(`Supersession receipt callback failed after 3 attempts: ${String(finalFailure?.message || finalFailure || 'unknown error')}`)
