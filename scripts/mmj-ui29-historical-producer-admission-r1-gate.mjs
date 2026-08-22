import { readFile } from 'node:fs/promises'

const contractPath = new URL('./lib/mmj-ui29-public-contract.mjs', import.meta.url)
const source = await readFile(contractPath, 'utf8')

const required = [
  "'0.7.20-mmj-portfolio-legacy-optional-year-r14b'",
  "'0.7.21-mmj-immediate-publication-fast-lane-r14c'",
  'ADMITTED_PRODUCER_RELEASES',
  'ADMITTED_PRODUCER_RELEASE_SET',
  'admitProducerRelease',
  'producerRelease: input.receipt.producerRelease',
  'actualProducerRelease',
  'admittedProducerReleases',
]
for (const token of required) {
  if (!source.includes(token)) throw new Error(`R1_REQUIRED_SOURCE_TOKEN_MISSING: ${token}`)
}

const forbidden = [
  "producerRelease.startsWith('0.7.')",
  'producerRelease.startsWith("0.7.")',
  '/^0\\.7\\./',
  'producerRelease: PRODUCER_RELEASE',
]
for (const token of forbidden) {
  if (source.includes(token)) throw new Error(`R1_FORBIDDEN_SOURCE_PATTERN_PRESENT: ${token}`)
}

console.log(JSON.stringify({
  event: 'PASS_MMJ_PUBLIC_HISTORICAL_PRODUCER_ADMISSION_AND_EXACT_INPUT_PROVENANCE_R1_STATIC_GATE',
  admittedProducerCount: 2,
  wildcardAdmission: false,
  currentReleaseOverwrite: false,
}))
