import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const source = resolve(root, 'generated/public-release.manifest.json')
const targetDirectory = resolve(root, 'public/.well-known')
const target = resolve(targetDirectory, 'mmj-public-release.json')
const manifest = JSON.parse(await readFile(source, 'utf8'))
const expected = process.env.MMJ_EXPECTED_SNAPSHOT_DIGEST || ''
if (!/^[0-9a-f]{64}$/.test(expected) || manifest.snapshotDigest !== expected) {
  throw new Error('E_MMJ_UI29_PUBLIC_RELEASE_RECEIPT_DIGEST_MISMATCH')
}
const receipt = {
  schemaVersion: 1,
  releaseId: manifest.releaseId,
  snapshotDigest: manifest.snapshotDigest,
  collectionVersionId: manifest.portfolioCollectionVersionId,
  handoffReceiptId: manifest.portfolioHandoffReceiptId,
  projectCount: manifest.projectCount,
  assetCount: manifest.assetCount,
  generatedAt: manifest.generatedAt,
}
await mkdir(targetDirectory, { recursive: true })
await writeFile(target, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: 'utf8' })
console.log(JSON.stringify({ event: 'PASS_MMJ_UI29_B_PUBLIC_RELEASE_RECEIPT_EMITTED', target: 'public/.well-known/mmj-public-release.json', snapshotDigest: expected }))
