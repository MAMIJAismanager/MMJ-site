import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { readPublicConvergenceEnvironment } from './lib/mmj-ui29-public-convergence.mjs'

const input = readPublicConvergenceEnvironment(process.env)
const manifest = {
  schemaVersion: 1,
  contract: 'mmj-ui29-public-convergence-manifest-v1',
  convergenceKey: input.convergenceKey,
  convergenceRevision: input.convergenceRevision,
  convergenceDigest: input.convergenceDigest,
  source: input.target.source,
  portfolio: input.target.portfolio,
  commission: input.target.commission,
  issuedAt: input.issuedAt,
}
await mkdir(resolve('generated'), { recursive: true })
await writeFile(resolve('generated/public-convergence.manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ event: 'PASS_MMJ_PUBLIC_CONVERGENCE_PROVENANCE_SEALED', convergenceKey: input.convergenceKey, convergenceDigest: input.convergenceDigest }))
