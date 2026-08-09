import { readFile, readdir, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const fail = message => { throw new Error(`E_MMJ_UI29_A_STATIC_GATE: ${message}`) }
const read = path => readFile(resolve(root, path), 'utf8')
const exists = async path => { try { await stat(resolve(root, path)); return true } catch { return false } }

const pkg = JSON.parse(await read('package.json'))
if (pkg.version !== '0.29.0-mmj-ui29-a') fail(`package version drift: ${pkg.version}`)
const requiredScripts = {
  'sync:portfolio': 'node scripts/mmj-ui29-portfolio-adopt.mjs',
  'sync:commission-guide': 'node scripts/mmj-ui29-commission-guide-adopt.mjs',
  'sync:public-content': 'node scripts/mmj-ui29-public-content-adopt.mjs',
  'verify:portfolio-handoff': 'node scripts/mmj-ui29-portfolio-verify.mjs',
  'verify:commission-guide-handoff': 'node scripts/mmj-ui29-commission-guide-verify.mjs',
  'verify:static-output': 'node scripts/mmj-ui29-static-output-verify.mjs',
  'verify:work-detail-cover-boundary': 'node scripts/mmj-ui29-work-detail-cover-boundary-gate.mjs',
  'verify:work-detail-auxiliary-retirement': 'node scripts/mmj-ui29-work-detail-auxiliary-retirement-gate.mjs',
  'verify:three-route-seo-lean-work-detail': 'node scripts/mmj-ui29-three-route-seo-lean-work-detail-gate.mjs',
  'test:mmj-ui29-dispatch-authority': 'node scripts/mmj-ui29-dispatch-authority-test.mjs',
  'test:public-release-receipt-boundary': 'node scripts/mmj-ui29-public-release-receipt-boundary-test.mjs',
  'test:github-pages-single-deploy-authority': 'node scripts/mmj-ui29-github-pages-single-deploy-authority-test.mjs',
  'test:portfolio-fast-publish-commit': 'node scripts/mmj-ui29-portfolio-fast-publish-commit-test.mjs',
}
for (const [name, command] of Object.entries(requiredScripts)) {
  if (pkg.scripts?.[name] !== command) fail(`package script drift: ${name}`)
}
if (pkg.mmjDispatchAuthorityRelease !== 'MMJ-PUBLIC-BUILD-HANDOFF-R1') fail('portfolio dispatch release identity missing')
if (pkg.mmjCommissionGuideHandoffRelease !== 'MMJ-PUBLIC-COMMISSION-GUIDE-HANDOFF-R1') fail('commission handoff release identity missing')
if (pkg.mmjWorkDetailAuxiliaryRetirementRelease !== 'MMJ-PUBLIC-WORK-DETAIL-AUXILIARY-SURFACE-RETIREMENT-R1') fail('work-detail auxiliary retirement release identity missing')
if (pkg.mmjThreeRouteSeoLeanWorkDetailRelease !== 'MMJ-PUBLIC-THREE-ROUTE-SEO-LEAN-WORK-DETAIL-R1') fail('three-route SEO lean work-detail release identity missing')
if (!String(pkg.scripts?.['gate:mmj-ui29-a'] ?? '').includes('verify:work-detail-auxiliary-retirement')) fail('work-detail auxiliary retirement gate missing from aggregate gate')
if (!String(pkg.scripts?.['gate:mmj-ui29-a'] ?? '').includes('verify:three-route-seo-lean-work-detail')) fail('three-route SEO lean work-detail gate missing from aggregate gate')
if (!String(pkg.scripts?.['gate:mmj-ui29-a'] ?? '').includes('test:public-release-receipt-boundary')) fail('public release receipt boundary regression missing from aggregate gate')
if (!String(pkg.scripts?.['gate:mmj-ui29-a'] ?? '').includes('test:github-pages-single-deploy-authority')) fail('GitHub Pages single deploy authority regression missing from aggregate gate')
if (!String(pkg.scripts?.['gate:mmj-ui29-a'] ?? '').includes('test:portfolio-fast-publish-commit')) fail('portfolio fast publish regression missing from aggregate gate')
if (!await exists('scripts/mmj-ui29-work-detail-auxiliary-retirement-gate.mjs')) fail('work-detail auxiliary retirement gate file missing')
if (!await exists('scripts/mmj-ui29-three-route-seo-lean-work-detail-gate.mjs')) fail('three-route SEO lean work-detail gate file missing')
if (!await exists('scripts/lib/mmj-ui29-public-release-receipt-policy.mjs')) fail('public release receipt policy module missing')
if (!await exists('scripts/mmj-ui29-public-release-receipt-boundary-test.mjs')) fail('public release receipt boundary regression file missing')
if (!await exists('scripts/mmj-ui29-github-pages-single-deploy-authority-test.mjs')) fail('GitHub Pages single deploy authority regression file missing')
if (!await exists('scripts/mmj-ui29-portfolio-fast-publish-commit-test.mjs')) fail('portfolio fast publish regression file missing')
for (const name of ['build', 'generate', 'dev', 'gate:mmj-ui29-a']) {
  if (!String(pkg.scripts?.[name] ?? '').includes('sync:public-content')) fail(`unified network adoption missing from ${name}`)
}
for (const name of ['build:local', 'generate:local', 'typecheck']) {
  const command = String(pkg.scripts?.[name] ?? '')
  if (command.includes('sync:portfolio') || command.includes('sync:commission-guide') || command.includes('sync:public-content')) fail(`unexpected second network adoption in ${name}`)
  if (!command.includes('verify:commission-guide-handoff')) fail(`commission verification missing from ${name}`)
}

const generatedFixtureNames = [
  'generated/portfolio.snapshot.json',
  'generated/portfolio.routes.json',
  'generated/portfolio.handoff.json',
  'generated/portfolio.build-input-lock.json',
  'generated/commission-guide.snapshot.json',
  'generated/commission-guide.handoff.json',
  'generated/commission-guide.build-input-lock.json',
  'generated/public-release.manifest.json',
  'public/.well-known/mmj-public-release.json',
]
let generatedGitCheckout = false
try {
  const { execFileSync } = await import('node:child_process')
  generatedGitCheckout = execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() === 'true'
} catch {
  generatedGitCheckout = false
}
if (generatedGitCheckout) {
  const { execFileSync } = await import('node:child_process')
  const tracked = execFileSync('git', ['ls-files', '--', ...generatedFixtureNames], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  if (tracked) fail(`generated public-content artifact must not be committed: ${tracked.split(/\r?\n/).join(', ')}`)
} else {
  for (const path of generatedFixtureNames) if (await exists(path)) fail(`baked source contains generated public-content artifact: ${path}`)
}

for (const workflowPath of ['.github/workflows/ci.yml', '.github/workflows/pages.yml']) {
  const workflow = await read(workflowPath)
  const install = workflow.indexOf('npm ci --ignore-scripts')
  const sync = workflow.indexOf('npm run sync:public-content')
  const rebuild = workflow.indexOf('npm rebuild')
  const generate = workflow.indexOf('npm run generate:local')
  if (!(install >= 0 && install < sync && sync < rebuild && rebuild < generate)) fail(`workflow lifecycle order drift: ${workflowPath}`)
  for (const origin of [
    'MMJ_PORTFOLIO_HANDOFF_ORIGIN: https://cms.mamajing.work',
    'MMJ_COMMISSION_GUIDE_HANDOFF_ORIGIN: https://cms.mamajing.work',
  ]) if (!workflow.includes(origin)) fail(`production handoff origin missing: ${workflowPath}: ${origin}`)
  if (!workflow.includes('npm run verify:commission-guide-handoff')) fail(`commission verification missing: ${workflowPath}`)
}
const receiptPolicy = await read('scripts/lib/mmj-ui29-public-release-receipt-policy.mjs')
if (!receiptPolicy.includes("PUBLIC_RELEASE_RECEIPT_PATH = 'public/.well-known/mmj-public-release.json'")) fail('public release receipt canonical path drift')
const receiptProducer = await read('scripts/mmj-ui29-publish-release-receipt.mjs')
for (const token of [
  "PUBLIC_RELEASE_RECEIPT_PATH",
  "resolve(root, PUBLIC_RELEASE_RECEIPT_PATH)",
]) if (!receiptProducer.includes(token)) fail(`public release receipt producer path authority missing: ${token}`)
const boundaryGate = await read('scripts/public-boundary-gate.mjs')
for (const token of [
  "validatePublicReleaseTree",
  "'public'",
  "inspectPublicTree",
]) if (!boundaryGate.includes(token)) fail(`public release receipt boundary authority missing: ${token}`)
for (const retiredWorkflow of [
  '.github/workflows/mmj-cms-portfolio-deploy.yml',
  '.github/workflows/mmj-cms-commission-guide-deploy.yml',
]) if (await exists(retiredWorkflow)) fail(`retired parallel deployment workflow remains: ${retiredWorkflow}`)

const pagesWorkflow = await read('.github/workflows/pages.yml')
for (const token of [
  'repository_dispatch:',
  'mmj_portfolio_promoted',
  'mmj-public-commission-guide-published',
  'group: github-pages',
  'mmj-ui29-dispatch-input-verify.mjs preflight',
  'mmj-ui29-dispatch-input-verify.mjs post-adopt',
  'mmj-ui29-commission-dispatch-input-verify.mjs preflight',
  'mmj-ui29-commission-dispatch-input-verify.mjs post-adopt',
  'actions/upload-pages-artifact@',
  'actions/deploy-pages@',
  'path: .output/public',
  'portfolio-observe:',
  'portfolio-failure-receipt:',
  'Report portfolio deployment committed',
]) if (!pagesWorkflow.includes(token)) fail(`GitHub Pages single deployment authority drift: ${token}`)
const portfolioReceiptRebuild = pagesWorkflow.indexOf('npm rebuild')
const portfolioReceiptEmit = pagesWorkflow.indexOf('node scripts/mmj-ui29-publish-release-receipt.mjs')
const portfolioReceiptGenerate = pagesWorkflow.indexOf('npm run generate:local')
if (!(portfolioReceiptRebuild >= 0 && portfolioReceiptRebuild < portfolioReceiptEmit && portfolioReceiptEmit < portfolioReceiptGenerate)) fail('portfolio receipt-before-generate lifecycle drift')
const pagesDeployCommit = pagesWorkflow.indexOf('actions/deploy-pages@')
const portfolioSuccessReceipt = pagesWorkflow.indexOf('node scripts/mmj-ui29-build-receipt.mjs succeeded')
if (!(pagesDeployCommit >= 0 && pagesDeployCommit < portfolioSuccessReceipt)) fail('portfolio success receipt must follow GitHub Pages deployment commit')
if (pagesWorkflow.includes('portfolio-finalize:')) fail('retired portfolio-finalize success barrier remains')

const workflowNames = (await readdir(resolve(root, '.github/workflows'))).filter(name => /\.ya?ml$/i.test(name)).sort()
let uploadPagesArtifactCount = 0
let deployPagesCount = 0
for (const workflowName of workflowNames) {
  const workflow = await read(`.github/workflows/${workflowName}`)
  uploadPagesArtifactCount += workflow.split('actions/upload-pages-artifact@').length - 1
  deployPagesCount += workflow.split('actions/deploy-pages@').length - 1
  for (const forbidden of [
    'cloudflare/wrangler-action',
    'wrangler pages deploy',
    ['CLOUDFLARE', 'API', 'TOKEN'].join('_'),
    ['CLOUDFLARE', 'ACCOUNT', 'ID'].join('_'),
    ['CLOUDFLARE', 'PAGES', 'PROJECT'].join('_'),
  ]) if (workflow.includes(forbidden)) fail(`retired Cloudflare Pages deployment signature remains in ${workflowName}: ${forbidden}`)
}
if (uploadPagesArtifactCount !== 1) fail(`upload-pages-artifact authority count drift: ${uploadPagesArtifactCount}`)
if (deployPagesCount !== 1) fail(`deploy-pages authority count drift: ${deployPagesCount}`)

const buildReceipt = await read('scripts/mmj-ui29-build-receipt.mjs')
if (!buildReceipt.includes("provider: 'github-pages'")) fail('GitHub Pages build receipt provider authority missing')
if (buildReceipt.includes("provider: 'cloudflare-pages'")) fail('retired Cloudflare Pages provider remains in build receipt')
if (buildReceipt.includes('MMJ_PROBE_STATUS || 200')) fail('fake probe status fallback remains in build receipt')
if (buildReceipt.includes('MMJ_PROBED_AT || now')) fail('fake probe timestamp fallback remains in build receipt')

const slugPage = await read('app/pages/works/[slug].vue')
for (const binding of ['useSeoMeta', 'project.seo.title', 'project.seo.description', 'project.seo.indexable', 'ogImage']) if (!slugPage.includes(binding)) fail(`work detail SEO binding missing: ${binding}`)
for (const forbidden of ['data-mm-work-cover', 'context-label="대표 이미지"', ':asset="project.assets.cover"', 'aria-label="대표 이미지"', 'mm-work-detail__cover']) if (slugPage.includes(forbidden)) fail(`work detail cover body projection remains: ${forbidden}`)
for (const required of ['v-if="project.assets.primary !== null"', 'data-mm-work-primary', ':asset="project.assets.primary"', 'video-runtime="primary-detail"', 'audio-runtime="primary-detail"', 'caption-mode="none"']) if (!slugPage.includes(required)) fail(`work detail primary authority missing: ${required}`)
for (const required of ['definePageMeta', 'hideSiteFooter: true']) if (!slugPage.includes(required)) fail(`work detail global footer suppression missing: ${required}`)
for (const required of ['mm-work-detail__footer', 'mm-work-detail__all-works', 'data-mm-work-return-link', 'returnTarget.href', 'returnTarget.label']) if (!slugPage.includes(required)) fail(`work detail return link authority missing: ${required}`)

const workDetailHeader = await read('app/components/work/WorkDetailHeader.vue')
for (const forbidden of [
  'data-mm-work-meta-line',
  'data-mm-work-roles',
  'data-mm-work-release-date',
  'project.displayMeta.metaLine',
  'project.displayMeta.timing.releaseDate',
  'v-for="role in project.roles"',
  'aria-label="담당 역할"',
]) if (workDetailHeader.includes(forbidden)) fail(`work detail auxiliary header projection remains: ${forbidden}`)
for (const required of ['data-mm-work-detail-header', 'project.category.label', 'project.title']) if (!workDetailHeader.includes(required)) fail(`work detail primary header projection missing: ${required}`)
for (const forbidden of ['project.summary', 'project.tags', 'data-mm-work-tags', 'mm-work-detail-header__summary', 'mm-work-detail-header__tags']) if (workDetailHeader.includes(forbidden)) fail(`work detail lean header residue remains: ${forbidden}`)

const workDetailCss = await read('app/assets/css/work-detail.css')
if (workDetailCss.includes('.mm-work-detail__cover')) fail('work detail cover CSS residue remains.')
for (const forbidden of ['.mm-work-detail-header__meta', '.mm-work-detail-header__roles', '.mm-work-detail-header__release', '.mm-work-detail-header__summary', '.mm-work-detail-header__tags', 'minmax(16rem, 0.4fr)']) if (workDetailCss.includes(forbidden)) fail(`work detail auxiliary CSS residue remains: ${forbidden}`)
if (!workDetailCss.includes('.mm-work-asset-frame__caption')) fail('generic work-asset caption CSS authority missing')
const desktopHeaderBlock = workDetailCss.match(/@media\s*\(min-width:\s*80rem\)\s*\{[\s\S]*?\.mm-work-detail-header\s*\{([\s\S]*?)\}[\s\S]*?\}/)?.[1] ?? null
if (desktopHeaderBlock === null || !desktopHeaderBlock.includes('grid-template-columns: minmax(0, 1fr)') || !desktopHeaderBlock.includes('max-width: var(--mm-copy-max)')) fail('work detail desktop header single-column reflow missing')

const workAssetFrame = await read('app/components/work/WorkAssetFrame.vue')
for (const required of ["captionMode?: 'full' | 'none'", "captionMode: 'full'", "v-if=\"captionMode === 'full'\"", 'asset.label', 'asset.caption', 'asset.credit']) if (!workAssetFrame.includes(required)) fail(`work asset caption contract missing: ${required}`)

const commissionData = await read('app/data/commission-guide.ts')
if (!commissionData.includes("../../generated/commission-guide.snapshot.json")) fail('generated commission snapshot projection missing')
for (const forbidden of ['COMMISSION_GUIDE_MOCK', 'commission-guide.mock']) if (commissionData.includes(forbidden)) fail(`commission mock authority remains: ${forbidden}`)
const commissionAdopt = await read('scripts/mmj-ui29-commission-guide-adopt.mjs')
for (const endpoint of [
  '/api/v1/public/commission-guide/head',
  '/api/v1/public/commission-guide/receipts/',
  '/api/v1/public/commission-guide?',
]) if (!commissionAdopt.includes(endpoint)) fail(`commission public endpoint missing: ${endpoint}`)
for (const required of ["cache: 'no-store'", "'cache-control': 'no-cache'", 'publicationVersionId: headA.publicationVersionId', 'snapshotDigest: headA.snapshotDigest']) if (!commissionAdopt.includes(required)) fail(`commission cache-stable handoff signature missing: ${required}`)
for (const forbidden of ['/api/v1/mutations', '/admin/bootstrap', 'authorization', 'session cookie', 'COMMISSION_GUIDE_MOCK']) if (commissionAdopt.toLowerCase().includes(forbidden.toLowerCase())) fail(`forbidden commission adoption signature: ${forbidden}`)

const dispatchVerify = await read('scripts/mmj-ui29-dispatch-input-verify.mjs')
if (!dispatchVerify.includes('/api/v1/public/portfolio-snapshot/dispatch-authority')) fail('current portfolio dispatch authority endpoint missing')
for (const field of ['deliveryKey', 'sourceWorkbookRevision', 'collectionHeadRevision']) if (!dispatchVerify.includes(field)) fail(`portfolio dispatch authority parity field missing: ${field}`)
const commissionDispatchVerify = await read('scripts/mmj-ui29-commission-dispatch-input-verify.mjs')
for (const token of ['/api/v1/public/commission-guide/dispatch-authority', 'publicationHeadRevision', 'post-adopt']) if (!commissionDispatchVerify.includes(token)) fail(`commission dispatch verifier drift: ${token}`)

const publicTypes = await read('shared/types/portfolio-snapshot.ts')
if (!publicTypes.includes("Omit<PortfolioProject, 'publishState' | 'timing' | 'post'>")) fail('public project post omission boundary missing.')
if (!publicTypes.includes('readonly post: WorkMediaPost')) fail('public project post must be required.')

const portfolioAdopt = await read('scripts/mmj-ui29-portfolio-adopt.mjs')
for (const endpoint of ['/api/v1/public/portfolio-snapshot/head', '/api/v1/public/portfolio-snapshot/receipts/', '/api/v1/public/portfolio-snapshot']) if (!portfolioAdopt.includes(endpoint)) fail(`portfolio public endpoint missing: ${endpoint}`)

const rootEntries = await readdir(root)
let gitInsideWorkTree = false
let trackedResidue = ''
try {
  const { execFileSync } = await import('node:child_process')
  gitInsideWorkTree = execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() === 'true'
  if (gitInsideWorkTree) trackedResidue = execFileSync('git', ['ls-files', '--', 'node_modules', '.output'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
} catch {
  gitInsideWorkTree = false
}
if (gitInsideWorkTree) {
  if (trackedResidue) fail(`tracked local build residue: ${trackedResidue.split(/\r?\n/).join(', ')}`)
} else if (rootEntries.includes('node_modules') || rootEntries.includes('.output')) {
  fail('baked source contains local build residue.')
}

const fixtureTokens = ['published-work', 'scheduled-due', 'ast_cov00001', 'ast_pos00001', 'ast_vid00001', 'ast_art00001', 'ast_aud00001']
const scanPaths = ['app', 'shared', 'scripts', 'nuxt.config.ts', 'package.json']
async function walk(path) {
  const absolute = resolve(root, path)
  const info = await stat(absolute)
  if (info.isFile()) return [path]
  const output = []
  for (const entry of await readdir(absolute, { withFileTypes: true })) {
    const child = `${path}/${entry.name}`
    if (entry.isDirectory()) output.push(...await walk(child))
    else output.push(child)
  }
  return output
}
for (const start of scanPaths) {
  for (const path of await walk(start)) {
    if (!/\.(?:ts|vue|mjs|json)$/.test(path) || path === 'scripts/mmj-ui29-a-static-gate.mjs') continue
    const text = await read(path)
    for (const token of fixtureTokens) if (text.includes(token)) fail(`retired portfolio fixture token remains in ${path}: ${token}`)
  }
}

console.log(JSON.stringify({
  event: 'PASS_MMJ_UI29_A_STATIC_GATE',
  packageVersion: pkg.version,
  generatedFixtureCount: 0,
  workflowCount: workflowNames.length,
  portfolioPublicEndpointCount: 4,
  commissionPublicEndpointCount: 4,
  commissionMockAuthority: 'retired',
  workDetailAuxiliaryProjection: 'absent',
  workDetailGlobalFooter: 'absent',
  threeRouteSeoMeta: 'closed',
  workDetailHeaderSummary: 'absent',
  workDetailHeaderTags: 'absent',
  primaryMediaCaption: 'absent',
  galleryCaptionAuthority: 'preserved',
}))
