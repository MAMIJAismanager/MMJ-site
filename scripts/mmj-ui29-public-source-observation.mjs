import { createHash, createHmac, randomUUID } from 'node:crypto'

const required = name => { const value = process.env[name]; if (!value) throw new Error(`${name} is required.`); return value }
const integer = name => { const value = Number(required(name)); if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${name} is invalid.`); return value }
const body = {
  schemaVersion: 1,
  contract: 'mmj-public-source-revision-observation-v1',
  repository: required('GITHUB_REPOSITORY'),
  ref: 'refs/heads/main',
  beforeSha: required('MMJ_SOURCE_BEFORE_SHA').toLowerCase(),
  afterSha: required('MMJ_SOURCE_AFTER_SHA').toLowerCase(),
  forced: process.env.MMJ_SOURCE_PUSH_FORCED === 'true',
  githubRunId: integer('GITHUB_RUN_ID'),
  githubRunAttempt: integer('GITHUB_RUN_ATTEMPT'),
  githubRunUrl: `${required('GITHUB_SERVER_URL')}/${required('GITHUB_REPOSITORY')}/actions/runs/${required('GITHUB_RUN_ID')}`,
  occurredAt: new Date().toISOString(),
}
for (const [field, value] of [['beforeSha', body.beforeSha], ['afterSha', body.afterSha]]) if (!/^[0-9a-f]{40}$/.test(value)) throw new Error(`E_MMJ_PUBLIC_SOURCE_SHA_INVALID:${field}`)
const rawBody = Buffer.from(JSON.stringify(body))
const endpoint = required('MMJ_CMS_PUBLIC_SOURCE_OBSERVATION_ENDPOINT')
const secret = required('MMJ_PORTFOLIO_BUILD_RECEIPT_SECRET')
let failure = null
for (let attempt = 1; attempt <= 3; attempt += 1) {
  const timestamp = new Date().toISOString()
  const nonce = randomUUID().replaceAll('-', '')
  const digest = createHash('sha256').update(rawBody).digest('hex')
  const material = ['MMJ-PUBLIC-SOURCE-REVISION-OBSERVATION-V1', timestamp, nonce, digest].join('\n')
  const signature = createHmac('sha256', secret).update(material).digest('hex')
  try {
    const response = await fetch(endpoint, { method: 'POST', signal: AbortSignal.timeout(5_000), headers: { 'content-type': 'application/json', 'x-mmj-public-source-timestamp': timestamp, 'x-mmj-public-source-nonce': nonce, 'x-mmj-public-source-signature': `v1=${signature}` }, body: rawBody })
    const text = await response.text()
    if (response.ok) { console.log(JSON.stringify({ event: 'PASS_MMJ_PUBLIC_SOURCE_OBSERVATION', afterSha: body.afterSha, attempt })); process.exit(0) }
    failure = new Error(`HTTP ${response.status} ${text.slice(0, 400)}`)
  } catch (error) { failure = error }
  if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 1000))
}
throw new Error(`Public source observation failed: ${failure?.message ?? failure}`)
