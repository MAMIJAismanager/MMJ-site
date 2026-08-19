import { readFile } from 'node:fs/promises'

const contractPath = new URL('./lib/mmj-ui29-public-contract.mjs', import.meta.url)
const source = await readFile(contractPath, 'utf8')

const requiredExact = [
  "string(value.summary, `${pointer}.summary`, code, { max: 2000 })",
  "string(value.description, `${pointer}.description`, code, { max: 12000 })",
  "string(value.post.comment, `${pointer}.post.comment`, code, { max: 12000 })",
  "string(value.seo.description, `${pointer}.seo.description`, code, { max: 600 })",
  "string(value.title, `${pointer}.title`, code, { nonEmpty: true, max: 240 })",
  "string(value.seo.title, `${pointer}.seo.title`, code, { nonEmpty: true, max: 300 })",
]
for (const token of requiredExact) {
  if (!source.includes(token)) throw new Error(`R11_EMPTY_COMMENT_REQUIRED_SOURCE_TOKEN_MISSING: ${token}`)
}

const forbiddenExact = [
  "string(value.summary, `${pointer}.summary`, code, { nonEmpty: true, max: 2000 })",
  "string(value.description, `${pointer}.description`, code, { nonEmpty: true, max: 12000 })",
  "string(value.post.comment, `${pointer}.post.comment`, code, { nonEmpty: true, max: 12000 })",
  "string(value.seo.description, `${pointer}.seo.description`, code, { nonEmpty: true, max: 600 })",
  'summary || title',
  'summary ?? title',
  'description || title',
  'description ?? title',
  'post.comment || title',
  'seo.description || title',
  'No description',
  'N/A',
  '설명 없음',
]
for (const token of forbiddenExact) {
  if (source.includes(token)) throw new Error(`R11_EMPTY_COMMENT_FORBIDDEN_SOURCE_PATTERN_PRESENT: ${token}`)
}

console.log(JSON.stringify({
  event: 'PASS_MMJ_PUBLIC_R11_EMPTY_COMMENT_PROJECTION_PARITY_R1_STATIC_GATE',
  emptySummaryAdmission: true,
  emptyDescriptionAdmission: true,
  emptyPostCommentAdmission: true,
  emptySeoDescriptionAdmission: true,
  stringTypeAuthorityPreserved: true,
  nonEmptyTitleAuthorityPreserved: true,
  generatedFallback: false,
}))
