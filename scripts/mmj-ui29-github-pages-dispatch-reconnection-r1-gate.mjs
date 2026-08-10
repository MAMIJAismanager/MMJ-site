import assert from 'node:assert/strict'
import { readdir, readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')
const exists = async path => { try { await stat(resolve(root, path)); return true } catch { return false } }
const [pages, verifier, receipt, pkgText, fixtureText] = await Promise.all([
  read('.github/workflows/pages.yml'),
  read('scripts/mmj-ui29-dispatch-input-verify.mjs'),
  read('scripts/mmj-ui29-build-receipt.mjs'),
  read('package.json'),
  read('scripts/fixtures/mmj-public-github-pages-dispatch-wire-r1.json'),
])
const fixture = JSON.parse(fixtureText)
const pkg = JSON.parse(pkgText)

for (const token of [
  'repository_dispatch:',
  'mmj_portfolio_promoted',
  "github.event.client_payload.deliveryKey",
  "github.event.client_payload.collectionVersionId",
  "github.event.client_payload.snapshotDigest",
  "github.event.client_payload.handoffReceiptId",
  "github.event.client_payload.projectCount",
  "github.event.client_payload.assetCount",
  "github.event.client_payload.sourceWorkbookRevision",
  "github.event.client_payload.collectionHeadRevision",
  "github.event.client_payload.issuedAt",
  'mmj-ui29-dispatch-input-verify.mjs preflight',
  'npm run sync:public-content',
  'mmj-ui29-dispatch-input-verify.mjs post-adopt',
  'actions/upload-pages-artifact@',
  'path: .output/public',
  'actions/deploy-pages@',
  'node scripts/mmj-ui29-build-receipt.mjs started',
  'node scripts/mmj-ui29-build-receipt.mjs succeeded',
  'portfolio-failure-receipt:',
  'mmj-ui29-public-deployment-probe.mjs --observe',
]) assert.ok(pages.includes(token), `GitHub Pages direct dispatch token missing: ${token}`)

for (const retired of [
  '.github/workflows/mmj-cms-portfolio-deploy.yml',
  '.github/workflows/mmj-cms-commission-guide-deploy.yml',
]) assert.equal(await exists(retired), false, `retired deploy workflow still exists: ${retired}`)

const workflowRoot = resolve(root, '.github', 'workflows')
const workflowNames = (await readdir(workflowRoot)).filter(name => /\.ya?ml$/i.test(name))
let workflowText = ''
for (const name of workflowNames) workflowText += `\n${await readFile(resolve(workflowRoot, name), 'utf8')}`
assert.equal((workflowText.match(/actions\/deploy-pages@/g) || []).length, 1, 'GitHub Pages deploy authority must be single')
for (const forbidden of ['cloudflare/wrangler-action', 'wrangler pages deploy']) assert.equal(workflowText.includes(forbidden), false, `retired Cloudflare Pages authority remains: ${forbidden}`)

assert.ok(verifier.includes('function nonNegativeInteger'))
assert.ok(verifier.includes("projectCount: nonNegativeInteger(required.projectCount, 'projectCount')"))
assert.ok(verifier.includes("assetCount: nonNegativeInteger(required.assetCount, 'assetCount')"))
assert.ok(verifier.includes("sourceWorkbookRevision: positiveInteger(required.sourceWorkbookRevision, 'sourceWorkbookRevision')"))
assert.ok(verifier.includes("collectionHeadRevision: positiveInteger(required.collectionHeadRevision, 'collectionHeadRevision')"))
assert.ok(receipt.includes("provider: 'github-pages'"))
assert.equal(receipt.includes("provider: 'cloudflare-pages'"), false)
assert.equal(pkg.mmjGithubPagesDispatchReconnectionRelease, fixture.release)
assert.ok(String(pkg.scripts?.['gate:github-pages-dispatch-reconnection-r1'] || '').includes('mmj-ui29-github-pages-dispatch-reconnection-r1-gate.mjs'))
assert.ok(String(pkg.scripts?.['gate:github-pages-dispatch-reconnection-r1'] || '').includes('mmj-ui29-github-pages-single-deploy-authority-test.mjs'))

console.log('PASS_MMJ_PUBLIC_GITHUB_PAGES_DISPATCH_RECONNECTION_R1_SITE_AUTHORITY')
console.log('PASS_MMJ_PUBLIC_GITHUB_PAGES_SINGLE_DEPLOY_AUTHORITY')
console.log('PASS_MMJ_PUBLIC_GITHUB_PAGES_EMPTY_COLLECTION_ADMISSION')
console.log('PASS_MMJ_PUBLIC_GITHUB_PAGES_BUILD_RECEIPT_PRESERVATION')
console.log('PASS_MMJ_PUBLIC_GITHUB_PAGES_CANONICAL_PROBE_PRESERVATION')
