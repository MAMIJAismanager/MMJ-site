const KNOWN_RESULTS = new Set(['success', 'failure', 'cancelled', 'skipped'])

function normalizedResult(value, field) {
  const result = String(value || '')
  if (!KNOWN_RESULTS.has(result)) throw new Error(`${field} must be success, failure, cancelled, or skipped.`)
  return result
}

export function classifyPagesRunOutcome({ buildResult, deployResult }) {
  const build = normalizedResult(buildResult, 'buildResult')
  const deploy = normalizedResult(deployResult, 'deployResult')
  const results = [build, deploy]

  if (results.includes('failure')) return 'FAILURE'
  if (results.includes('cancelled')) return 'CANCELLED'
  if (results.every(result => result === 'success')) return 'SUCCESS'
  return 'NEUTRAL'
}

export function decidePortfolioFailureReceiptEligibility({ eventName, eventAction, buildResult, deployResult }) {
  const classification = classifyPagesRunOutcome({ buildResult, deployResult })
  const eligibleEvent = eventName === 'repository_dispatch' && eventAction === 'mmj_portfolio_promoted'
  return Object.freeze({
    classification,
    eligibleEvent,
    actualFailure: classification === 'FAILURE',
    failureReceiptEligible: eligibleEvent && classification === 'FAILURE',
  })
}
