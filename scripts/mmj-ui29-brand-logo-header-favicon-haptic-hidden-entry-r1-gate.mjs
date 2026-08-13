import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const RELEASE = 'MMJ-UI29-BRAND-LOGO-HEADER-FAVICON-HAPTIC-HIDDEN-ENTRY-ADOPTION-R1'
const LOGO_SHA256 = '0a19003d949d7a68a47a143c22830e0761b55845845837addbb8c86ab5946f1c'

function fail(message, details = undefined) {
  const error = new Error(message)
  error.name = 'E_MMJ_UI29_BRAND_LOGO_HEADER_FAVICON_HAPTIC_HIDDEN_ENTRY_R1'
  error.code = error.name
  error.details = details
  throw error
}

async function text(path) {
  return readFile(resolve(root, path), 'utf8')
}

async function bytes(path) {
  return readFile(resolve(root, path))
}

function count(source, token) {
  return source.split(token).length - 1
}

const [siteHeader, arbitrator, policy, shellCss, nuxtConfig, packageText, brandComponent, logoBytes] = await Promise.all([
  text('app/components/shell/SiteHeader.vue'),
  text('app/composables/useBrandEntryArbitrator.ts'),
  text('app/utils/brand-entry-policy.ts'),
  text('app/assets/css/shell.css'),
  text('nuxt.config.ts'),
  text('package.json'),
  text('app/components/shell/SiteBrandMark.vue'),
  bytes('app/assets/brand/mmj-logo.svg'),
])
const pkg = JSON.parse(packageText)

const actualLogoSha = createHash('sha256').update(logoBytes).digest('hex')
if (actualLogoSha !== LOGO_SHA256) {
  fail('Canonical brand SVG digest mismatch.', { actualLogoSha, expected: LOGO_SHA256 })
}

if (!brandComponent.includes('src="~/assets/brand/mmj-logo.svg"')) {
  fail('SiteBrandMark must project the canonical SVG source.')
}
if (!brandComponent.includes('alt=""') || !brandComponent.includes('aria-hidden="true"')) {
  fail('SiteBrandMark must remain decorative; the parent link owns accessible identity.')
}

for (const token of [
  "import SiteBrandMark from '~/components/shell/SiteBrandMark.vue'",
  "brandFeedbackSurface === 'header' ? 'active' : 'idle'",
  "brandFeedbackSurface === 'mobile-menu' ? 'active' : 'idle'",
  "onBrandPointerDown($event, 'header')",
  "onBrandPointerDown($event, 'mobile-menu')",
  "onBrandClick($event, 'header')",
  "onBrandClick($event, 'mobile-menu')",
  'data-mm-brand-hidden-entry',
]) {
  if (!siteHeader.includes(token)) fail('SiteHeader brand projection contract is incomplete.', { token })
}
if (count(siteHeader, '<SiteBrandMark />') !== 2) {
  fail('Header and mobile menu must project exactly two canonical brand marks.', {
    count: count(siteHeader, '<SiteBrandMark />'),
  })
}
if (/>(?:\s|\r|\n)*매미: 著(?:\s|\r|\n)*</u.test(siteHeader)) {
  fail('Visual header brand text remains after logo adoption.')
}
if (!siteHeader.includes('매미: 著 홈. 빠르게 두 번 누르면 숨은 작업실 진입')) {
  fail('Accessible site identity or hidden-entry hint was lost.')
}

for (const token of [
  'BRAND_DOUBLE_CLICK_WINDOW_MS',
  'BRAND_FEEDBACK_DURATION_MS',
  'BRAND_HAPTIC_PATTERN_MS',
  'isBrandDoubleActivationMatch',
  'didBrandPointerMoveBeyondThreshold',
  "window.matchMedia('(prefers-reduced-motion: reduce)')",
  "pointerType !== 'touch'",
  'navigator.vibrate([...BRAND_HAPTIC_PATTERN_MS])',
  "path: '/works'",
  'HIDDEN_VOICE_SYNTHESIS_CATEGORY_ID',
  'feedbackSurface',
]) {
  if (!arbitrator.includes(token)) fail('Brand entry arbitrator contract is incomplete.', { token })
}
if (arbitrator.includes('window.innerWidth') || arbitrator.includes('window.innerHeight') || arbitrator.includes('getBoundingClientRect') || arbitrator.includes('ResizeObserver')) {
  fail('Brand entry logic must not own viewport geometry.')
}

