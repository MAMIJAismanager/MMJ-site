import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import {
  PUBLIC_RELEASE_RECEIPT_PATH,
} from './lib/mmj-ui29-public-release-receipt-policy.mjs'

const root = process.cwd()
const source = resolve(root, 'generated/public-release.manifest.json')
const target = resolve(root, PUBLIC_RELEASE_RECEIPT_PATH)
const targetDirectory = dirname(target)
const manifest = JSON.parse(await readFile(source, 'utf8'))
const portfolioManifest = manifest.schemaVersion === 2 ? manifest.portfolio : {
  snapshotDigest: manifest.snapshotDigest,
  collectionVersionId: manifest.portfolioCollectionVersionId,
  handoffReceiptId: manifest.portfolioHandoffReceiptId,
  projectCount: manifest.projectCount,
  assetCount: manifest.assetCount,
}
const expected = process.env.MMJ_EXPECTED_SNAPSHOT_DIGEST || ''
if (!/^[0-9a-f]{64}$/.test(expected) || portfolioManifest.snapshotDigest !== expected) {
  throw new Error('E_MMJ_UI29_PUBLIC_RELEASE_RECEIPT_DIGEST_MISMATCH')
}
const receipt = {
  schemaVersion: 1,
  releaseId: manifest.releaseId,
  snapshotDigest: portfolioManifest.snapshotDigest,
  collectionVersionId: portfolioManifest.collectionVersionId,
  handoffReceiptId: portfolioManifest.handoffReceiptId,
  projectCount: portfolioManifest.projectCount,
  assetCount: portfolioManifest.assetCount,
  generatedAt: manifest.generatedAt,
}
await mkdir(targetDirectory, { recursive: true })
await writeFile(target, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: 'utf8' })
console.log(JSON.stringify({ event: 'PASS_MMJ_UI29_B_PUBLIC_RELEASE_RECEIPT_EMITTED', target: PUBLIC_RELEASE_RECEIPT_PATH, snapshotDigest: expected }))
