import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const snapshotPath = resolve(root, 'generated/portfolio.snapshot.json')
const routesPath = resolve(root, 'generated/portfolio.routes.json')
const manifestPath = resolve(root, 'generated/public-release.manifest.json')

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const readJson = async path => {
  const bytes = await readFile(path)
  return { bytes, value: JSON.parse(bytes.toString('utf8')) }
}

const [snapshot, routes, manifest] = await Promise.all([
  readJson(snapshotPath),
  readJson(routesPath),
  readJson(manifestPath),
])

const snapshotDigest = sha256(snapshot.bytes)
const routesDigest = sha256(routes.bytes)
const fail = message => {
  throw new Error(`FAIL_MMJ_05N_A_PUBLIC_RELEASE: ${message}`)
}

if (manifest.value?.schemaVersion !== 1) fail('manifest schemaVersion must equal 1.')
if (!/^rel_[a-f0-9]{26}$/.test(manifest.value?.releaseId ?? '')) fail('invalid releaseId.')
if (manifest.value?.snapshotDigest !== snapshotDigest) fail('snapshot digest mismatch.')
if (manifest.value?.routesDigest !== routesDigest) fail('routes digest mismatch.')
if (routes.value?.snapshotDigest !== snapshotDigest) fail('route manifest does not bind snapshot bytes.')
if (manifest.value?.projectCount !== snapshot.value?.projects?.length) fail('project count mismatch.')
if (manifest.value?.assetCount !== snapshot.value?.assets?.length) fail('asset count mismatch.')
if (manifest.value?.publicationCutoff !== snapshot.value?.publicationCutoff) fail('publication cutoff mismatch.')
if (!/^[a-f0-9]{64}$/.test(manifest.value?.producerRevision ?? '')) fail('producerRevision must be a source-tree SHA-256.')
if (!Number.isFinite(Date.parse(manifest.value?.generatedAt ?? ''))) fail('generatedAt must be ISO-8601.')

const forbiddenKey = /(spreadsheet|scriptid|sheetid|operator|audit|secret|hmac|tombstone|retention|diagnostic|workerorigin|accountid|bucketname|accesskey|privatekey)/i
const forbiddenString = /(\.r2\.cloudflarestorage\.com|sheets\.googleapis\.com|script\.google\.com|\/cms\/v1\/|MMJ_CMS_|MMJ_UPLOAD_)/i

function inspect(value, pointer = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspect(item, `${pointer}[${index}]`))
    return
  }
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string' && forbiddenString.test(value)) fail(`forbidden value at ${pointer}.`)
    return
  }
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKey.test(key)) fail(`forbidden key ${key} at ${pointer}.`)
    if (key === 'objectKey' && typeof child === 'string') {
      if (child.includes('..') || child.includes('?') || child.includes('#') || child.startsWith('/')) {
        fail(`unsafe objectKey at ${pointer}.${key}.`)
      }
    }
    inspect(child, `${pointer}.${key}`)
  }
}

inspect(snapshot.value)
inspect(routes.value)
inspect(manifest.value)

console.log(JSON.stringify({
  event: 'PASS_MMJ_05N_A_PUBLIC_RELEASE',
  releaseId: manifest.value.releaseId,
  snapshotDigest,
  routesDigest,
  projectCount: manifest.value.projectCount,
  assetCount: manifest.value.assetCount,
}))
