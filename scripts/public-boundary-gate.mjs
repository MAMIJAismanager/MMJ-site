import { lstat, readFile, readdir, stat } from 'node:fs/promises'
import { extname, relative, resolve, sep } from 'node:path'

import {
  validatePublicReleaseTree,
} from './lib/mmj-ui29-public-release-receipt-policy.mjs'

const root = process.cwd()
const fail = message => { throw new Error(`FAIL_MMJ_05N_A_PUBLIC_BOUNDARY: ${message}`) }
const normalize = path => path.split(sep).join('/')

const allowedRootEntries = new Set([
  '.github', '.gitignore', '.npmrc', 'README.md', 'app', 'generated', 'public',
  'nuxt.config.ts', 'package-lock.json', 'package.json', 'scripts', 'shared', 'tsconfig.json',
])

const allowedShared = new Set([
  'shared/constants/asset-domain.ts',
  'shared/constants/category-icon-optical-layout.ts',
  'shared/constants/media-delivery.ts',
  'shared/constants/portfolio-gateway-categories.ts',
  'shared/constants/project-domain.ts',
  'shared/constants/taxonomy.ts',
  'shared/navigation/navigation-route-key.ts',
  'shared/query/portfolio-snapshot-query.ts',
  'shared/query/works-pagination.ts',
  'shared/query/works-project-query.ts',
  'shared/query/works-query-state.ts',
  'shared/release/public-release-contract.ts',
  'shared/resolver/media-delivery-config.ts',
  'shared/resolver/media-resolution.ts',
  'shared/resolver/accessible-description-resolution.ts',
  'shared/resolver/media-renderability.ts',
  'shared/resolver/player-artwork-options.ts',
  'shared/resolver/player-source-admission.ts',
  'shared/resolver/player-track.ts',
  'shared/resolver/work-detail-presentation-plan.ts',
  'shared/resolver/portfolio-project-view-resolver.ts',
  'shared/resolver/responsive-image-plan.ts',
  'shared/resolver/video-player-plan.ts',
  'shared/schema/commission-guide.ts',
  'shared/schema/domain-identifiers.ts',
  'shared/types/commission-guide.ts',
  'shared/types/domain-identifiers.ts',
  'shared/types/navigation-memory.ts',
  'shared/types/player-store.ts',
  'shared/types/portfolio-asset.ts',
  'shared/types/portfolio-gateway-category.ts',
  'shared/types/portfolio-snapshot.ts',
  'shared/types/project.ts',
  'shared/types/resolved-media.ts',
  'shared/types/responsive-image.ts',
  'shared/types/video-player.ts',
  'shared/types/work-classification.ts',
  'shared/types/work-media-post.ts',
  'shared/view/portfolio-project-view.ts',
])

const forbiddenPrefixes = [
  'apps-script/', 'workers/', 'content/', 'artifacts/', 'fixtures/', 'docs/', '.build/',
  'shared/build/', 'shared/provider/', 'shared/migration/', 'shared/contracts/',
]
const forbiddenFiles = new Set(['.clasp.json', '.clasprc.json', '.dev.vars'])
const textExtensions = new Set(['.ts', '.mts', '.vue', '.js', '.mjs', '.json', '.md', '.yml', '.yaml', '.toml', '.html', '.css'])
const requiredUi29BuildFiles = new Set([
  'scripts/mmj-ui29-portfolio-adopt.mjs',
  'scripts/mmj-ui29-portfolio-verify.mjs',
  'scripts/mmj-ui29-commission-guide-adopt.mjs',
  'scripts/mmj-ui29-commission-guide-verify.mjs',
  'scripts/mmj-ui29-public-content-adopt.mjs',
  'scripts/mmj-ui29-commission-dispatch-input-verify.mjs',
  'scripts/mmj-ui29-static-output-verify.mjs',
  'scripts/mmj-ui29-a-static-gate.mjs',
  'scripts/mmj-ui29-public-contract-test.mjs',
  'scripts/lib/mmj-ui29-public-contract.mjs',
  'scripts/lib/mmj-ui29-shared-typescript-loader.mjs',
  'scripts/lib/mmj-ui29-commission-contract.mjs',
])
const forbiddenText = [
  /MMJ_[A-Z0-9_]*(?:SECRET|SALT|ACCOUNT_ID|BUCKET_NAME|SPREADSHEET_ID|SCRIPT_ID|WORKER_ORIGIN)/,
  /CLOUDFLARE_API_TOKEN|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|GOOGLE_APPLICATION_CREDENTIALS/,
  /apps-script\/media-cms|workers\/media-cms|content\/providers/i,
]

const allowedWorkflowSecretNames = new Set([
  'MMJ_PORTFOLIO_BUILD_RECEIPT_SECRET',
])

