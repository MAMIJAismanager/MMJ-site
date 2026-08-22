import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { readPublicConvergenceEnvironment } from './lib/mmj-ui29-public-convergence.mjs'
import { reconstructAdoptedPublicConvergenceSnapshot } from './lib/mmj-ui29-public-convergence-exact-snapshot.mjs'

const input = readPublicConvergenceEnvironment(process.env)
const reconstructed = await reconstructAdoptedPublicConvergenceSnapshot(input)
const manifest = {
  schemaVersion: 2,
  contract: 'mmj-ui29-public-convergence-manifest-v2',
  convergenceKey: input.convergenceKey,
  convergenceRevision: input.convergenceRevision,
  convergenceDigest: input.convergenceDigest,
  snapshot: reconstructed.snapshot,
  evidence: reconstructed.evidence,
}
await mkdir(resolve('generated'), { recursive: true })
await writeFile(resolve('generated/public-convergence.manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ event: 'PASS_MMJ_PUBLIC_CONVERGENCE_EXACT_SNAPSHOT_SEALED', convergenceKey: input.convergenceKey, snapshotDigest: input.snapshotDigest }))
