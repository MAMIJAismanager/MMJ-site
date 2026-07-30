import { resolve } from 'node:path'
import { verifyCommissionGeneratedArtifactSet } from './lib/mmj-ui29-commission-contract.mjs'
const root = process.cwd()
const result = await verifyCommissionGeneratedArtifactSet(resolve(root, 'generated'), root)
console.log(JSON.stringify({
  event: 'PASS_MMJ_UI29_COMMISSION_GUIDE_HANDOFF_VERIFIED',
  publicationVersionId: result.receipt.publicationVersionId,
  snapshotDigest: result.snapshotDigest,
  contentDigest: result.contentDigest,
  handoffReceiptDigest: result.handoffReceiptDigest,
  sourceWorkbookRevision: result.receipt.sourceWorkbookRevision,
  publicationHeadRevision: result.receipt.publicationHeadRevision,
}))
