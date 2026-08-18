import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  assertPublicConvergenceGeneration,
  readPublicConvergenceEnvironment,
} from './lib/mmj-ui29-public-convergence.mjs'

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
  console.log(JSON.stringify({ event: 'PASS_MMJ_PUBLIC_CONVERGENCE_PREFLIGHT', relation: generation.relation, convergenceKey: input.convergenceKey, convergenceDigest: input.convergenceDigest }))
} else if (mode === 'post-adopt') {
  await fetchGeneration()
  const [portfolioLock, commissionLock, convergenceManifest] = await Promise.all([
    readFile(resolve('generated/portfolio.build-input-lock.json'), 'utf8').then(JSON.parse),
    readFile(resolve('generated/commission-guide.build-input-lock.json'), 'utf8').then(JSON.parse),
    readFile(resolve('generated/public-convergence.manifest.json'), 'utf8').then(JSON.parse),
  ])
  const checks = [
    ['portfolio.deliveryKey', portfolioLock.deliveryKey, input.target.portfolio.deliveryKey],
    ['portfolio.generationDigest', portfolioLock.generationDigest, input.target.portfolio.generationDigest],
    ['commission.publicationVersionId', commissionLock.publicationVersionId, input.target.commission.publicationVersionId],
    ['commission.snapshotDigest', commissionLock.snapshotDigest, input.target.commission.snapshotDigest],
    ['commission.handoffReceiptId', commissionLock.handoffReceiptId, input.target.commission.handoffReceiptId],
    ['convergence.key', convergenceManifest.convergenceKey, input.convergenceKey],
    ['convergence.digest', convergenceManifest.convergenceDigest, input.convergenceDigest],
    ['source.commitSha', convergenceManifest.source?.commitSha, input.target.source.commitSha],
  ]
  const mismatches = checks.filter(([, actual, expected]) => String(actual) !== String(expected))
  if (mismatches.length) throw new Error(`E_MMJ_PUBLIC_CONVERGENCE_ADOPTION_MISMATCH:${JSON.stringify(mismatches)}`)
  console.log(JSON.stringify({ event: 'PASS_MMJ_PUBLIC_CONVERGENCE_ADOPTION_VERIFIED', convergenceKey: input.convergenceKey, convergenceDigest: input.convergenceDigest }))
} else {
  throw new Error('E_MMJ_PUBLIC_CONVERGENCE_VERIFY_MODE_INVALID')
}
