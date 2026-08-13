const CONSISTENCY_RETRY_CODES = new Set([
  'E_MMJ_UI29_PORTFOLIO_HEAD_UNSTABLE',
  'E_MMJ_UI29_SNAPSHOT_HEADER_MISMATCH',
])

const TRANSIENT_NETWORK_CAUSE_CODES = new Set([
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
])

function cleanDiagnostic(value) {
  if (typeof value !== 'string' || value.length === 0) return null
  return value.replace(/https?:\/\/\S+/g, '[url]').slice(0, 512)
}

function detail(error, key) {
  return error && typeof error === 'object' && error.details && typeof error.details === 'object'
    ? error.details[key]
    : undefined
}

export function portfolioRequestTimeoutMs({ deadline, now = Date.now, perRequestTimeoutMs = 15_000 }) {
  if (!Number.isFinite(deadline)) throw new TypeError('deadline must be finite')
  if (!Number.isFinite(perRequestTimeoutMs) || perRequestTimeoutMs <= 0) throw new TypeError('perRequestTimeoutMs must be positive')
  const remainingDeadlineMs = Math.max(0, deadline - now())
  return Math.min(perRequestTimeoutMs, remainingDeadlineMs)
}

export function classifyPortfolioHandoffRetry(error) {
  if (error?.name !== 'Ui29Error') {
    return Object.freeze({ retryable: false, retryClass: 'deterministic-contract' })
  }

  const code = typeof error?.code === 'string' ? error.code : null
  if (CONSISTENCY_RETRY_CODES.has(code)) {
    return Object.freeze({ retryable: true, retryClass: 'consistency-retry' })
  }

  if (code === 'E_MMJ_UI29_HANDOFF_TIMEOUT') {
    const transportKind = detail(error, 'transportKind')
    if (transportKind === 'timeout') {
      return Object.freeze({ retryable: true, retryClass: 'transient-timeout' })
    }
    if (transportKind === 'network' && TRANSIENT_NETWORK_CAUSE_CODES.has(detail(error, 'originalCauseCode'))) {
      return Object.freeze({ retryable: true, retryClass: 'transient-network' })
    }
  }

  return Object.freeze({ retryable: false, retryClass: 'deterministic-contract' })
}

export async function runPortfolioHandoffTransactionWithRetry({
  transaction,
  deadline,
  maxAttempts = 3,
  now = Date.now,
  sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
  logger = receipt => console.error(JSON.stringify(receipt)),
}) {
  if (typeof transaction !== 'function') throw new TypeError('transaction must be a function')
  if (!Number.isFinite(deadline)) throw new TypeError('deadline must be finite')
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1) throw new TypeError('maxAttempts must be a positive integer')

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const startedAt = now()
    logger({
      event: 'MMJ_PORTFOLIO_HANDOFF_ATTEMPT_STARTED',
      attempt,
      remainingDeadlineMs: Math.max(0, deadline - startedAt),
    })

    try {
      const result = await transaction({ attempt })
      logger({
        event: 'MMJ_PORTFOLIO_HANDOFF_ATTEMPT_COMPLETED',
        attempt,
        remainingDeadlineMs: Math.max(0, deadline - now()),
      })
      return result
    } catch (error) {
      const decision = classifyPortfolioHandoffRetry(error)
      const failedAt = now()
      const remainingDeadlineMs = Math.max(0, deadline - failedAt)
      const stage = detail(error, 'stage') ?? null
      const delayMs = attempt * 250
      const attemptBudgetAvailable = attempt < maxAttempts
      const deadlineBudgetAvailable = remainingDeadlineMs > delayMs
      const willRetry = decision.retryable && attemptBudgetAvailable && deadlineBudgetAvailable

      logger({
        event: 'MMJ_PORTFOLIO_HANDOFF_ATTEMPT_FAILED',
        attempt,
        stage,
        code: typeof error?.code === 'string' ? error.code : null,
        retryClass: decision.retryClass,
        retryable: decision.retryable,
        willRetry,
        remainingDeadlineMs,
        originalErrorName: cleanDiagnostic(detail(error, 'originalErrorName') ?? error?.name ?? null),
        originalErrorMessage: cleanDiagnostic(detail(error, 'originalErrorMessage') ?? error?.message ?? null),
        originalCauseCode: cleanDiagnostic(detail(error, 'originalCauseCode') ?? null),
      })

      if (!willRetry) throw error

      logger({
        event: 'MMJ_PORTFOLIO_HANDOFF_RETRY_SCHEDULED',
        attempt,
        nextAttempt: attempt + 1,
        stage,
        code: typeof error?.code === 'string' ? error.code : null,
        retryClass: decision.retryClass,
        delayMs,
        remainingDeadlineMs,
      })
      await sleep(delayMs)
    }
  }

  throw new Error('unreachable portfolio handoff retry state')
}
