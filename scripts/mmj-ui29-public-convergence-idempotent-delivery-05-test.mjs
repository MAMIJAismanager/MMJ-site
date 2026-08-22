import assert from 'node:assert/strict'
import { createHash, createHmac } from 'node:crypto'
import { createServer } from 'node:http'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { derivePublicConvergenceDeliveryIdentity, derivePublicConvergenceDigest } from './lib/mmj-ui29-public-convergence.mjs'

const repository = 'MAMIJAismanager/MMJ-site'
const source = { repository, ref: 'refs/heads/main', commitSha: '1'.repeat(40) }
const portfolio = {
  deliveryKey: `pdispatch_v1_${'2'.repeat(64)}`,
  generationContract: 'mmj-portfolio-dispatch-generation-identity-v1',
  generationDigest: '3'.repeat(64),
  collectionVersionId: 'pcol_idempotent05',
  snapshotDigest: '4'.repeat(64),
  handoffReceiptId: 'phnd_idempotent05',
  projectCount: 2,
  assetCount: 3,
  sourceWorkbookRevision: 51,
  collectionHeadRevision: 61,
  issuedAt: '2026-08-22T04:30:00.000Z',
}
const commission = {
  guideId: 'default',
  publicationVersionId: 'cgv_idempotentdelivery05',
  snapshotDigest: '5'.repeat(64),
  contentDigest: '6'.repeat(64),
  handoffReceiptId: 'cgh_idempotentdelivery05',
  sourceWorkbookRevision: 71,
  publicationHeadRevision: 81,
  issuedAt: '2026-08-22T04:30:00.000Z',
}
const target = { source, portfolio, commission }
const convergenceDigest = derivePublicConvergenceDigest(target)
const base = { repository, convergenceKey: `pcv_${'a'.repeat(32)}`, convergenceRevision: 7, convergenceDigest }
const x = derivePublicConvergenceDeliveryIdentity(base)
const y = derivePublicConvergenceDeliveryIdentity({ ...base })
const z = derivePublicConvergenceDeliveryIdentity({ ...base, convergenceRevision: 8 })
assert.equal(x, y)
assert.notEqual(x, z)
assert.match(x, /^pcdi_v1_[0-9a-f]{64}$/)
console.log('PASS_05_PUBLIC_STABLE_DELIVERY_IDENTITY')

