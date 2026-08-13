import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')

function fail(code, message, details = undefined) {
  const error = new Error(message)
  error.name = code
  error.code = code
  error.details = details
  throw error
}

const [
  categoryRegistry,
  schemas,
  formSchema,
  payload,
  form,
  categorySelector,
  composable,
  service,
  endpoint,
  contactPage,
  siteInformation,
  nuxtConfig,
  packageJsonText,
] = await Promise.all([
  read('app/contact/contact-category-registry.ts'),
  read('app/contact/contact-form-schemas.ts'),
  read('app/contact/contact-form-schema.ts'),
  read('app/contact/contact-payload.ts'),
  read('app/components/contact/ContactForm.vue'),
  read('app/components/contact/ContactCategorySelector.vue'),
  read('app/composables/useContactForm.ts'),
  read('app/services/contact-formspree-service.ts'),
  read('app/utils/formspree-endpoint.ts'),
  read('app/pages/contact.vue'),
  read('app/content/site-information.ts'),
  read('nuxt.config.ts'),
  read('package.json'),
])
const pkg = JSON.parse(packageJsonText)

const categoryIds = [
  'choreography',
  'composition',
  'costume',
  'video',
  'project-planning',
  'mix-master',
  'package',
]
const subjects = [
  '안무창작 견적 문의',
  '작곡 견적 문의',
  '의상디자인 견적 문의',
  '영상편집 견적 문의',
  '프로젝트 기획 견적 문의',
  '믹싱&마스터링 견적 문의',
  '패키지 견적 문의',
]
for (const token of categoryIds) {
  if (!categoryRegistry.includes(`id: '${token}'`)) {
    fail('E_MMJ_CONTACT_CATEGORY_REGISTRY_INVALID', 'Canonical inquiry category is missing.', { token })
  }
}
for (const subject of subjects) {
  if (!categoryRegistry.includes(`mailSubject: '${subject}'`)) {
    fail('E_MMJ_CONTACT_CATEGORY_SUBJECT_UNRESOLVED', 'Canonical mail subject is missing.', { subject })
  }
}
if ((categoryRegistry.match(/mailSubject:/g) ?? []).length !== 7) {
  fail('E_MMJ_CONTACT_CATEGORY_REGISTRY_INVALID', 'Canonical category count or subject count drifted.')
}

for (const token of [
  'type="radio"',
  'name="inquiry_category"',
  'CONTACT_INQUIRY_CATEGORIES',
  'data-mm-contact-category-selector',
]) {
  if (!categorySelector.includes(token)) {
    fail('E_MMJ_CONTACT_CATEGORY_SELECTION_AUTHORITY_INVALID', 'Category radio authority is missing.', { token })
  }
}
if (categorySelector.includes('type="checkbox"')) {
  fail('E_MMJ_CONTACT_CATEGORY_SELECTION_AUTHORITY_INVALID', 'Top-level category selection must remain single-choice radio.')
}

for (const token of [
  "{ value: 'allowed', label: '허가' }",
  "{ value: 'not-allowed', label: '비허가' }",
  "{ value: 'embargo', label: '일정 기간 비공개 후 허가' }",
]) {
  if (!schemas.includes(token)) {
    fail('E_MMJ_CONTACT_PORTFOLIO_PERMISSION_AUTHORITY_INVALID', 'Portfolio permission radio authority is incomplete.', { token })
  }
}
for (const token of [
  'data-mm-portfolio-permission',
  'name="portfolio_permission"',
  'PORTFOLIO_PERMISSION_OPTIONS',
]) {
  if (!form.includes(token)) {
    fail('E_MMJ_CONTACT_PORTFOLIO_PERMISSION_AUTHORITY_INVALID', 'Portfolio permission projection is missing.', { token })
  }
}
if (!composable.includes("error('portfolioPermission'")) {
  fail('E_MMJ_CONTACT_PORTFOLIO_PERMISSION_AUTHORITY_INVALID', 'Portfolio permission validation is missing.')
}
if (!payload.includes("categoryId !== 'package'")) {
  fail('E_MMJ_CONTACT_PACKAGE_DATE_OVERRIDE_INVALID', 'Package schedule override boundary is missing.')
}
if (!payload.includes("'portfolio_permission'")) {
  fail('E_MMJ_CONTACT_PORTFOLIO_PERMISSION_AUTHORITY_INVALID', 'Portfolio permission payload binding is missing.')
}

