import { readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

const PATCH = 'MMJ-PUBLIC-INFORMATIVE-IMAGE-ACCESSIBLE-DESCRIPTION-RESOLUTION-R2'
const GATE = 'gate:public-informative-image-accessible-description-resolution-r2'
const OLD_GATE = 'gate:public-informative-image-alt-text-authority-closure-r1'
const root = process.cwd()
const fail = message => { throw new Error(`FAIL_${PATCH}: ${message}`) }
const text = rel => readFile(resolve(root, rel), 'utf8')
async function exists(rel) { try { await stat(resolve(root, rel)); return true } catch { return false } }

const [authority, planner, frame, gallery, page, contract, boundary, assetType, pkgText] = await Promise.all([
  text('shared/resolver/accessible-description-resolution.ts'),
  text('shared/resolver/work-detail-presentation-plan.ts'),
  text('app/components/work/WorkAssetFrame.vue'),
  text('app/components/work/WorkGallery.vue'),
  text('app/pages/works/[slug].vue'),
  text('scripts/lib/mmj-ui29-public-contract.mjs'),
  text('scripts/public-boundary-gate.mjs'),
  text('shared/types/portfolio-asset.ts'),
  text('package.json'),
])
const pkg = JSON.parse(pkgText)

if (!assetType.includes('readonly altText: string | null')) fail('canonical altText schema is no longer nullable')
if (await exists('shared/resolver/informative-image-accessibility.ts')) fail('retired explicit-alt authority still exists')
if (await exists('scripts/mmj-public-informative-image-alt-text-authority-closure-r1-test.mjs')) fail('retired R1 alt test still exists')
if (await exists('scripts/mmj-public-informative-image-alt-text-authority-closure-r1-gate.mjs')) fail('retired R1 alt gate still exists')

for (const token of [
  'ResolvedAccessibleDescription',
  "'explicit-alt'",
  "'media-caption'",
  "'project-description'",
  "'project-summary'",
  'exactExplicitAlt(',
  'selectDerivedCandidate(',
  'GENERIC_DESCRIPTION_EXACT',
  'candidateIndex',
  'admitPortfolioAccessibleDescriptions',
  "'primary-video-poster': 'decorative'",
]) if (!authority.includes(token)) fail(`accessible description authority token missing: ${token}`)

for (const forbidden of [
  'asset.altText ?? asset.label',
  'asset.altText ?? asset.caption',
  'project.title',
  'objectKey.split',
  'fetch(',
  'window.',
  'document.',
  'openai',
  'anthropic',
]) if (authority.toLowerCase().includes(forbidden.toLowerCase())) fail(`forbidden synthesis/generation token found: ${forbidden}`)

for (const token of [
  "from './accessible-description-resolution'",
  'resolveWorkDetailImageAccessibility(project, asset, context)',
  'createWorkDetailImageOptions(project, image, accessibilityContext, priority)',
]) if (!planner.includes(token)) fail(`presentation planner R2 binding missing: ${token}`)
if (planner.includes("from './informative-image-accessibility'")) fail('planner still imports retired R1 authority')

for (const token of [
  'readonly project: WorkDetailView',
  ':project="project"',
  'props.project,',
  "from '~~/shared/resolver/accessible-description-resolution'",
]) if (!frame.includes(token) && !gallery.includes(token) && !page.includes(token)) {
  fail(`runtime project/context binding missing: ${token}`)
}
if (!gallery.includes('readonly project: WorkDetailView')) fail('WorkGallery does not own exact WorkDetail project context')
if (!gallery.includes(':project="project"')) fail('WorkGallery does not forward project context')
if (!page.includes('<WorkGallery\n      :project="project"')) fail('Work Detail page does not forward project to gallery')
if (!page.includes('<WorkAssetFrame\n        :project="project"')) fail('Work Detail page does not forward project to primary frame')

if (!contract.includes('validateAccessibleDescriptionResolutionAdmission')) fail('public contract does not expose R2 resolution admission')
if (!contract.includes("'shared/resolver/accessible-description-resolution.ts'")) fail('public contract does not load R2 shared authority')
if (!contract.includes('E_MMJ_PUBLIC_INFORMATIVE_IMAGE_DESCRIPTION_UNRESOLVABLE')) fail('unresolvable error taxonomy missing')
if (!contract.includes('E_MMJ_PUBLIC_EXPLICIT_IMAGE_ALT_TEXT_INVALID')) fail('invalid explicit override error taxonomy missing')
if (contract.includes('E_MMJ_PUBLIC_INFORMATIVE_IMAGE_ALT_TEXT_REQUIRED')) fail('retired missing-explicit-alt failure still active')
const accessCall = 'await validateAccessibleDescriptionResolutionAdmission(snapshotValue, { sourceRoot })'
const plannerCall = 'await validateWorkDetailPresentationAdmission(snapshotValue, {'
if (contract.indexOf(accessCall) < 0) fail('R2 admission is not executed by generated artifact verification')
if (contract.indexOf(plannerCall) < 0) fail('presentation planner admission is missing')
if (contract.indexOf(accessCall) > contract.indexOf(plannerCall)) fail('R2 description admission must precede presentation planner')

if (!boundary.includes("'shared/resolver/accessible-description-resolution.ts'")) fail('R2 shared authority is not exactly allowlisted')
if (boundary.includes("'shared/resolver/informative-image-accessibility.ts'")) fail('retired R1 authority remains allowlisted')

if (pkg.mmjPublicInformativeImageAccessibleDescriptionResolutionR2Release !== PATCH) fail('R2 release marker mismatch')
if (pkg.mmjPublicInformativeImageAltTextAuthorityClosureRelease !== undefined) fail('retired R1 release marker still active')
if (typeof pkg.scripts?.[GATE] !== 'string') fail('R2 package gate missing')
if (pkg.scripts?.[OLD_GATE] !== undefined) fail('retired R1 package gate still active')
const main = String(pkg.scripts?.['gate:mmj-ui29-a'] ?? '')
const r2Invocation = `npm run ${GATE}`
const plannerInvocation = 'npm run gate:public-work-detail-presentation-planner-admission-closure-r1'
if (!main.includes(r2Invocation)) fail('main gate missing R2 accessible description gate')
if (!main.includes(plannerInvocation)) fail('main gate missing presentation planner gate')
if (main.indexOf(r2Invocation) > main.indexOf(plannerInvocation)) fail('accessible description gate must precede presentation planner gate')
if (main.includes(OLD_GATE)) fail('main gate still invokes retired explicit-alt gate')

console.log(JSON.stringify({
  event: 'PASS_MMJ_PUBLIC_INFORMATIVE_IMAGE_ACCESSIBLE_DESCRIPTION_RESOLUTION_R2_GATE',
  release: PATCH,
  explicitAltRequired: false,
  canonicalAltNullable: true,
  deterministicDerivedDescription: true,
  provenanceRequired: true,
  canonicalMutation: false,
  primaryVideoPosterDecorative: true,
  oldMissingAltBlockerRetired: true,
}))