const secret = 'public-idempotent-delivery-05-secret-0123456789'
let observed = null
const server = createServer(async (req, res) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks)
  const timestamp = String(req.headers['x-mmj-convergence-admission-timestamp'] ?? '')
  const nonce = String(req.headers['x-mmj-convergence-admission-nonce'] ?? '')
  const signature = String(req.headers['x-mmj-convergence-admission-signature'] ?? '')
  const digest = createHash('sha256').update(raw).digest('hex')
  const expected = `v1=${createHmac('sha256', secret).update(['MMJ-PUBLIC-CONVERGENCE-DELIVERY-ADMISSION-V1', timestamp, nonce, digest].join('\n')).digest('hex')}`
  assert.equal(signature, expected)
  const body = JSON.parse(raw.toString('utf8'))
  observed = body
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ schemaVersion: 1, accepted: true, admission: 'admitted', buildAuthorized: true, relation: 'current', deliveryIdentity: body.deliveryIdentity, owner: { githubRunId: body.githubRunId, githubRunAttempt: body.githubRunAttempt, githubRunUrl: body.githubRunUrl } }))
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const address = server.address()
const dir = await mkdtemp(join(tmpdir(), 'mmj05-'))
const output = join(dir, 'github-output.txt')
const env = {
  ...process.env,
  MMJ_PUBLIC_CONVERGENCE_KEY: base.convergenceKey,
  MMJ_PUBLIC_CONVERGENCE_REVISION: String(base.convergenceRevision),
  MMJ_PUBLIC_CONVERGENCE_DIGEST: convergenceDigest,
MMJ_PUBLIC_CONVERGENCE_SNAPSHOT_CONTRACT: 'mmj-public-convergence-exact-snapshot-v1',
MMJ_PUBLIC_CONVERGENCE_SNAPSHOT_DIGEST: convergenceDigest,
  MMJ_PUBLIC_CONVERGENCE_ISSUED_AT: '2026-08-22T04:30:01.000Z',
  MMJ_PUBLIC_SOURCE_REPOSITORY: source.repository,
  MMJ_PUBLIC_SOURCE_REF: source.ref,
  MMJ_PUBLIC_SOURCE_COMMIT_SHA: source.commitSha,
  MMJ_DELIVERY_KEY: portfolio.deliveryKey,
  MMJ_DISPATCH_GENERATION_CONTRACT: portfolio.generationContract,
  MMJ_DISPATCH_GENERATION_DIGEST: portfolio.generationDigest,
  MMJ_COLLECTION_VERSION_ID: portfolio.collectionVersionId,
  MMJ_EXPECTED_SNAPSHOT_DIGEST: portfolio.snapshotDigest,
  MMJ_HANDOFF_RECEIPT_ID: portfolio.handoffReceiptId,
  MMJ_PROJECT_COUNT: String(portfolio.projectCount),
  MMJ_ASSET_COUNT: String(portfolio.assetCount),
  MMJ_SOURCE_WORKBOOK_REVISION: String(portfolio.sourceWorkbookRevision),
  MMJ_COLLECTION_HEAD_REVISION: String(portfolio.collectionHeadRevision),
  MMJ_ISSUED_AT: portfolio.issuedAt,
  MMJ_COMMISSION_GUIDE_ID: commission.guideId,
  MMJ_COMMISSION_PUBLICATION_VERSION_ID: commission.publicationVersionId,
  MMJ_COMMISSION_EXPECTED_SNAPSHOT_DIGEST: commission.snapshotDigest,
  MMJ_COMMISSION_CONTENT_DIGEST: commission.contentDigest,
  MMJ_COMMISSION_HANDOFF_RECEIPT_ID: commission.handoffReceiptId,
  MMJ_COMMISSION_SOURCE_WORKBOOK_REVISION: String(commission.sourceWorkbookRevision),
  MMJ_COMMISSION_PUBLICATION_HEAD_REVISION: String(commission.publicationHeadRevision),
  MMJ_COMMISSION_ISSUED_AT: commission.issuedAt,
  MMJ_CMS_PUBLIC_CONVERGENCE_DELIVERY_ADMISSION_ENDPOINT: `http://127.0.0.1:${address.port}/admit`,
  MMJ_PORTFOLIO_BUILD_RECEIPT_SECRET: secret,
  GITHUB_REPOSITORY: repository,
  GITHUB_WORKFLOW: 'Deploy MMJ Site to GitHub Pages',
  GITHUB_EVENT_NAME: 'repository_dispatch',
  GITHUB_RUN_ID: '9001',
  GITHUB_RUN_ATTEMPT: '2',
  GITHUB_SERVER_URL: 'https://github.com',
  GITHUB_OUTPUT: output,
}
const child = spawn(process.execPath, ['scripts/mmj-ui29-public-convergence-delivery-admission.mjs'], { cwd: process.cwd(), env, stdio: ['ignore', 'pipe', 'pipe'] })
let stdout = '', stderr = ''
child.stdout.on('data', chunk => { stdout += chunk })
child.stderr.on('data', chunk => { stderr += chunk })
const code = await new Promise(resolve => child.on('close', resolve))
server.close()
assert.equal(code, 0, stderr || stdout)
assert.equal(observed?.deliveryIdentity, x)
assert.equal(observed?.githubRunId, 9001)
assert.equal(observed?.githubRunAttempt, 2)
assert.equal(observed?.githubEventName, 'repository_dispatch')
assert.equal(observed?.snapshotContract, 'mmj-public-convergence-exact-snapshot-v1')
assert.equal(observed?.snapshotDigest, convergenceDigest)
const outputText = await readFile(output, 'utf8')
assert.match(outputText, /build_authorized=true/)
assert.match(outputText, /admission=admitted/)
assert.match(outputText, new RegExp(`delivery_identity=${x}`))
await rm(dir, { recursive: true, force: true })
console.log('PASS_05_PUBLIC_SIGNED_DELIVERY_ADMISSION_RUNTIME')