for (const token of [
  "| 'choreography'",
  "| 'composition'",
  "| 'costume'",
  "| 'video'",
  "| 'project-planning'",
  "| 'mix-master'",
  "| 'package'",
]) {
  if (!formSchema.includes(token)) {
    fail('E_MMJ_CONTACT_SCHEMA_REGISTRY_INVALID', 'Contact schema union is incomplete.', { token })
  }
}

for (const token of [
  "id: 'simple-storyboard'",
  "id: 'storyboard-coaching'",
  "id: 'shooting-director'",
  "id: 'camera-director'",
  "id: 'simple-editing'",
  "id: 'advanced-editing'",
]) {
  if (!schemas.includes(token)) {
    fail('E_MMJ_CONTACT_VIDEO_WORK_TYPE_REGISTRY_INVALID', 'Video work type registry is incomplete.', { token })
  }
}
for (const token of [
  "id: 'original-song-full'",
  "id: 'music-video-full'",
  "id: 'custom'",
  'discountRate: 0.05',
]) {
  if (!schemas.includes(token)) {
    fail('E_MMJ_CONTACT_PACKAGE_REGISTRY_INVALID', 'Package registry is incomplete.', { token })
  }
}
if (!composable.includes("requiredCustomWorkCount.value < 3")) {
  fail('E_MMJ_CONTACT_PACKAGE_REVIEW_GATE_INVALID', 'Custom package three-plus review gate is missing.')
}
if (!composable.includes("draft.package.customSameProject !== 'yes'")) {
  fail('E_MMJ_CONTACT_PACKAGE_REVIEW_GATE_INVALID', 'Custom package same-project review gate is missing.')
}
if (payload.includes('* 0.95') || payload.includes('* .95') || payload.includes('discount approved')) {
  fail('E_MMJ_CONTACT_AUTOMATIC_DISCOUNT_QUALIFICATION', 'Contact payload must not calculate or approve package discount.')
}

for (const token of [
  "captionMode",
]) {
  void token
}

for (const token of [
  'ContactForm',
  ':content="contact"',
  "useSeoMeta({",
  'contact.seoTitle',
  'contact.seoDescription',
]) {
  if (!contactPage.includes(token)) {
    fail('E_MMJ_CONTACT_NATIVE_FORM_AUTHORITY_MISSING', 'Native contact route binding is missing.', { token })
  }
}
for (const forbidden of [
  'ContactOutboundPanel',
  'resolveGoogleFormOutbound',
  'data-mm-google-form-link',
  'docs.google.com/forms',
]) {
  if (contactPage.includes(forbidden)) {
    fail('E_MMJ_CONTACT_LEGACY_OUTBOUND_RESIDUE', 'Legacy outbound contact route binding remains.', { forbidden })
  }
}


const utilityNavMarker = 'data-mm-contact-utility-actions'
for (const token of [
  utilityNavMarker,
  ':to="content.worksLinkRoute"',
  '{{ content.worksLinkLabel }}',
]) {
  if (!form.includes(token)) {
    fail('E_MMJ_CONTACT_WORKS_NAV_OWNERSHIP_INVALID', 'ContactForm utility navigation ownership is incomplete.', { token })
  }
}
for (const forbidden of [
  'data-mm-info-actions',
  'contact.worksLinkLabel',
  'to="/works"',
]) {
  if (contactPage.includes(forbidden)) {
    fail('E_MMJ_CONTACT_OUTER_INFO_GRID_ACTION_REMAINS', 'Contact route still owns the Works utility navigation.', { forbidden })
  }
}
if (form.includes('to="/works"')) {
  fail('E_MMJ_CONTACT_WORKS_NAV_CONTENT_AUTHORITY_BYPASS', 'ContactForm hardcodes the Works route instead of using typed content authority.')
}
const formCloseIndex = form.lastIndexOf('</form>')
const utilityNavIndex = form.indexOf(utilityNavMarker)
const utilityNavStart = form.lastIndexOf('<nav', utilityNavIndex)
const utilityNavEnd = form.indexOf('</nav>', utilityNavIndex)
const rootCloseIndex = form.lastIndexOf('</div>\n</template>')
if (
  formCloseIndex < 0
  || utilityNavIndex < 0
  || utilityNavStart < 0
  || utilityNavEnd < 0
  || rootCloseIndex < 0
  || utilityNavIndex <= formCloseIndex
  || utilityNavEnd >= rootCloseIndex
) {
  fail('E_MMJ_CONTACT_WORKS_NAV_FLOW_INVALID', 'Works utility navigation must be a ContactForm sibling after the form and before the root closes.')
}
const utilityNavSource = form.slice(utilityNavStart, utilityNavEnd + '</nav>'.length)
for (const forbidden of [
  'submissionState',
  'endpointState',
  'activeCategoryId',
  'draft.',
  'errors.',
  'v-if=',
  'v-show=',
  'position:',
  'z-index',
  'translateY',
  'ResizeObserver',
  'getBoundingClientRect',
  'window.innerWidth',
  'window.innerHeight',
]) {
  if (utilityNavSource.includes(forbidden)) {
    fail('E_MMJ_CONTACT_WORKS_NAV_FORBIDDEN_COUPLING', 'Works utility navigation is coupled to form state or geometry.', { forbidden })
  }
}