for (const token of [
  'export const BRAND_DOUBLE_CLICK_WINDOW_MS = 280',
  'export const BRAND_POINTER_MOVE_CANCEL_PX = 8',
  'export const BRAND_FEEDBACK_DURATION_MS = 320',
  'Object.freeze([18, 42, 18])',
  "pointerType === 'mouse' || pointerType === 'touch'",
]) {
  if (!policy.includes(token)) fail('Typed brand gesture policy is incomplete.', { token })
}

for (const token of [
  '.mm-site-brand-mark',
  'touch-action: manipulation;',
  '@keyframes mm-brand-cicada-shake',
  "[data-mm-brand-feedback='active']",
  'animation: mm-brand-cicada-shake 320ms',
  '@media (prefers-reduced-motion: reduce)',
]) {
  if (!shellCss.includes(token)) fail('Brand visual feedback CSS contract is incomplete.', { token })
}
const keyframeMatch = shellCss.match(/@keyframes mm-brand-cicada-shake\s*\{([\s\S]*?)\n\}/u)
if (!keyframeMatch) fail('Cicada shake keyframes are missing.')
if (/\b(?:left|right|top|bottom|margin|padding|width|height|position)\s*:/u.test(keyframeMatch[1])) {
  fail('Cicada shake must not mutate layout geometry.')
}
if (!keyframeMatch[1].includes('translateX')) {
  fail('Cicada shake must use horizontal transform motion.')
}

for (const token of [
  "join(root, 'app', 'assets', 'brand', 'mmj-logo.svg')",
  '`data:image/svg+xml,${encodeURIComponent(brandMarkSvg)}`',
  "rel: 'icon'",
  "type: 'image/svg+xml'",
  'href: brandFaviconHref',
  "title: '매미: 著'",
]) {
  if (!nuxtConfig.includes(token)) fail('Favicon or document identity binding is incomplete.', { token })
}
if (nuxtConfig.includes("href: '/favicon.svg'") || nuxtConfig.includes("href: '/logo.svg'")) {
  fail('Favicon must not introduce a duplicate public artwork authority.')
}

const gateCommand = 'node --experimental-strip-types scripts/mmj-ui29-brand-logo-header-favicon-haptic-hidden-entry-r1-test.mjs && node scripts/mmj-ui29-brand-logo-header-favicon-haptic-hidden-entry-r1-gate.mjs'
if (pkg.scripts?.['gate:brand-logo-header-favicon-haptic-hidden-entry-r1'] !== gateCommand) {
  fail('Package gate binding is missing or drifted.')
}
if (!String(pkg.scripts?.['gate:mmj-ui29-a'] ?? '').includes('gate:brand-logo-header-favicon-haptic-hidden-entry-r1')) {
  fail('Brand gate is not connected to aggregate UI29 gate.')
}
if (pkg.mmjUi29BrandLogoHeaderFaviconHapticHiddenEntryRelease !== RELEASE) {
  fail('Brand release marker is missing or drifted.')
}

for (const forbiddenPublicPath of ['public/favicon.svg', 'public/logo.svg']) {
  try {
    const entry = await stat(resolve(root, forbiddenPublicPath))
    if (entry.isFile()) fail('Duplicate public brand artwork authority is forbidden.', { forbiddenPublicPath })
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
}

console.log(JSON.stringify({
  event: 'PASS_MMJ_UI29_BRAND_LOGO_HEADER_FAVICON_HAPTIC_HIDDEN_ENTRY_ADOPTION_R1',
  release: RELEASE,
  logoSha256: actualLogoSha,
  headerBrandProjectionCount: 2,
  faviconAuthority: 'canonical-svg-data-uri',
  desktopGesture: 'double-click',
  mobileGesture: 'double-tap',
  haptic: 'bounded-best-effort-touch-only',
  reducedMotion: 'sensory-feedback-suppressed',
  hiddenEntryAuthority: 'preserved',
}))
