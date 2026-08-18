import assert from 'node:assert/strict'
import { readdir, readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const workflowRoot = resolve(root, '.github', 'workflows')
const pages = await readFile(resolve(workflowRoot, 'pages.yml'), 'utf8')
const r07 = pages.includes('mmj_public_converge')
const exists = async path => { try { await stat(resolve(root, path)); return true } catch { return false } }

for (const retired of ['.github/workflows/mmj-cms-portfolio-deploy.yml', '.github/workflows/mmj-cms-commission-guide-deploy.yml']) {
  assert.equal(await exists(retired), false, `retired deployment workflow still exists: ${retired}`)
}

if (r07) {
  for (const token of [
    'repository_dispatch:', 'mmj_public_converge', 'group: github-pages', 'actions/upload-pages-artifact@',
    'path: .output/public', 'actions/deploy-pages@', 'environment:', 'name: github-pages',
    'mmj-ui29-public-convergence-input-verify.mjs preflight', 'mmj-ui29-public-convergence-input-verify.mjs post-adopt',
    'deployment-admission:', 'convergence-success-receipt:', 'convergence-supersession-receipt:', 'convergence-failure-receipt:',
  ]) assert.ok(pages.includes(token), `GitHub Pages convergence authority token missing: ${token}`)
  for (const forbidden of ['mmj_portfolio_promoted', 'mmj-public-commission-guide-published', '\n  push:', '\n  workflow_dispatch:']) {
    assert.equal(pages.includes(forbidden), false, `retired direct Pages authority remains: ${forbidden}`)
  }
} else {
  for (const token of [
    'repository_dispatch:', 'mmj_portfolio_promoted', 'mmj-public-commission-guide-published', 'group: github-pages',
    'actions/upload-pages-artifact@', 'path: .output/public', 'actions/deploy-pages@', 'environment:', 'name: github-pages',
    'mmj-ui29-dispatch-input-verify.mjs preflight', 'mmj-ui29-dispatch-input-verify.mjs post-adopt',
    'mmj-ui29-commission-dispatch-input-verify.mjs preflight', 'mmj-ui29-commission-dispatch-input-verify.mjs post-adopt',
    'node scripts/mmj-ui29-publish-release-receipt.mjs', 'portfolio-observe:', 'portfolio-failure-receipt:', 'Report portfolio deployment committed',
  ]) assert.ok(pages.includes(token), `GitHub Pages authority token missing: ${token}`)
}

const rebuild = pages.indexOf('npm rebuild')
const emitReceipt = pages.indexOf('node scripts/mmj-ui29-publish-release-receipt.mjs')
const generate = pages.indexOf('npm run generate:local')
const upload = pages.indexOf('actions/upload-pages-artifact@')
assert.ok(rebuild >= 0 && rebuild < emitReceipt && emitReceipt < generate && generate < upload, 'receipt/build/upload lifecycle order drift')
const deploy = pages.indexOf('actions/deploy-pages@')
const successReceipt = pages.indexOf(r07 ? 'node scripts/mmj-ui29-public-convergence-receipt.mjs succeeded' : 'node scripts/mmj-ui29-build-receipt.mjs succeeded')
assert.ok(deploy >= 0 && deploy < successReceipt, 'GitHub Pages deployment must commit before the CMS success receipt')
assert.equal(pages.includes('portfolio-finalize:'), false, 'retired portfolio-finalize success barrier remains')

const workflowNames = (await readdir(workflowRoot)).filter(name => /\.ya?ml$/i.test(name)).sort()
let workflowText = ''
let uploadCount = 0
let deployCount = 0
for (const name of workflowNames) {
  const text = await readFile(resolve(workflowRoot, name), 'utf8')
  workflowText += `\n# ${name}\n${text}`
  uploadCount += text.split('actions/upload-pages-artifact@').length - 1
  deployCount += text.split('actions/deploy-pages@').length - 1
}
assert.equal(uploadCount, 1, 'upload-pages-artifact must have exactly one production workflow authority')
assert.equal(deployCount, 1, 'deploy-pages must have exactly one production workflow authority')
for (const forbidden of ['cloudflare/wrangler-action', 'wrangler pages deploy', ['CLOUDFLARE','API','TOKEN'].join('_'), ['CLOUDFLARE','ACCOUNT','ID'].join('_'), ['CLOUDFLARE','PAGES','PROJECT'].join('_')]) {
  assert.equal(workflowText.includes(forbidden), false, `retired Cloudflare Pages deployment signature remains: ${forbidden}`)
}
const receiptPath = r07 ? 'scripts/mmj-ui29-public-convergence-receipt.mjs' : 'scripts/mmj-ui29-build-receipt.mjs'
const buildReceipt = await readFile(resolve(root, receiptPath), 'utf8')
assert.ok(buildReceipt.includes("provider: 'github-pages'"), 'build receipt provider must be github-pages')
assert.equal(buildReceipt.includes("provider: 'cloudflare-pages'"), false, 'Cloudflare Pages provider residue remains in build receipt')
console.log(JSON.stringify({ event: 'PASS_MMJ_UI29_GITHUB_PAGES_SINGLE_DEPLOY_AUTHORITY_R1', workflowCount: workflowNames.length, uploadPagesArtifactCount: uploadCount, deployPagesCount: deployCount, cloudflarePagesDeployment: 'retired', githubPagesDeploymentAuthority: 'single', siteConvergenceAuthority: r07 }))
