import assert from 'node:assert/strict'

import { Ui29Error } from './lib/mmj-ui29-public-contract.mjs'
import {
  classifyPortfolioHandoffRetry,
  portfolioRequestTimeoutMs,
  runPortfolioHandoffTransactionWithRetry,
} from './lib/mmj-ui29-portfolio-handoff-retry-authority.mjs'

function contractError(code, stage, details = {}) {
  return new Ui29Error(code, `${stage} fixture failure`, { stage, ...details })
}

for (const stage of ['head', 'receipt', 'snapshot', 'head-repeat']) {
  let calls = 0
  const logs = []
  const result = await runPortfolioHandoffTransactionWithRetry({
    deadline: 100_000,
    now: () => 1_000,
    sleep: async () => undefined,
    logger: receipt => logs.push(receipt),
    transaction: async () => {
      calls += 1
      if (calls === 1) {
        throw contractError('E_MMJ_UI29_HANDOFF_TIMEOUT', stage, {
          transportKind: 'timeout',
          originalErrorName: 'AbortError',
          originalErrorMessage: `https://cms.example.test/${stage} timed out`,
        })
      }
      return { stage, calls }
    },
  })
  assert.equal(calls, 2, `${stage} timeout must restart the whole transaction once`)
  assert.deepEqual(result, { stage, calls: 2 })
  const failure = logs.find(entry => entry.event === 'MMJ_PORTFOLIO_HANDOFF_ATTEMPT_FAILED')
  assert.equal(failure?.attempt, 1)
  assert.equal(failure?.stage, stage)
  assert.equal(failure?.retryClass, 'transient-timeout')
  assert.equal(failure?.willRetry, true)
  assert.equal(String(failure?.originalErrorMessage).includes('cms.example.test'), false, 'diagnostics must sanitize URLs')
}

for (const code of ['E_MMJ_UI29_PORTFOLIO_HEAD_UNSTABLE', 'E_MMJ_UI29_SNAPSHOT_HEADER_MISMATCH']) {
  assert.deepEqual(classifyPortfolioHandoffRetry(contractError(code, 'head-repeat')), {
    retryable: true,
    retryClass: 'consistency-retry',
  })
}

for (const causeCode of [
  'ECONNRESET',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'ENETUNREACH',
  'EHOSTUNREACH',
  'ECONNABORTED',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_SOCKET',
]) {
  assert.deepEqual(classifyPortfolioHandoffRetry(contractError(
    'E_MMJ_UI29_HANDOFF_TIMEOUT',
    'head',
    { transportKind: 'network', originalCauseCode: causeCode },
  )), {
    retryable: true,
    retryClass: 'transient-network',
  })
}

for (const code of [
  'E_MMJ_UI29_SNAPSHOT_DIGEST_MISMATCH',
  'E_MMJ_UI29_HEAD_INVALID',
  'E_MMJ_UI29_RECEIPT_INVALID',
  'E_MMJ_UI29_SNAPSHOT_INVALID',
  'E_MMJ_UI29_PORTFOLIO_COLLECTION_NOT_PROMOTED',
  'E_MMJ_UI29_HANDOFF_RESPONSE_TOO_LARGE',
  'E_MMJ_UI29_HANDOFF_CONTENT_TYPE_INVALID',
  'E_MMJ_UI29_HANDOFF_REDIRECTED',
  'E_MMJ_UI29_GENERATED_ATOMIC_COMMIT_FAILED',
]) {
  const decision = classifyPortfolioHandoffRetry(contractError(code, 'snapshot'))
  assert.equal(decision.retryable, false, `${code} must remain fail-fast`)
}

assert.equal(classifyPortfolioHandoffRetry(contractError(
  'E_MMJ_UI29_HANDOFF_TIMEOUT',
  'head',
  { transportKind: 'network', originalCauseCode: 'UNKNOWN_NETWORK_ERROR' },
)).retryable, false)

assert.equal(classifyPortfolioHandoffRetry(contractError(
  'E_MMJ_UI29_HANDOFF_TIMEOUT',
  'head',
  { status: 503 },
)).retryable, false, 'HTTP response failure is not transport-transient in R1')

assert.equal(classifyPortfolioHandoffRetry({
  name: 'Error',
  code: 'E_MMJ_UI29_PORTFOLIO_HEAD_UNSTABLE',
  details: { stage: 'head-repeat' },
}).retryable, false, 'non-Ui29 errors must not enter Portfolio retry authority')

assert.equal(portfolioRequestTimeoutMs({ deadline: 20_000, now: () => 1_000 }), 15_000)
assert.equal(portfolioRequestTimeoutMs({ deadline: 5_000, now: () => 1_000 }), 4_000)
assert.equal(portfolioRequestTimeoutMs({ deadline: 1_000, now: () => 1_000 }), 0)

let boundedCalls = 0
await assert.rejects(
  runPortfolioHandoffTransactionWithRetry({
    deadline: 100_000,
    now: () => 1_000,
    sleep: async () => undefined,
    logger: () => undefined,
    transaction: async () => {
      boundedCalls += 1
      throw contractError('E_MMJ_UI29_HANDOFF_TIMEOUT', 'head', { transportKind: 'timeout' })
    },
  }),
  error => error?.code === 'E_MMJ_UI29_HANDOFF_TIMEOUT',
)
assert.equal(boundedCalls, 3, 'transient retry must be bounded to three attempts')

let deterministicCalls = 0
await assert.rejects(
  runPortfolioHandoffTransactionWithRetry({
    deadline: 100_000,
    now: () => 1_000,
    sleep: async () => undefined,
    logger: () => undefined,
    transaction: async () => {
      deterministicCalls += 1
      throw contractError('E_MMJ_UI29_SNAPSHOT_DIGEST_MISMATCH', 'snapshot')
    },
  }),
  error => error?.code === 'E_MMJ_UI29_SNAPSHOT_DIGEST_MISMATCH',
)
assert.equal(deterministicCalls, 1, 'deterministic contract failure must not retry')

let deadlineCalls = 0
const deadlineLogs = []
await assert.rejects(
  runPortfolioHandoffTransactionWithRetry({
    deadline: 1_100,
    now: () => 1_000,
    sleep: async () => undefined,
    logger: receipt => deadlineLogs.push(receipt),
    transaction: async () => {
      deadlineCalls += 1
      throw contractError('E_MMJ_UI29_HANDOFF_TIMEOUT', 'head', { transportKind: 'timeout' })
    },
  }),
  error => error?.code === 'E_MMJ_UI29_HANDOFF_TIMEOUT',
)
assert.equal(deadlineCalls, 1, 'retry must not sleep past the global deadline budget')
assert.equal(deadlineLogs.find(entry => entry.event === 'MMJ_PORTFOLIO_HANDOFF_ATTEMPT_FAILED')?.willRetry, false)

console.log(JSON.stringify({
  event: 'PASS_MMJ_UI29_PORTFOLIO_HANDOFF_TRANSIENT_RETRY_CLOSURE_R1_TEST',
  timeoutStages: ['head', 'receipt', 'snapshot', 'head-repeat'],
  wholeTransactionRestart: true,
  existingConsistencyRetryPreserved: true,
  deterministicContractFailFast: true,
  boundedAttempts: 3,
  globalDeadlinePreserved: true,
  perRequestTimeoutCappedByGlobalDeadline: true,
  unknownNetworkFailureFailClosed: true,
  httpFailureNotBlindlyRetried: true,
}))
