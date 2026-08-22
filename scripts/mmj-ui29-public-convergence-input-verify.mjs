import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  assertPublicConvergenceGeneration,
  canonicalJson,
  readPublicConvergenceEnvironment,
} from './lib/mmj-ui29-public-convergence.mjs'
import {
  reconstructAdoptedPublicConvergenceSnapshot,
  verifyCheckedOutSourceSnapshot,
} from './lib/mmj-ui29-public-convergence-exact-snapshot.mjs'

const mode = process.argv[2] || 'preflight'
const input = readPublicConvergenceEnvironment(process.env)
const origin = new URL(process.env.MMJ_PORTFOLIO_HANDOFF_ORIGIN || 'https://cms.mamajing.work').origin

async function fetchGeneration() {
  const response = await fetch(`${origin}/api/v1/public/public-convergence/generations/${encodeURIComponent(input.convergenceKey)}`, {
    headers: { accept: 'application/json', 'cache-control': 'no-cache' },
    redirect: 'error',
  })
  if (!response.ok) throw new Error(`E_MMJ_PUBLIC_CONVERGENCE_FETCH_FAILED:${response.status}`)
  return assertPublicConvergenceGeneration(await response.json(), input)
}

if (mode === 'preflight') {
  const generation = await fetchGeneration()
  verifyCheckedOutSourceSnapshot(input)
  console.log(JSON.stringify({ event: 'PASS_MMJ_PUBLIC_CONVERGENCE_PREFLIGHT', relation: generation.relation, convergenceKey: input.convergenceKey, snapshotDigest: input.snapshotDigest }))
} else if (mode === 'post-adopt') {
  const generation = await fetchGeneration()
  const reconstructed = await reconstructAdoptedPublicConvergenceSnapshot(input)
  const manifest = JSON.parse(await readFile(resolve('generated/public-convergence.manifest.json'), 'utf8'))
  if (manifest?.schemaVersion !== 2 || manifest?.contract !== 'mmj-ui29-public-convergence-manifest-v2') throw new Error('E_MMJ_PUBLIC_CONVERGENCE_MANIFEST_SNAPSHOT_MISMATCH:contract')
  if (manifest.convergenceKey !== input.convergenceKey || Number(manifest.convergenceRevision) !== input.convergenceRevision || manifest.convergenceDigest !== input.convergenceDigest) throw new Error('E_MMJ_PUBLIC_CONVERGENCE_MANIFEST_SNAPSHOT_MISMATCH:identity')
  if (canonicalJson(manifest.snapshot) !== canonicalJson(reconstructed.snapshot)) throw new Error('E_MMJ_PUBLIC_CONVERGENCE_MANIFEST_SNAPSHOT_MISMATCH:snapshot')
  if (canonicalJson(manifest.evidence) !== canonicalJson(reconstructed.evidence)) throw new Error('E_MMJ_PUBLIC_CONVERGENCE_MANIFEST_SNAPSHOT_MISMATCH:evidence')
  if (canonicalJson(generation.snapshot) !== canonicalJson(reconstructed.snapshot)) throw new Error('E_MMJ_PUBLIC_CONVERGENCE_ADOPTED_SNAPSHOT_MISMATCH:generation')
  console.log(JSON.stringify({ event: 'PASS_MMJ_PUBLIC_CONVERGENCE_ADOPTION_VERIFIED', convergenceKey: input.convergenceKey, snapshotDigest: input.snapshotDigest }))
} else {
  throw new Error('E_MMJ_PUBLIC_CONVERGENCE_VERIFY_MODE_INVALID')
}
