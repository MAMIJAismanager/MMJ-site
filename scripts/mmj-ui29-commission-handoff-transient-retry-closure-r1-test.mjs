import assert from 'node:assert/strict'

import { CommissionContractError } from './lib/mmj-ui29-commission-contract.mjs'
import {
  classifyCommissionHandoffRetry,
  runCommissionHandoffTransactionWithRetry,
} from './lib/mmj-ui29-commission-handoff-retry-authority.mjs'

function contractError(code, stage, details = {}) {
  return new CommissionContractError(code, `${stage} fixture failure`, { stage, ...details })
}

for (const stage of ['head', 'receipt', 'snapshot', 'head-repeat']) {
  let calls = 0
  const logs = []
  const result = await runCommissionHandoffTransactionWithRetry({
    deadline: 100_000,
    now: () => 1_000,
    sleep: async () => undefined,
    logger: receipt => logs.push(receipt),
    transaction: async () => {
      calls += 1
      if (calls === 1) {
        throw contractError('E_MMJ_COMMISSION_HANDOFF_TIMEOUT', stage, {
          transportKind: 'timeout',
          originalErrorName: 'AbortError',
          originalErrorMessage: `${stage} request timed out`,
        })
      }
      return { stage, calls }
    },
  })
  assert.equal(calls, 2, `${stage} timeout must restart the whole transaction once`)
  assert.deepEqual(result, { stage, calls: 2 })
  const failure = logs.find(entry => entry.event === 'MMJ_COMMISSION_HANDOFF_ATTEMPT_FAILED')
  assert.equal(failure?.attempt, 1)
  assert.equal(failure?.stage, stage)
  assert.equal(failure?.retryClass, 'transient-transport')
  assert.equal(failure?.willRetry, true)
}

for (const code of ['E_MMJ_COMMISSION_HEAD_UNSTABLE', 'E_MMJ_COMMISSION_SNAPSHOT_HEADER_MISMATCH']) {
  assert.deepEqual(classifyCommissionHandoffRetry(contractError(code, 'head-repeat')), {
    retryable: true,
    retryClass: 'consistency-retry',
  })
}

for (const code of [
  'E_MMJ_COMMISSION_SNAPSHOT_DIGEST_MISMATCH',
  'E_MMJ_COMMISSION_HANDOFF_INVALID',
  'E_MMJ_COMMISSION_HANDOFF_FETCH_FAILED',
  'E_MMJ_COMMISSION_HANDOFF_RESPONSE_TOO_LARGE',
  'E_MMJ_COMMISSION_GENERATED_COMMIT_FAILED',
]) {
  const decision = classifyCommissionHandoffRetry(contractError(code, 'snapshot'))
  assert.equal(decision.retryable, false, `${code} must remain fail-fast`)
}

assert.equal(classifyCommissionHandoffRetry(contractError(
  'E_MMJ_COMMISSION_HANDOFF_TIMEOUT',
  'head',
  { transportKind: 'network', originalCauseCode: 'ECONNRESET' },
)).retryable, true)

assert.equal(classifyCommissionHandoffRetry(contractError(
  'E_MMJ_COMMISSION_HANDOFF_TIMEOUT',
  'head',
  { transportKind: 'network', originalCauseCode: 'UNKNOWN_NETWORK_ERROR' },
)).retryable, false)

assert.equal(classifyCommissionHandoffRetry({
  name: 'Error',
  code: 'E_MMJ_COMMISSION_HEAD_UNSTABLE',
  details: { stage: 'head-repeat' },
}).retryable, false, 'non-contract errors must not enter the Commission retry authority')

let boundedCalls = 0
await assert.rejects(
  runCommissionHandoffTransactionWithRetry({
    deadline: 100_000,
    now: () => 1_000,
    sleep: async () => undefined,
    logger: () => undefined,
    transaction: async () => {
      boundedCalls += 1
      throw contractError('E_MMJ_COMMISSION_HANDOFF_TIMEOUT', 'head', { transportKind: 'timeout' })
    },
  }),
  error => error?.code === 'E_MMJ_COMMISSION_HANDOFF_TIMEOUT',
)
assert.equal(boundedCalls, 3, 'transient retry must be bounded to three attempts')

let deterministicCalls = 0
await assert.rejects(
  runCommissionHandoffTransactionWithRetry({
    deadline: 100_000,
    now: () => 1_000,
    sleep: async () => undefined,
    logger: () => undefined,
    transaction: async () => {
      deterministicCalls += 1
      throw contractError('E_MMJ_COMMISSION_SNAPSHOT_DIGEST_MISMATCH', 'snapshot')
    },
  }),
  error => error?.code === 'E_MMJ_COMMISSION_SNAPSHOT_DIGEST_MISMATCH',
)
assert.equal(deterministicCalls, 1, 'deterministic contract failure must not retry')

let deadlineCalls = 0
const deadlineLogs = []
await assert.rejects(
  runCommissionHandoffTransactionWithRetry({
    deadline: 1_100,
    now: () => 1_000,
    sleep: async () => undefined,
    logger: receipt => deadlineLogs.push(receipt),
    transaction: async () => {
      deadlineCalls += 1
      throw contractError('E_MMJ_COMMISSION_HANDOFF_TIMEOUT', 'head', { transportKind: 'timeout' })
    },
  }),
  error => error?.code === 'E_MMJ_COMMISSION_HANDOFF_TIMEOUT',
)
assert.equal(deadlineCalls, 1, 'retry must not sleep past the global deadline budget')
assert.equal(deadlineLogs.find(entry => entry.event === 'MMJ_COMMISSION_HANDOFF_ATTEMPT_FAILED')?.willRetry, false)

console.log(JSON.stringify({
  event: 'PASS_MMJ_UI29_COMMISSION_HANDOFF_TRANSIENT_RETRY_CLOSURE_R1_TEST',
  timeoutStages: ['head', 'receipt', 'snapshot', 'head-repeat'],
  wholeTransactionRestart: true,
  existingConsistencyRetryPreserved: true,
  deterministicContractFailFast: true,
  boundedAttempts: 3,
  globalDeadlinePreserved: true,
  unknownNetworkFailureFailClosed: true,
}))
