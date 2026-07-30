import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  validateCommissionDispatchInput,
} from './lib/mmj-ui29-commission-contract.mjs'

const mode = process.argv[2] || 'preflight'
const input = validateCommissionDispatchInput({
  schemaVersion: Number(process.env.MMJ_COMMISSION_SCHEMA_VERSION ?? 1),
  contentKind: process.env.MMJ_COMMISSION_CONTENT_KIND,
  deliveryKey: process.env.MMJ_COMMISSION_DELIVERY_KEY,
  guideId: process.env.MMJ_COMMISSION_GUIDE_ID,
  publicationVersionId: process.env.MMJ_COMMISSION_PUBLICATION_VERSION_ID,
  snapshotDigest: process.env.MMJ_COMMISSION_EXPECTED_SNAPSHOT_DIGEST,
  handoffReceiptId: process.env.MMJ_COMMISSION_HANDOFF_RECEIPT_ID,
  sourceWorkbookRevision: Number(process.env.MMJ_COMMISSION_SOURCE_WORKBOOK_REVISION),
  publicationHeadRevision: Number(process.env.MMJ_COMMISSION_PUBLICATION_HEAD_REVISION),
  issuedAt: process.env.MMJ_COMMISSION_ISSUED_AT,
})

function fail(code, message, details = undefined) {
  console.error(JSON.stringify({ schemaVersion: 1, error: code, message, details }))
  process.exit(1)
}

function origin() {
  const raw = process.env.MMJ_COMMISSION_GUIDE_HANDOFF_ORIGIN ?? process.env.MMJ_PORTFOLIO_HANDOFF_ORIGIN
  let url
  try { url = new URL(raw) } catch { fail('E_MMJ_COMMISSION_HANDOFF_ORIGIN_INVALID', 'Commission handoff origin is invalid.') }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || (url.pathname !== '' && url.pathname !== '/')) {
    fail('E_MMJ_COMMISSION_HANDOFF_ORIGIN_INVALID', 'Commission handoff origin must be an HTTPS origin.')
  }
  return url.origin
}

async function preflight() {
  const response = await fetch(`${origin()}/api/v1/public/commission-guide/dispatch-authority`, {
    headers: { accept: 'application/json', 'cache-control': 'no-cache' },
    redirect: 'error',
    cache: 'no-store',
  })
  if (!response.ok) fail('E_MMJ_COMMISSION_DISPATCH_HEAD_FETCH_FAILED', 'Commission dispatch authority request failed.', { status: response.status })
  const authority = await response.json()
  if (authority.contract !== 'mmj-commission-guide-dispatch-authority-v1') fail('E_MMJ_COMMISSION_DISPATCH_AUTHORITY_INVALID', 'Commission dispatch authority contract is invalid.')
  const mismatches = []
  for (const field of ['deliveryKey', 'guideId', 'publicationVersionId', 'snapshotDigest', 'handoffReceiptId', 'sourceWorkbookRevision', 'publicationHeadRevision', 'issuedAt']) {
    if (String(authority[field]) !== String(input[field])) mismatches.push({ field, expected: input[field], actual: authority[field] })
  }
  if (mismatches.length) fail('E_MMJ_COMMISSION_DISPATCH_HEAD_MISMATCH', 'Current commission publication does not match dispatch payload.', { mismatches })
  console.log(JSON.stringify({ event: 'PASS_MMJ_UI29_COMMISSION_DISPATCH_PREFLIGHT', ...input }))
}

async function postAdopt() {
  const root = process.cwd()
  const [snapshotBytes, receiptBytes, manifestBytes] = await Promise.all([
    readFile(resolve(root, 'generated/commission-guide.snapshot.json')),
    readFile(resolve(root, 'generated/commission-guide.handoff.json')),
    readFile(resolve(root, 'generated/public-release.manifest.json')),
  ])
  const snapshot = JSON.parse(snapshotBytes.toString('utf8'))
  const receipt = JSON.parse(receiptBytes.toString('utf8'))
  const manifest = JSON.parse(manifestBytes.toString('utf8'))
  const mismatches = []
  const checks = [
    ['snapshot.publicationVersionId', snapshot.publicationVersionId, input.publicationVersionId],
    ['receipt.receiptId', receipt.receiptId, input.handoffReceiptId],
    ['receipt.snapshotDigest', receipt.snapshotDigest, input.snapshotDigest],
    ['receipt.sourceWorkbookRevision', receipt.sourceWorkbookRevision, input.sourceWorkbookRevision],
    ['receipt.publicationHeadRevision', receipt.publicationHeadRevision, input.publicationHeadRevision],
    ['manifest.commissionGuide.publicationVersionId', manifest.commissionGuide?.publicationVersionId, input.publicationVersionId],
    ['manifest.commissionGuide.snapshotDigest', manifest.commissionGuide?.snapshotDigest, input.snapshotDigest],
  ]
  for (const [field, actual, expected] of checks) if (String(actual) !== String(expected)) mismatches.push({ field, expected, actual })
  if (mismatches.length) fail('E_MMJ_COMMISSION_DISPATCH_ADOPTION_MISMATCH', 'Adopted commission artifacts do not match dispatch payload.', { mismatches })
  console.log(JSON.stringify({ event: 'PASS_MMJ_UI29_COMMISSION_DISPATCH_ADOPTION_VERIFIED', ...input, releaseId: manifest.releaseId }))
}

if (mode === 'preflight') await preflight()
else if (mode === 'post-adopt') await postAdopt()
else fail('E_MMJ_COMMISSION_DISPATCH_MODE_INVALID', 'Expected preflight or post-adopt mode.')