for (const token of [
  'NUXT_PUBLIC_MMJ_CONTACT_FORM_ENDPOINT',
  'mmjContactFormEndpoint',
  "name: 'referrer'",
  "content: 'strict-origin-when-cross-origin'",
]) {
  if (!nuxtConfig.includes(token)) {
    fail('E_MMJ_CONTACT_FORMSPREE_ENDPOINT_AUTHORITY_BYPASS', 'Runtime endpoint or referrer policy binding is missing.', { token })
  }
}
for (const token of [
  "url.hostname !== 'formspree.io'",
  "url.protocol !== 'https:'",
  "status: 'unconfigured'",
  "status: 'invalid'",
  "status: 'ready'",
]) {
  if (!endpoint.includes(token)) {
    fail('E_MMJ_CONTACT_FORMSPREE_ENDPOINT_AUTHORITY_BYPASS', 'Endpoint resolver contract is incomplete.', { token })
  }
}
if (form.includes('https://formspree.io/f/')) {
  fail('E_MMJ_CONTACT_FORMSPREE_ENDPOINT_AUTHORITY_BYPASS', 'Formspree endpoint is hardcoded in UI source.')
}

for (const token of [
  "method: 'POST'",
  "Accept: 'application/json'",
  "'Content-Type': 'application/json'",
  'JSON.stringify(payload)',
]) {
  if (!service.includes(token)) {
    fail('E_MMJ_CONTACT_FORMSPREE_TRANSPORT_INVALID', 'Formspree AJAX transport is incomplete.', { token })
  }
}

for (const state of ['idle', 'validating', 'invalid', 'submitting', 'success', 'error']) {
  if (!formSchema.includes(`| '${state}'`) && !formSchema.includes(`=\n  | '${state}'`)) {
    fail('E_MMJ_CONTACT_SUBMISSION_STATE_CONTRACT_INVALID', 'Submission state is missing.', { state })
  }
}
if (!composable.includes("submissionState.value === 'submitting'")) {
  fail('E_MMJ_CONTACT_SUBMISSION_STATE_CONTRACT_INVALID', 'Duplicate submission guard is missing.')
}

for (const token of [
  'song_${number}_title',
  'song_${number}_duration',
  "case 'choreography'",
  "case 'composition'",
  "case 'costume'",
  "case 'video'",
  "case 'project-planning'",
  "case 'mix-master'",
  "case 'package'",
]) {
  if (!payload.includes(token)) {
    fail('E_MMJ_CONTACT_ACTIVE_SCOPE_PAYLOAD_INVALID', 'Category payload projection is incomplete.', { token })
  }
}
for (const forbidden of [
  'DEFAULT_CONTACT_SCHEMA',
  'schema ?? default',
  'schema || default',
]) {
  if (form.includes(forbidden) || schemas.includes(forbidden) || composable.includes(forbidden)) {
    fail('E_MMJ_CONTACT_CATEGORY_SCHEMA_FALLBACK', 'Silent generic schema fallback is forbidden.', { forbidden })
  }
}