const allowedBuildScriptSecretReferences = new Map([
  [
    'scripts/mmj-ui29-build-receipt.mjs',
    new Set([
      'MMJ_PORTFOLIO_BUILD_RECEIPT_SECRET',
    ]),
  ],
  [
    'scripts/mmj-ui29-public-convergence-receipt.mjs',
    new Set([
      'MMJ_PORTFOLIO_BUILD_RECEIPT_SECRET',
    ]),
  ],
  [
    'scripts/mmj-ui29-public-source-observation.mjs',
    new Set([
      'MMJ_PORTFOLIO_BUILD_RECEIPT_SECRET',
    ]),
  ],
  [
    'scripts/mmj-ui29-public-convergence-supersession-receipt.mjs',
    new Set([
      'MMJ_PORTFOLIO_BUILD_RECEIPT_SECRET',
    ]),
  ],
  [
    'scripts/mmj-ui29-supersession-receipt.mjs',
    new Set([
      'MMJ_PORTFOLIO_BUILD_RECEIPT_SECRET',
    ]),
  ],
])

const workflowPathPattern =
  /^\.github\/workflows\/[^/]+\.ya?ml$/

function redactAllowedWorkflowSecretReferences(rel, text) {
  if (!workflowPathPattern.test(rel)) return text

  return text
    .split(/\r?\n/)
    .map((line, index) => {
      const directBinding = line.match(
        /^(\s*)([A-Z][A-Z0-9_]*):\s*\$\{\{\s*secrets\.([A-Z][A-Z0-9_]*)\s*\}\}\s*$/,
      )

      if (directBinding) {
        const [, indentation, environmentName, secretName] =
          directBinding

        if (environmentName !== secretName) {
          fail(
            `workflow secret binding name mismatch in ${rel}:${index + 1}: ` +
            `${environmentName} != ${secretName}`,
          )
        }

        if (!allowedWorkflowSecretNames.has(secretName)) {
          fail(
            `workflow secret reference is not allowlisted in ` +
            `${rel}:${index + 1}: ${secretName}`,
          )
        }

        return (
          indentation +
          'REDACTED_WORKFLOW_SECRET: ' +
          '${{ secrets.REDACTED }}'
        )
      }

      return line.replace(
        /\$\{\{\s*secrets\.([A-Z][A-Z0-9_]*)\s*\}\}/g,
        (_reference, secretName) => {
          if (!allowedWorkflowSecretNames.has(secretName)) {
            fail(
              `workflow secret reference is not allowlisted in ` +
              `${rel}:${index + 1}: ${secretName}`,
            )
          }

          return '${{ secrets.REDACTED }}'
        },
      )
    })
    .join('\n')
}
function redactAllowedBuildScriptSecretReferences(rel, text) {
  const allowedNames =
    allowedBuildScriptSecretReferences.get(rel)

  if (!allowedNames) return text

  let redacted = text

  for (const secretName of allowedNames) {
    const escapedName =
      secretName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    const approvedAccessPatterns = [
      new RegExp(
        `required\\((['"])${escapedName}\\1\\)`,
        'g',
      ),
      new RegExp(
        `process\\.env\\.${escapedName}\\b`,
        'g',
      ),
      new RegExp(
        `process\\.env\\[(['"])${escapedName}\\1\\]`,
        'g',
      ),
    ]

    let matchCount = 0

    for (const pattern of approvedAccessPatterns) {
      redacted = redacted.replace(
        pattern,
        matched => {
          matchCount += 1
          return matched.replace(
            secretName,
            'REDACTED_BUILD_SECRET',
          )
        },
      )
    }

    if (matchCount === 0) {
      fail(
        `allowlisted build secret reference is missing from ` +
        `${rel}: ${secretName}`,
      )
    }
  }

  return redacted
}

async function walk(dir) {
  const files = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.nuxt' || entry.name === '.output' || entry.name === '.git') continue
    const absolute = resolve(dir, entry.name)
    if (entry.isDirectory()) files.push(...await walk(absolute))
    else files.push(absolute)
  }
  return files
}

async function inspectPublicTree() {
  const publicRoot = resolve(root, 'public')
  try {
    await lstat(publicRoot)
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw error
  }

  const entries = []
  async function visit(absolute, rel) {
    const info = await lstat(absolute)
    const kind = info.isSymbolicLink()
      ? 'symlink'
      : info.isDirectory()
        ? 'directory'
        : info.isFile()
          ? 'file'
          : 'other'
    entries.push({ path: normalize(rel), kind })
    if (kind !== 'directory') return
    const children = await readdir(absolute, { withFileTypes: true })
    children.sort((a, b) => a.name.localeCompare(b.name, 'en'))
    for (const child of children) {
      await visit(resolve(absolute, child.name), `${rel}/${child.name}`)
    }
  }

  await visit(publicRoot, 'public')
  return entries
}

