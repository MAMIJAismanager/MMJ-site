import assert from 'node:assert/strict'
import { readdir, readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')
const exists = async path => { try { await stat(resolve(root, path)); return true } catch { return false } }
const pages = await read('.github/workflows/pages.yml')
const r07 = pages.includes('mmj_public_converge')
const verifier = await read('scripts/mmj-ui29-dispatch-input-verify.mjs')
const generation = await read('scripts/lib/mmj-ui29-portfolio-dispatch-generation.mjs')
const legacyReceipt = await read('scripts/mmj-ui29-build-receipt.mjs')
const pkgText = await read('package.json')
const fixtureText = await read('scripts/fixtures/mmj-public-github-pages-dispatch-wire-r1.json')
const fixture = JSON.parse(fixtureText)
const pkg = JSON.parse(pkgText)

if (r07) {
  for (const token of [
    'repository_dispatch:', 'mmj_public_converge', 'github.event.client_payload.convergenceKey',
    'github.event.client_payload.source.commitSha', 'github.event.client_payload.portfolio.deliveryKey',
    'github.event.client_payload.portfolio.collectionVersionId', 'github.event.client_payload.portfolio.snapshotDigest',
    'github.event.client_payload.commission.publicationVersionId', 'github.event.client_payload.commission.snapshotDigest',
    'mmj-ui29-public-convergence-input-verify.mjs preflight', 'npm run sync:public-content',
    'mmj-ui29-public-convergence-input-verify.mjs post-adopt', 'actions/upload-pages-artifact@',
    'path: .output/public', 'actions/deploy-pages@', 'mmj-ui29-public-convergence-receipt.mjs started',
    'mmj-ui29-public-convergence-receipt.mjs succeeded', 'convergence-failure-receipt:',
  ]) assert.ok(pages.includes(token), `GitHub Pages R07 convergence token missing: ${token}`)
  for (const forbidden of ['mmj_portfolio_promoted', 'mmj-public-commission-guide-published', '\n  push:', '\n  workflow_dispatch:']) {
    assert.equal(pages.includes(forbidden), false, `retired direct dispatch authority remains: ${forbidden}`)
  }
} else {
  for (const token of [
    'repository_dispatch:', 'mmj_portfolio_promoted', 'github.event.client_payload.deliveryKey',
    'github.event.client_payload.collectionVersionId', 'github.event.client_payload.snapshotDigest',
    'github.event.client_payload.handoffReceiptId', 'github.event.client_payload.projectCount',
    'github.event.client_payload.assetCount', 'github.event.client_payload.sourceWorkbookRevision',
    'github.event.client_payload.collectionHeadRevision', 'github.event.client_payload.issuedAt',
    'mmj-ui29-dispatch-input-verify.mjs preflight', 'npm run sync:public-content',
    'mmj-ui29-dispatch-input-verify.mjs post-adopt', 'actions/upload-pages-artifact@',
    'path: .output/public', 'actions/deploy-pages@', 'node scripts/mmj-ui29-build-receipt.mjs started',
    'node scripts/mmj-ui29-build-receipt.mjs succeeded', 'portfolio-failure-receipt:',
  ]) assert.ok(pages.includes(token), `GitHub Pages direct dispatch token missing: ${token}`)
}

for (const retired of ['.github/workflows/mmj-cms-portfolio-deploy.yml', '.github/workflows/mmj-cms-commission-guide-deploy.yml']) {
  assert.equal(await exists(retired), false, `retired deploy workflow still exists: ${retired}`)
}
const workflowRoot = resolve(root, '.github', 'workflows')
const workflowNames = (await readdir(workflowRoot)).filter(name => /\.ya?ml$/i.test(name))
let workflowText = ''
for (const name of workflowNames) workflowText += `\n${await readFile(resolve(workflowRoot, name), 'utf8')}`
assert.equal((workflowText.match(/actions\/deploy-pages@/g) || []).length, 1, 'GitHub Pages deploy authority must be single')
for (const forbidden of ['cloudflare/wrangler-action', 'wrangler pages deploy']) assert.equal(workflowText.includes(forbidden), false, `retired Cloudflare Pages authority remains: ${forbidden}`)

assert.ok(verifier.includes('/api/v1/public/portfolio-snapshot/dispatch-generations/'))
assert.ok(generation.includes("projectCount: integer(env.MMJ_PROJECT_COUNT, 'project_count', 0)"))
assert.ok(generation.includes('generationDigest'))
assert.ok(legacyReceipt.includes("provider: 'github-pages'"))
assert.equal(legacyReceipt.includes("provider: 'cloudflare-pages'"), false)
assert.equal(pkg.mmjGithubPagesDispatchReconnectionRelease, fixture.release)
assert.ok(String(pkg.scripts?.['gate:github-pages-dispatch-reconnection-r1'] || '').includes('mmj-ui29-github-pages-dispatch-reconnection-r1-gate.mjs'))
assert.ok(String(pkg.scripts?.['gate:github-pages-dispatch-reconnection-r1'] || '').includes('mmj-ui29-github-pages-single-deploy-authority-test.mjs'))

console.log('PASS_MMJ_PUBLIC_GITHUB_PAGES_DISPATCH_RECONNECTION_R1_SITE_AUTHORITY')
console.log('PASS_MMJ_PUBLIC_GITHUB_PAGES_SINGLE_DEPLOY_AUTHORITY')
console.log('PASS_MMJ_PUBLIC_GITHUB_PAGES_EMPTY_COLLECTION_ADMISSION')
console.log('PASS_MMJ_PUBLIC_GITHUB_PAGES_BUILD_RECEIPT_PRESERVATION')
console.log('PASS_MMJ_PUBLIC_GITHUB_PAGES_R07_CONVERGENCE_AUTHORITY')
