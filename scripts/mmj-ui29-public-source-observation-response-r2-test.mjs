import assert from 'node:assert/strict'
import { classifyPublicSourceObservationResponseR2 } from './lib/mmj-ui29-public-source-observation-response-r2.mjs'

const sha = '5'.repeat(40)
const newer = '6'.repeat(40)

const advanced = classifyPublicSourceObservationResponseR2({
  accepted: true,
  admission: 'advanced',
  sourceAuthority: { commitSha: sha },
  convergenceRefresh: { state: 'scheduled', sourceCommitSha: sha },
}, sha)
assert.equal(advanced.disposition, 'advanced')
assert.equal(advanced.event, 'PASS_MMJ_PUBLIC_SOURCE_OBSERVATION_ADVANCED')

const idempotent = classifyPublicSourceObservationResponseR2({
  accepted: true,
  admission: 'idempotent',
  sourceAuthority: { commitSha: sha },
  convergenceRefresh: { state: 'not-required', sourceCommitSha: sha },
}, sha)
assert.equal(idempotent.disposition, 'idempotent-current')
assert.equal(idempotent.event, 'PASS_MMJ_PUBLIC_SOURCE_OBSERVATION_ALREADY_CURRENT')

const historical = classifyPublicSourceObservationResponseR2({
  accepted: true,
  admission: 'historical',
  sourceAuthority: { commitSha: newer },
  convergenceRefresh: { state: 'not-required', sourceCommitSha: null },
}, sha)
assert.equal(historical.disposition, 'historical-superseded')
assert.equal(historical.event, 'PASS_MMJ_PUBLIC_SOURCE_OBSERVATION_SUPERSEDED')

assert.throws(() => classifyPublicSourceObservationResponseR2({
  accepted: true,
  admission: 'advanced',
  sourceAuthority: { commitSha: newer },
  convergenceRefresh: { state: 'scheduled', sourceCommitSha: newer },
}, sha), /ADVANCED_AUTHORITY_MISMATCH/)

assert.throws(() => classifyPublicSourceObservationResponseR2({
  accepted: true,
  admission: 'mystery',
  sourceAuthority: { commitSha: sha },
  convergenceRefresh: { state: 'scheduled', sourceCommitSha: sha },
}, sha), /DISPOSITION_INVALID/)

console.log('PASS_MMJ_PUBLIC_SOURCE_OBSERVATION_RESPONSE_R2_ADVANCED_TRUTH')
console.log('PASS_MMJ_PUBLIC_SOURCE_OBSERVATION_RESPONSE_R2_IDEMPOTENT_TRUTH')
console.log('PASS_MMJ_PUBLIC_SOURCE_OBSERVATION_RESPONSE_R2_HISTORICAL_TRUTH')
console.log('PASS_MMJ_PUBLIC_SOURCE_OBSERVATION_RESPONSE_R2_NO_HTTP_2XX_FALSE_PASS')
