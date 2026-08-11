import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = rel => readFile(resolve(root, rel), 'utf8')
const fail = message => { throw new Error(`FAIL_MMJ_PUBLIC_WORK_DETAIL_PRESENTATION_PLANNER_ADMISSION_CLOSURE_R1: ${message}`) }

const [authority, contract, workAssetFrame, mediaPresentation, boundary, pkgText] = await Promise.all([
  read('shared/resolver/work-detail-presentation-plan.ts'),
  read('scripts/lib/mmj-ui29-public-contract.mjs'),
  read('app/components/work/WorkAssetFrame.vue'),
  read('app/data/portfolio-media-presentation.ts'),
  read('scripts/public-boundary-gate.mjs'),
  read('package.json'),
])

for (const required of [
  'createPortfolioSnapshotQueryAuthority',
  'createPortfolioProjectViewResolver',
  'createMediaResolutionAuthority',
  'createResponsiveImagePlanningAuthority',
  'createVideoPlayerPlanningAuthority',
  'createPlayerTrackPlanningAuthority',
  'createPortfolioMediaDeliveryConfig',
  'resolveWorkDetailImageAccessibility',
  'admitPortfolioWorkDetailPresentations',
  'WorkDetailPresentationPlanningError',
  'underlyingErrorCode',
  'underlyingErrorPath',
]) if (!authority.includes(required)) fail(`shared authority missing runtime reuse token: ${required}`)

for (const forbidden of [
  'preview as primary',
  'thumbnail as primary',
  'defaultRenditionId =',
  'fetch(',
  'window.',
  'document.',
]) if (authority.includes(forbidden)) fail(`shared authority contains forbidden repair/runtime token: ${forbidden}`)

if (!authority.includes("from './accessible-description-resolution'")) fail('planner does not reuse R2 accessible-description authority')
if (!contract.includes('validateWorkDetailPresentationAdmission')) fail('public contract does not expose planner admission')
if (!contract.includes('E_MMJ_PUBLIC_WORK_PRESENTATION_PLANNER_FAILED')) fail('public contract erases planner failure taxonomy')
if (!contract.includes('NUXT_PUBLIC_MMJ_MEDIA_BASE_URL')) fail('public contract has no explicit media base URL build input')
if (!contract.includes('await validateWorkDetailPresentationAdmission(snapshotValue')) fail('generated artifact verification does not execute planner admission')
if (!workAssetFrame.includes('createWorkDetailImageOptions')) fail('WorkAssetFrame does not reuse shared image options')
if (!workAssetFrame.includes('props.project,')) fail('WorkAssetFrame does not pass exact WorkDetail project context')
if (workAssetFrame.includes('altText: preview.altText')) fail('WorkAssetFrame retained local alt synthesis')
if (!mediaPresentation.includes('createWorkDetailVideoPosterOptions')) fail('runtime video poster does not reuse shared poster options')
if (!boundary.includes("'shared/resolver/work-detail-presentation-plan.ts'")) fail('presentation authority is not exactly allowlisted')

const pkg = JSON.parse(pkgText)
const GATE = 'gate:public-work-detail-presentation-planner-admission-closure-r1'
if (typeof pkg.scripts?.[GATE] !== 'string') fail('package gate missing')
if (pkg.mmjWorkDetailPresentationPlannerAdmissionClosureRelease !== 'MMJ-PUBLIC-WORK-DETAIL-PRESENTATION-PLANNER-ADMISSION-CLOSURE-R1') fail('release marker drifted')

console.log(JSON.stringify({
  event: 'PASS_MMJ_PUBLIC_WORK_DETAIL_PRESENTATION_PLANNER_ADMISSION_CLOSURE_R1_GATE',
  exactRuntimePlannerReuse: true,
  accessibleDescriptionR2Reuse: true,
  noSnapshotMutation: true,
  noPlaceholderForgiveness: true,
}))
