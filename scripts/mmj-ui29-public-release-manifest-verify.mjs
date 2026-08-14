import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const outputRoot = resolve(process.argv[2] ?? '.output/public')
const manifestPath = resolve(outputRoot, 'mmj-release.json')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const expected = String(process.env.MMJ_PUBLIC_RELEASE_REVISION ?? '').trim()

assert.equal(manifest.schemaVersion, 1, 'release manifest schema drift')
assert.equal(typeof manifest.revision, 'string', 'release manifest revision missing')

if (/^[a-f0-9]{40}$/.test(expected)) {
  assert.equal(
    manifest.revision,
    expected,
    'release manifest revision differs from MMJ_PUBLIC_RELEASE_REVISION',
  )
} else {
  assert.equal(
    manifest.revision,
    'development',
    'non-production release manifest must use development sentinel',
  )
}

console.log('PASS_MMJ_PUBLIC_RELEASE_MANIFEST_VERIFY')
