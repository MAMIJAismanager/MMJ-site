import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const outputRoot = resolve(process.argv[2] ?? '.output/public')
const rawRevision = String(process.env.MMJ_PUBLIC_RELEASE_REVISION ?? '').trim()
const revision = /^[a-f0-9]{40}$/.test(rawRevision)
  ? rawRevision
  : 'development'

await mkdir(outputRoot, { recursive: true })
await writeFile(
  resolve(outputRoot, 'mmj-release.json'),
  `${JSON.stringify({ schemaVersion: 1, revision })}\n`,
  'utf8',
)

console.log(`MMJ public release manifest emitted: ${revision}`)
