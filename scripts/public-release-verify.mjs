import { resolve } from 'node:path'

import {
  verifyGeneratedArtifactSet,
} from './lib/mmj-ui29-public-contract.mjs'
import {
  verifyCommissionGeneratedArtifactSet,
} from './lib/mmj-ui29-commission-contract.mjs'

const root = process.cwd()
const portfolio = await verifyGeneratedArtifactSet(resolve(root, 'generated'), root)
const commission = await verifyCommissionGeneratedArtifactSet(resolve(root, 'generated'), root)

if (portfolio.releaseId !== commission.release.releaseId) {
  throw new Error('E_MMJ_UI29_PUBLIC_RELEASE_IDENTITY_MISMATCH: Portfolio and commission release ids differ.')
}

console.log(JSON.stringify({
  event: 'PASS_MMJ_UI29_A_PUBLIC_RELEASE',
  releaseId: portfolio.releaseId,
  snapshotDigest: portfolio.snapshotDigest,
  routesDigest: portfolio.routesFileDigest,
  handoffReceiptDigest: portfolio.handoffReceiptDigest,
  commissionSnapshotDigest: commission.snapshotDigest,
  commissionContentDigest: commission.contentDigest,
  commissionHandoffReceiptDigest: commission.handoffReceiptDigest,
  producerRevision: portfolio.producerRevision,
  projectCount: portfolio.projectCount,
  assetCount: portfolio.assetCount,
}))
