import { readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const file = resolve(root, '.output', 'public', 'contact', 'index.html')

function fail(code, message, details = undefined) {
  const error = new Error(message)
  error.name = code
  error.code = code
  error.details = details
  throw error
}

try {
  await stat(file)
} catch {
  fail('E_MMJ_CONTACT_PRERENDER_MISSING', 'Contact prerender output is missing.')
}

const html = await readFile(file, 'utf8')

function decodeHtml(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/&#x([a-f0-9]+);/gi, (_, number) => String.fromCodePoint(Number.parseInt(number, 16)))
}

function attributes(tag) {
  const output = {}
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    output[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? '')
  }
  return output
}

function headValue(selector, key = 'content') {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = attributes(tag)
    if (selector(attrs)) return attrs[key] ?? null
  }
  return null
}

const title = decodeHtml(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '')
const expectedSeo = {
  title: '프로젝트 문의 | 매미: 著',
  description: '협업과 프로젝트 문의를 위한 안내 및 문의 양식을 확인합니다.',
  robots: 'index,follow',
  referrer: 'strict-origin-when-cross-origin',
}
const actualSeo = {
  title,
  description: headValue(attrs => attrs.name === 'description'),
  robots: headValue(attrs => attrs.name === 'robots'),
  referrer: headValue(attrs => attrs.name === 'referrer'),
}
for (const key of Object.keys(expectedSeo)) {
  if (actualSeo[key] !== expectedSeo[key]) {
    fail(
      'E_MMJ_CONTACT_PRERENDER_SEO_MISMATCH',
      'Contact prerender metadata differs from source authority.',
      { key, actual: actualSeo[key], expected: expectedSeo[key] },
    )
  }
}

for (const signature of [
  'data-mm-contact-section',
  'data-mm-contact-form',
  'data-mm-contact-category-selector',
  '<form',
  'm4m1ja@gmail.com',
]) {
  if (!html.includes(signature)) {
    fail(
      'E_MMJ_CONTACT_PRERENDER_NATIVE_FORM_MISSING',
      'Native contact form prerender signature is missing.',
      { signature },
    )
  }
}

const text = decodeHtml(
  html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
).replace(/\s+/g, ' ').trim()
for (const label of [
  '안무',
  '작곡',
  '의상',
  '영상',
  '프로젝트 기획',
  '믹싱&마스터링',
  '패키지',
]) {
  if (!text.includes(label)) {
    fail(
      'E_MMJ_CONTACT_PRERENDER_CATEGORY_MISSING',
      'Canonical contact category is missing from prerender.',
      { label },
    )
  }
}

for (const forbidden of [
  'data-mm-contact-outbound',
  'data-mm-google-form-link',
  'data-mm-google-form-unavailable',
  'docs.google.com/forms',
  'Google Form에서 문의하기',
]) {
  if (html.includes(forbidden)) {
    fail(
      'E_MMJ_CONTACT_LEGACY_OUTBOUND_PRERENDER_RESIDUE',
      'Legacy Google Form outbound residue remains in contact prerender.',
      { forbidden },
    )
  }
}

console.log(JSON.stringify({
  event: 'PASS_MMJ_CONTACT_FORMSPREE_R1_STATIC_OUTPUT',
  route: '/contact',
  seoParity: 'pass',
  categoryCount: 7,
  nativeContactForm: 'present',
  legacyGoogleFormProjection: 'absent',
  referrerPolicy: 'strict-origin-when-cross-origin',
}))