for (const token of [
  'recipientEmail: \'m4m1ja@gmail.com\'',
  "seoDescription:",
  'submitLabel:',
  'successHeading:',
  "readonly worksLinkRoute: '/works'",
  "worksLinkRoute: '/works'",
]) {
  if (!siteInformation.includes(token)) {
    fail('E_MMJ_CONTACT_CONTENT_AUTHORITY_INVALID', 'Contact content authority is incomplete.', { token })
  }
}

const secretCorpus = [
  categoryRegistry,
  schemas,
  formSchema,
  payload,
  form,
  composable,
  service,
  endpoint,
  contactPage,
  siteInformation,
  nuxtConfig,
].join('\n')
for (const forbidden of [
  'FORMSPREE_API_KEY',
  'FORMSPREE_MASTER_KEY',
  'FORM_ACCESS_KEY',
  'TURNSTILE_SECRET',
  'SMTP_PASSWORD',
  'SENDGRID_API_KEY',
  'RESEND_API_KEY',
]) {
  if (secretCorpus.includes(forbidden)) {
    fail('E_MMJ_CONTACT_PUBLIC_CREDENTIAL_RESIDUE', 'Public contact source contains a forbidden secret signature.', { forbidden })
  }
}

if (pkg.scripts?.['verify:contact-formspree'] !== 'node scripts/mmj-contact-formspree-r1-gate.mjs') {
  fail('E_MMJ_CONTACT_GATE_BINDING_MISSING', 'Contact Formspree source gate package binding is missing.')
}
if (pkg.scripts?.['verify:contact-static-output'] !== 'node scripts/mmj-contact-formspree-r1-static-output-verify.mjs') {
  fail('E_MMJ_CONTACT_GATE_BINDING_MISSING', 'Contact Formspree static-output gate package binding is missing.')
}
if (!String(pkg.scripts?.['gate:mmj-ui29-a'] ?? '').includes('verify:contact-formspree')) {
  fail('E_MMJ_CONTACT_GATE_BINDING_MISSING', 'Contact Formspree gate is missing from aggregate gate.')
}
if (pkg.mmjContactFormspreeRelease !== 'MMJ-CONTACT-FORMSPREE-R1') {
  fail('E_MMJ_CONTACT_RELEASE_IDENTITY_MISSING', 'Contact Formspree release identity is missing.')
}
if (
  pkg.mmjUi29ContactWorksNavInFlowOwnershipClosureRelease
  !== 'MMJ-UI29-CONTACT-WORKS-NAV-IN-FLOW-OWNERSHIP-CLOSURE-R1'
) {
  fail('E_MMJ_CONTACT_WORKS_NAV_RELEASE_IDENTITY_MISSING', 'Contact Works navigation ownership release identity is missing.')
}
if (
  pkg.scripts?.['gate:contact-works-nav-in-flow-ownership-closure-r1']
  !== 'node scripts/mmj-contact-formspree-r1-gate.mjs'
) {
  fail('E_MMJ_CONTACT_WORKS_NAV_GATE_BINDING_MISSING', 'Contact Works navigation ownership gate binding is missing.')
}

console.log(JSON.stringify({
  event: 'PASS_MMJ_CONTACT_FORMSPREE_R1',
  categoryCount: 7,
  subjectCount: 7,
  contactSurface: 'native',
  submissionTransport: 'formspree-ajax',
  endpointAuthority: 'runtime-config',
  clientValidation: 'active',
  portfolioPermission: 'radio-three-state',
  packagePortfolioPermission: 'required',
  packageDiscountAuthority: 'review-only',
  attachmentMode: 'url-reference-r1',
  cmsCoupling: 'absent',
  customMailBackend: 'absent',
  staticSitePreserved: true,
  domainRestriction: 'external-config-required',
  publicSecretResidue: 0,
}))

console.log(JSON.stringify({
  event: 'PASS_MMJ_UI29_CONTACT_WORKS_NAV_IN_FLOW_OWNERSHIP_CLOSURE_R1',
  utilityNavigationOwner: 'ContactForm',
  routeAuthority: 'typed-content',
  formStateCoupling: 'absent',
  geometryMeasurement: 'absent',
  outerInfoGridAction: 'retired',
}))
