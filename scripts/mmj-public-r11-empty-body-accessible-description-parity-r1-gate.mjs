import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const PATCH = 'MMJ-PUBLIC-R11-EMPTY-BODY-AND-ACCESSIBLE-DESCRIPTION-PARITY-R1'
const GATE = 'gate:public-r11-empty-body-accessible-description-parity-r1'
const root = process.cwd()
const fail = message => { throw new Error(`FAIL_${PATCH}: ${message}`) }
const text = rel => readFile(resolve(root, rel), 'utf8')

const [authority, contract, pkgText] = await Promise.all([
  text('shared/resolver/accessible-description-resolution.ts'),
  text('scripts/lib/mmj-ui29-public-contract.mjs'),
  text('package.json'),
])
const pkg = JSON.parse(pkgText)

for (const token of [
  "'explicit-alt'",
  "'media-caption'",
  "'project-description'",
  "'project-summary'",
  'exactExplicitAlt(',
  'selectDerivedCandidate(',
  'const resolved = resolveWorkDetailAccessibleDescription(project, asset, context)',
  "return Object.freeze({ mode: 'decorative' as const })",
  "accessibilityMode: 'decorative' as const",
]) if (!authority.includes(token)) fail(`required accessible-description authority token missing: ${token}`)

for (const forbidden of [
  'accessible-description-unresolvable',
  'project.title',
  'asset.label',
  'objectKey.split',
  'filename',
  'fetch(',
  'window.',
  'document.',
  'openai',
  'anthropic',
]) if (authority.toLowerCase().includes(forbidden.toLowerCase())) fail(`forbidden absence synthesis/hard-fail token found: ${forbidden}`)

for (const token of [
  'string(value.summary, `${pointer}.summary`, code, { max: 2000 })',
  'string(value.description, `${pointer}.description`, code, { max: 12000 })',
  'string(value.post.comment, `${pointer}.post.comment`, code, { max: 12000 })',
]) if (!contract.includes(token)) fail(`R11 empty-body admission token missing: ${token}`)

if (!contract.includes('E_MMJ_PUBLIC_EXPLICIT_IMAGE_ALT_TEXT_INVALID')) {
  fail('invalid explicit alt public error mapping missing')
}
if (!contract.includes('validateAccessibleDescriptionResolutionAdmission')) {
  fail('public accessible-description admission is no longer executed')
}

if (pkg.mmjPublicR11EmptyBodyAccessibleDescriptionParityR1Release !== PATCH) {
  fail('package release marker mismatch')
}
if (typeof pkg.scripts?.[GATE] !== 'string') fail('package gate missing')
const main = String(pkg.scripts?.['gate:mmj-ui29-a'] ?? '')
const oldInvocation = 'npm run gate:public-informative-image-accessible-description-resolution-r2'
const invocation = `npm run ${GATE}`
const plannerInvocation = 'npm run gate:public-work-detail-presentation-planner-admission-closure-r1'
if (!main.includes(invocation)) fail('main gate missing R11 accessibility parity gate')
if (main.indexOf(invocation) < main.indexOf(oldInvocation)) fail('R11 parity gate must follow base R2 gate')
if (main.indexOf(invocation) > main.indexOf(plannerInvocation)) fail('R11 parity gate must precede presentation planner gate')

console.log(JSON.stringify({
  event: 'PASS_MMJ_PUBLIC_R11_EMPTY_BODY_AND_ACCESSIBLE_DESCRIPTION_PARITY_R1_GATE',
  release: PATCH,
  bodyAsAccessibleDescription: true,
  explicitAltRequired: false,
  canonicalEmptyBodyAdmitted: true,
  sourceAbsenceDecorative: true,
  invalidExplicitAltStillFails: true,
  titleLabelFilenameFallback: false,
  generatedDescription: false,
  snapshotMutation: false,
}))
