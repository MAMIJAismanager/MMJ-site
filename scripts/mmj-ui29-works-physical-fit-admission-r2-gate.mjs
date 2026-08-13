import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')

const [
  layoutProfile,
  physicalFit,
  layoutComposable,
  physicalComposable,
  frameMetrics,
  page,
  pagination,
  pkgText,
] = await Promise.all([
  read('app/works/works-layout-profile.ts'),
  read('app/works/works-physical-fit.ts'),
  read('app/composables/useWorksLayoutProfile.ts'),
  read('app/composables/useWorksPhysicalFitAdmission.ts'),
  read('app/composables/useViewportFrameMetrics.ts'),
  read('app/pages/works/index.vue'),
  read('app/components/works/WorksPagination.vue'),
  read('package.json'),
])

const pkg = JSON.parse(pkgText)
const release = 'MMJ-UI29-WORKS-PHYSICAL-FIT-ADMISSION-R2'

for (const token of [
  'readonly lockEligible: boolean',
  'readonly physicalFitPhase: WorksPhysicalFitPhase',
  'deriveReferenceCandidateTokens(',
  "const viewportLocked = physicalFitPhase === 'admitted-locked'",
  'resolveWorksLayoutProfile(',
]) {
  assert.ok(layoutProfile.includes(token), `candidate layout authority missing: ${token}`)
}
for (const retired of [
  'WORKS_SITE_HEADER_BLOCK_PX',
  'WORKS_PAGINATION_BUTTON_BLOCK_PX',
  'rowRequiredBlockPx',
  'referenceCandidate.receipt.admitted',
  'compactCandidate.receipt.admitted',
]) {
  assert.equal(layoutProfile.includes(retired), false, `synthetic commit authority remains: ${retired}`)
}
for (const forbidden of [
  'window.',
  'document.',
  'HTMLElement',
  'ResizeObserver',
  'getBoundingClientRect',
]) {
  assert.equal(layoutProfile.includes(forbidden), false, `layout profile leaked DOM authority: ${forbidden}`)
}

for (const token of [
  "| 'measuring-natural'",
  "| 'admitted-locked'",
  "| 'rejected-flow'",
  "| 'revoked-flow'",
  'pageScrollBlockPx',
  'gridScrollBlockPx',
  'paginationBlockPx',
  'isStableWorksPhysicalMeasurement',
  'resolveWorksNaturalPhysicalFit',
  'verifyWorksLockedPhysicalCommit',
  'WORKS_PHYSICAL_FIT_SAFETY_PX',
]) {
  assert.ok(physicalFit.includes(token), `physical fit SSOT missing: ${token}`)
}
for (const forbidden of [
  'window.',
  'document.',
  'HTMLElement',
  'ResizeObserver',
  'getBoundingClientRect',
]) {
  assert.equal(physicalFit.includes(forbidden), false, `pure physical resolver leaked DOM authority: ${forbidden}`)
}

for (const token of [
  'viewportRevision',
  'candidate',
  'physicalFit',
  'WORKS_PHYSICAL_FIT_STATE_KEY',
  'WORKS_PHYSICAL_FIT_ACTIVE_KEY_STATE_KEY',
  'physicalFit.value.fitKey === activePhysicalFitKey.value',
]) {
  assert.ok(layoutComposable.includes(token), `layout/physical bridge missing: ${token}`)
}
assert.equal(layoutComposable.includes('ResizeObserver'), false, 'ResizeObserver must remain in physical admission composable')
assert.equal(layoutComposable.includes('getBoundingClientRect'), false, 'layout profile composable must not measure DOM')

for (const token of [
  'new ResizeObserver(',
  'window.requestAnimationFrame',
  'readWorksViewportFrameMetrics',
  'page.scrollHeight',
  'grid.scrollHeight',
  'grid.getBoundingClientRect()',
  'pagination.getBoundingClientRect()',
  "case 'measuring-natural':",
  "case 'admitted-locked':",
  'verifyWorksLockedPhysicalCommit(snapshot)',
  'MAX_STABILITY_PROBES',
]) {
  assert.ok(physicalComposable.includes(token), `Nuxt physical observer authority missing: ${token}`)
}
assert.equal(physicalComposable.includes('setInterval('), false, 'physical admission must not poll')
assert.equal(physicalComposable.includes("addEventListener('scroll'"), false, 'scroll-loop measurement forbidden')

for (const token of [
  'resolveWorksViewportFrameElements',
  'readWorksViewportFrameMetrics',
  'pageElement.parentElement',
  'mainElement.previousElementSibling',
  "classList.contains('mm-site-header')",
  'window.innerHeight',
]) {
  assert.ok(frameMetrics.includes(token), `viewport frame observation missing: ${token}`)
}
assert.equal(frameMetrics.includes('querySelector'), false, 'viewport frame observation must not search DOM globally')

for (const token of [
  'ref="pageElement"',
  'ref="headerMeasureElement"',
  'ref="queryMeasureElement"',
  'ref="summaryMeasureElement"',
  'ref="gridMeasureElement"',
  'ref="paginationMeasureElement"',
  'useWorksPhysicalFitAdmission',
  'worksPhysicalFitKey',
  ':data-mm-works-physical-fit-phase="worksPhysicalFitReceipt.phase"',
  ':data-mm-works-physical-fit-verified="worksPhysicalFitReceipt.commitVerified ? \'true\' : \'false\'"',
]) {
  assert.ok(page.includes(token), `Vue physical measurement surface missing: ${token}`)
}
assert.ok(page.indexOf('<ProjectGrid') < page.indexOf('<WorksPagination'), 'pagination must remain after grid')

for (const token of [
  "readonly placement: 'in-flow'",
  ':data-mm-pagination-placement="placement"',
]) {
  assert.ok(pagination.includes(token), `pagination in-flow contract missing: ${token}`)
}

const gateName = 'gate:works-physical-fit-admission-r2'
const gateCommand = 'node --experimental-strip-types scripts/mmj-ui29-works-physical-fit-admission-r2-test.mjs && node scripts/mmj-ui29-works-physical-fit-admission-r2-gate.mjs'
assert.equal(pkg.scripts?.[gateName], gateCommand, 'physical R2 package gate binding drift')
assert.ok(String(pkg.scripts?.['gate:mmj-ui29-a'] ?? '').includes(`npm run ${gateName}`), 'aggregate UI29 gate missing physical R2')
assert.equal(pkg.mmjUi29WorksPhysicalFitAdmissionR2Release, release, 'physical R2 release marker drift')

console.log('PASS_NATURAL_FLOW_FIRST_RENDER_STATIC_CONTRACT')
console.log('PASS_VUE3_ELEMENT_REF_MEASUREMENT_OWNERSHIP')
console.log('PASS_NUXT_RESIZE_OBSERVER_RAF_COALESCING')
console.log('PASS_TYPESCRIPT_PHYSICAL_FIT_RECEIPT_AUTHORITY')
console.log('PASS_NO_ESTIMATED_METADATA_HEIGHT_COMMIT_AUTHORITY')
console.log('PASS_NO_GEOMETRY_FEEDBACK_POLLING')
console.log('PASS_PAGINATION_IN_FLOW_COLLISION_VETO')
console.log('PASS_MMJ_UI29_WORKS_PHYSICAL_FIT_ADMISSION_R2')
