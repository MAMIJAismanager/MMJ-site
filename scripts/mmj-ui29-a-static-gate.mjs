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
  'verify:work-detail-cover-boundary': 'node scripts/mmj-ui29-work-detail-cover-boundary-gate.mjs',
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
let generatedGitCheckout = false

try {
  const { execFileSync } = await import('node:child_process')

  generatedGitCheckout = execFileSync(
    'git',
    ['rev-parse', '--is-inside-work-tree'],
    {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  ).trim() === 'true'
} catch {
  generatedGitCheckout = false
}

if (generatedGitCheckout) {
  const { execFileSync } = await import('node:child_process')

  const trackedGeneratedArtifacts = execFileSync(
    'git',
    ['ls-files', '--', ...generatedFixtureNames],
    {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  ).trim()

  if (trackedGeneratedArtifacts) {
    fail(
      `generated portfolio artifact must not be committed: ${
        trackedGeneratedArtifacts.split(/\r?\n/).join(', ')
      }`,
    )
  }
} else {
  for (const path of generatedFixtureNames) {
    if (await exists(path)) {
      fail(`baked source contains generated portfolio artifact: ${path}`)
    }
  }
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

for (const forbidden of [
  'data-mm-work-cover',
  'context-label="대표 이미지"',
  ':asset="project.assets.cover"',
  'aria-label="대표 이미지"',
  'mm-work-detail__cover',
]) {
  if (slugPage.includes(forbidden)) {
    fail(`work detail cover body projection remains: ${forbidden}`)
  }
}

for (const required of [
  'v-if="project.assets.primary !== null"',
  'data-mm-work-primary',
  ':asset="project.assets.primary"',
  'video-runtime="primary-detail"',
  'audio-runtime="primary-detail"',
]) {
  if (!slugPage.includes(required)) {
    fail(`work detail primary authority missing: ${required}`)
  }
}

const workDetailCss =
  await read('app/assets/css/work-detail.css')

if (workDetailCss.includes('.mm-work-detail__cover')) {
  fail('work detail cover CSS residue remains.')
}

const publicTypes = await read('shared/types/portfolio-snapshot.ts')
if (!publicTypes.includes("Omit<PortfolioProject, 'publishState' | 'timing' | 'post'>")) fail('public project post omission boundary missing.')
if (!publicTypes.includes('readonly post: WorkMediaPost')) fail('public project post must be required.')

const dispatchVerify = await read('scripts/mmj-ui29-dispatch-input-verify.mjs')
if (!dispatchVerify.includes('/api/v1/public/portfolio-snapshot/dispatch-authority')) fail('current dispatch authority endpoint missing.')
for (const field of ['deliveryKey', 'sourceWorkbookRevision', 'collectionHeadRevision']) {
  if (!dispatchVerify.includes(field)) fail(`dispatch authority parity field missing: ${field}`)
}

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
for (const required of [
  "cache: 'no-store'",
  "'cache-control': 'no-cache'",
  'collectionVersionId: headA.collectionVersionId',
  'snapshotDigest: headA.snapshotDigest',
]) {
  if (!adopt.includes(required)) fail(`cache-stable handoff signature missing: ${required}`)
}

const rootEntries = await readdir(root)

let gitInsideWorkTree = false
let trackedResidue = ''

try {
  const { execFileSync } = await import('node:child_process')

  gitInsideWorkTree = execFileSync(
    'git',
    ['rev-parse', '--is-inside-work-tree'],
    {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  ).trim() === 'true'

  if (gitInsideWorkTree) {
    trackedResidue = execFileSync(
      'git',
      ['ls-files', '--', 'node_modules', '.output'],
      {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    ).trim()
  }
} catch {
  gitInsideWorkTree = false
}

if (gitInsideWorkTree) {
  if (trackedResidue) {
    fail(`tracked local build residue: ${trackedResidue.split(/\r?\n/).join(', ')}`)
  }
} else if (
  rootEntries.includes('node_modules')
  || rootEntries.includes('.output')
) {
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
  workflowCount: 2,
  publicEndpointCount: 4,
}))