try {
  validatePublicReleaseTree(await inspectPublicTree())
} catch (error) {
  fail(error?.message ?? 'public release receipt tree validation failed.')
}

for (const entry of await readdir(root)) {
  if (['node_modules', '.nuxt', '.output', 'dist', '.git'].includes(entry)) continue
  if (!allowedRootEntries.has(entry)) fail(`unexpected root entry: ${entry}`)
}

const files = await walk(root)
for (const absolute of files) {
  const rel = normalize(relative(root, absolute))
  if (forbiddenFiles.has(rel) || rel.startsWith('.env')) fail(`forbidden credential file: ${rel}`)
  if (forbiddenPrefixes.some(prefix => rel.startsWith(prefix))) fail(`forbidden path: ${rel}`)
  if (rel.startsWith('shared/') && !allowedShared.has(rel)) fail(`shared file is not allowlisted: ${rel}`)
  if (!textExtensions.has(extname(rel)) || rel === 'scripts/public-boundary-gate.mjs') continue
  const text = await readFile(absolute, 'utf8')
  const workflowRedactedText =
    redactAllowedWorkflowSecretReferences(rel, text)

  const controlPlaneScanText =
    redactAllowedBuildScriptSecretReferences(
      rel,
      workflowRedactedText,
    )

  for (const pattern of forbiddenText) {
    if (pattern.test(controlPlaneScanText)) {
      fail(`forbidden control-plane signature in ${rel}: ${pattern}`)
    }
  }
  const imports = text.matchAll(/(?:from\s*|import\s*\()(['"])([^'"]+)\1/g)
  for (const match of imports) {
    const specifier = match[2]
    if (/^(?:~~\/|\.\.\/|\.\/).*(?:apps-script|workers|content\/providers|shared\/(?:build|provider|migration|contracts)|cms-|media-upload|production-authoring|mmj-05i)/.test(specifier)) {
      fail(`forbidden import in ${rel}: ${specifier}`)
    }
    if ((rel.startsWith('app/') || rel.startsWith('shared/') || rel === 'nuxt.config.ts') && /(?:^|\/)scripts\/mmj-ui29-|portfolio\.(?:handoff|build-input-lock)\.json/.test(specifier)) {
      fail(`build-time handoff import leaked into runtime source ${rel}: ${specifier}`)
    }
  }
}

const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
if (pkg.devDependencies?.wrangler || pkg.dependencies?.wrangler) fail('wrangler is forbidden in the public package graph.')
for (const [name, command] of Object.entries(pkg.scripts ?? {})) {
  if (/snapshot:mmj|mmj-05[a-m]|wrangler|clasp/i.test(String(command))) fail(`private command leaked through script ${name}.`)
}

for (const required of allowedShared) {
  try { await stat(resolve(root, required)) } catch { fail(`required public dependency missing: ${required}`) }
}

for (const required of requiredUi29BuildFiles) {
  try { await stat(resolve(root, required)) } catch { fail(`required UI29 build dependency missing: ${required}`) }
}

const adoptSource = await readFile(resolve(root, 'scripts/mmj-ui29-portfolio-adopt.mjs'), 'utf8')
for (const forbiddenEndpoint of ['/api/v1/mutations', '/admin/bootstrap', '/api/v1/portfolio-collection/rebuild', '/api/v1/commission-guide/']) {
  if (adoptSource.includes(forbiddenEndpoint)) fail(`UI29 adoption script contains forbidden endpoint: ${forbiddenEndpoint}`)
}
for (const requiredEndpoint of ['/api/v1/public/portfolio-snapshot/head', '/api/v1/public/portfolio-snapshot/receipts/', '/api/v1/public/portfolio-snapshot']) {
  if (!adoptSource.includes(requiredEndpoint)) fail(`UI29 adoption script is missing public endpoint: ${requiredEndpoint}`)
}

const runtimeFiles = files.filter(absolute => {
  const rel = normalize(relative(root, absolute))
  return rel.startsWith('app/') || rel.startsWith('shared/') || rel === 'nuxt.config.ts'
})
for (const absolute of runtimeFiles) {
  if (!textExtensions.has(extname(absolute))) continue
  const rel = normalize(relative(root, absolute))
  const text = await readFile(absolute, 'utf8')
  if (text.includes('MMJ_PORTFOLIO_HANDOFF_ORIGIN') || text.includes('portfolio-snapshot/head') || text.includes('portfolio-snapshot/receipts')) {
    fail(`build-time portfolio handoff signature leaked into runtime source: ${rel}`)
  }
}

console.log(JSON.stringify({
  event: 'PASS_MMJ_05N_A_PUBLIC_BOUNDARY',
  scannedFileCount: files.length,
  sharedAllowlistCount: allowedShared.size,
  ui29BuildFileCount: requiredUi29BuildFiles.size,
}))
