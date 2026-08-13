import { inspectFailureReceiptEvidence } from './lib/mmj-ui29-failure-receipt-evidence-authority.mjs'

try {
  const evidence = inspectFailureReceiptEvidence(process.env)
  console.log(JSON.stringify({
    event: 'PASS_MMJ_UI29_FAILURE_RECEIPT_EVIDENCE_AUTHORITY_R1',
    ...evidence,
  }))
} catch (error) {
  console.error(JSON.stringify({
    schemaVersion: 1,
    error: error?.code || 'E_MMJ_UI29_FAILURE_RECEIPT_EVIDENCE_INVALID',
    message: String(error?.message || error || 'Failure receipt evidence verification failed.'),
    details: error?.details ?? null,
  }))
  process.exit(1)
}
