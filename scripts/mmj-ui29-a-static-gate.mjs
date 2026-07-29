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
  'verify:portfolio-handoff': 'node scripts/mmj-ui29-portfolio-verify.mjs',
  'verify:static-output': 'node scripts/mmj-ui29-static-output-verify.mjs',
}
for (const [name, command] of Object.entries(requiredScripts)) {
  if (pkg.scripts?.[name] !== command) fail(`package script drift: ${name}`)
}
for (const name of ['build', 'generate', 'dev', 'gate:mmj-ui29-a']) {
  if (!String(pkg.scripts?.[name] ?? '').includes('sync:portfolio')) fail(`network adoption missing from ${name}`)
}
for (const name of ['build:local', 'generate:local', 'typecheck']) {
  if (String(pkg.scripts?.[name] ?? '').includes('sync:portfolio')) fail(`unexpected second network adoption in ${name}`)
}

const generatedFixtureNames = [
  'generated/portfolio.snapshot.json',
  'generated/portfolio.routes.json',
  'generated/portfolio.handoff.json',
  'generated/portfolio.build-input-lock.json',
  'generated/public-release.manifest.json',
]
for (const path of generatedFixtureNames) {
  if (await exists(path)) fail(`generated portfolio artifact must not be committed: ${path}`)
}

for (const workflowPath of ['.github/workflows/ci.yml', '.github/workflows/pages.yml']) {
  const workflow = await read(workflowPath)
  const install = workflow.indexOf('npm ci --ignore-scripts')
  const sync = workflow.indexOf('npm run sync:portfolio')
  const rebuild = workflow.indexOf('npm rebuild')
  const generate = workflow.indexOf('npm run generate:local')
  if (!(install >= 0 && install < sync && sync < rebuild && rebuild < generate)) fail(`workflow lifecycle order drift: ${workflowPath}`)
  if (!workflow.includes('MMJ_PORTFOLIO_HANDOFF_ORIGIN: https://cms.mamajing.work')) fail(`production handoff origin missing: ${workflowPath}`)
}

const slugPage = await read('app/pages/works/[slug].vue')
for (const binding of ['useSeoMeta', 'project.seo.title', 'project.seo.description', 'project.seo.indexable', 'ogImage']) {
  if (!slugPage.includes(binding)) fail(`work detail SEO binding missing: ${binding}`)
}
const publicTypes = await read('shared/types/portfolio-snapshot.ts')
if (!publicTypes.includes("Omit<PortfolioProject, 'publishState' | 'timing' | 'post'>")) fail('public project post omission boundary missing.')
if (!publicTypes.includes('readonly post: WorkMediaPost')) fail('public project post must be required.')

const adopt = await read('scripts/mmj-ui29-portfolio-adopt.mjs')
for (const endpoint of [
  '/api/v1/public/portfolio-snapshot/head',
  '/api/v1/public/portfolio-snapshot/receipts/',
  '/api/v1/public/portfolio-snapshot',
]) {
  if (!adopt.includes(endpoint)) fail(`public endpoint missing: ${endpoint}`)
}
for (const forbidden of ['/api/v1/mutations', '/admin/bootstrap', 'authorization', 'session cookie']) {
  if (adopt.toLowerCase().includes(forbidden)) fail(`forbidden adoption signature: ${forbidden}`)
}

const rootEntries = await readdir(root)
if (rootEntries.includes('node_modules') || rootEntries.includes('.output')) fail('baked source contains local build residue.')

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
  workflowCount: 2,
  publicEndpointCount: 3,
}))
