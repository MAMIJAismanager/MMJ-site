import { resolve } from 'node:path'

import {
  verifyGeneratedArtifactSet,
} from './lib/mmj-ui29-public-contract.mjs'

const root = process.cwd()
const result = await verifyGeneratedArtifactSet(resolve(root, 'generated'), root)

console.log(JSON.stringify({
  event: 'PASS_MMJ_UI29_A_PORTFOLIO_HANDOFF_VERIFIED',
  releaseId: result.releaseId,
  snapshotDigest: result.snapshotDigest,
  handoffReceiptDigest: result.handoffReceiptDigest,
  projectCount: result.projectCount,
  assetCount: result.assetCount,
  routeCount: result.routeCount,
}))
