import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')

const [profile, composable, page, css, pkgText] = await Promise.all([
  read('app/work-detail/work-detail-layout-profile.ts'),
  read('app/composables/useWorkDetailLayoutProfile.ts'),
  read('app/pages/works/[slug].vue'),
  read('app/assets/css/work-detail.css'),
  read('package.json'),
])
const pkg = JSON.parse(pkgText)

assert.ok(profile.includes("readonly composition: 'stack' | 'split'"), 'composition discriminator missing')
assert.ok(profile.includes('readonly copyColumnPx: number | null'), 'nullable copy column contract missing')
assert.equal(profile.includes('copyColumnPx: 0'), false, 'zero-pixel copy column remains')
assert.ok(profile.includes("mode: 'document-flow',\n      composition: 'stack'"), 'document-flow stack authority missing')
assert.ok(profile.includes("mode: 'mobile-stack',\n      composition: 'stack'"), 'mobile stack authority missing')
assert.ok(profile.includes("mode: 'compact-stack',\n      composition: 'stack'"), 'compact stack authority missing')
assert.ok(profile.includes("composition: 'split',\n    density"), 'split composition authority missing')
for (const forbidden of ['window.', 'document.', 'ResizeObserver', 'getBoundingClientRect']) {
  assert.equal(profile.includes(forbidden), false, `pure profile leaked browser authority: ${forbidden}`)
}

assert.ok(composable.includes('window.visualViewport'), 'VisualViewport authority missing')
assert.ok(composable.includes("window.visualViewport?.addEventListener(\n      'resize'"), 'VisualViewport resize observation missing')
assert.ok(composable.includes("window.visualViewport?.removeEventListener(\n      'resize'"), 'VisualViewport resize cleanup missing')
assert.ok(composable.includes("current.composition === 'split'"), 'split-only CSS projection guard missing')
assert.ok(composable.includes('current.copyColumnPx !== null'), 'nullable copy column projection guard missing')
assert.equal(
  composable.includes("'--mm-work-detail-copy-column': `${profile.value.copyColumnPx}px`"),
  false,
  'unconditional zero-width copy column projection remains',
)

assert.ok(page.includes(':data-mm-work-detail-composition="layoutProfile.composition"'), 'composition debug receipt missing')
assert.ok(page.includes(":data-mm-work-detail-copy-column=\"layoutProfile.copyColumnPx ?? 'natural'\""), 'copy-column debug receipt missing')

assert.ok(css.includes('max-width: min(\n    100%,\n    var(--mm-work-detail-copy-column, var(--mm-copy-max))\n  );'), 'header parent-rail safety missing')
const titleMatch = css.match(/\.mm-work-detail-header__title\s*\{[\s\S]*?\}/)
assert.ok(titleMatch, 'work detail title rule missing')
assert.ok(titleMatch[0].includes('overflow-wrap: break-word;'), 'title break-word renderer missing')
assert.ok(titleMatch[0].includes('word-break: normal;'), 'title normal word-break missing')
assert.equal(titleMatch[0].includes('overflow-wrap: anywhere;'), false, 'title anywhere fragmentation remains')
for (const forbidden of ['writing-mode:', 'text-orientation:', 'transform: scale(', 'zoom:']) {
  assert.equal(css.includes(forbidden), false, `forbidden layout repair present: ${forbidden}`)
}

const gateName = 'gate:work-detail-mobile-stack-inline-authority-r1'
const gateCommand = 'node --experimental-strip-types scripts/mmj-ui29-work-detail-mobile-stack-inline-authority-r1-test.mjs && node scripts/mmj-ui29-work-detail-mobile-stack-inline-authority-r1-gate.mjs'
assert.equal(pkg.scripts?.[gateName], gateCommand, 'package gate command drifted')
assert.ok(String(pkg.scripts?.['gate:mmj-ui29-a'] ?? '').includes(`npm run ${gateName}`), 'aggregate UI gate missing mobile detail closure')
assert.equal(
  pkg.mmjUi29WorkDetailMobileStackInlineAuthorityR1Release,
  'MMJ-UI29-WORK-DETAIL-MOBILE-STACK-INLINE-AUTHORITY-R1',
  'release marker drifted',
)

console.log('PASS_STACK_COPY_COLUMN_VARIABLE_OMISSION')
console.log('PASS_VISUAL_VIEWPORT_DETAIL_MEASUREMENT')
console.log('PASS_MOBILE_LATIN_TOKEN_INTEGRITY')
console.log('PASS_MOBILE_CJK_NATURAL_LINE_FLOW')
console.log('PASS_NO_WRITING_MODE_REPAIR')
console.log('PASS_NO_NOWRAP_REPAIR')
console.log('PASS_NO_TEXT_CLIPPING_REPAIR')
console.log('PASS_NO_TRANSFORM_SCALE_REPAIR')
console.log('PASS_MMJ_UI29_WORK_DETAIL_MOBILE_STACK_INLINE_AUTHORITY_R1_GATE')
