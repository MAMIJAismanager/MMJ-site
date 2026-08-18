import {
  assertPortfolioDispatchGenerationInput,
  readPortfolioDispatchGenerationEnvironment,
} from './mmj-ui29-portfolio-dispatch-generation.mjs'

function resolveOrigin(raw) {
  if (!raw) throw new Error('E_MMJ_UI29_DEPLOYMENT_AUTHORITY_ORIGIN_MISSING')
  const url = new URL(raw)
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || (url.pathname !== '' && url.pathname !== '/')) {
    throw new Error('E_MMJ_UI29_DEPLOYMENT_AUTHORITY_ORIGIN_INVALID')
  }
  return url.origin
}

function sleepMs(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function observePortfolioDeploymentAdmission(options = {}) {
  const env = options.env ?? process.env
  if (env.MMJ_PORTFOLIO_EVENT_ACTIVE !== '1') {
    return Object.freeze({ state: 'admitted', relation: 'non-portfolio', deploy: true, reason: 'non-portfolio-trigger', observedCurrentAuthority: null })
  }
  const input = assertPortfolioDispatchGenerationInput(readPortfolioDispatchGenerationEnvironment(env))
  const origin = resolveOrigin(env.MMJ_PORTFOLIO_HANDOFF_ORIGIN)
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis)
  const sleep = options.sleep ?? sleepMs
  const delays = options.retryDelaysMs ?? [0, 1_000, 3_000]
  let lastReason = 'authority-unavailable'
  for (let attempt = 0; attempt < delays.length; attempt += 1) {
    if (delays[attempt] > 0) await sleep(delays[attempt])
    let response
    try {
      response = await fetchImpl(`${origin}/api/v1/public/portfolio-snapshot/dispatch-authority`, {
        headers: { accept: 'application/json', 'cache-control': 'no-cache' },
        redirect: 'error',
      })
    } catch {
      lastReason = 'authority-network-error'
      continue
    }
    if (!response.ok) {
      lastReason = `authority-http-${response.status}`
      if (response.status === 429 || response.status >= 500) continue
      return Object.freeze({ state: 'undetermined', relation: null, deploy: false, reason: lastReason, observedCurrentAuthority: null })
    }
    let authority
    try { authority = await response.json() } catch {
      return Object.freeze({ state: 'undetermined', relation: null, deploy: false, reason: 'authority-json-invalid', observedCurrentAuthority: null })
    }
    if (authority?.schemaVersion !== 1 || authority?.contract !== 'mmj-portfolio-dispatch-authority-v1') {
      return Object.freeze({ state: 'undetermined', relation: null, deploy: false, reason: 'authority-contract-invalid', observedCurrentAuthority: null })
    }
    if (authority.deliveryKey !== input.deliveryKey) {
      return Object.freeze({
        state: 'withheld',
        relation: 'historical',
        deploy: false,
        reason: 'delivery-no-longer-current',
        observedCurrentAuthority: Object.freeze({
          deliveryKey: String(authority.deliveryKey ?? ''),
          collectionVersionId: String(authority.collectionVersionId ?? ''),
          snapshotDigest: String(authority.snapshotDigest ?? ''),
          collectionHeadRevision: Number(authority.collectionHeadRevision),
        }),
      })
    }
    const mismatches = []
    for (const field of ['collectionVersionId', 'snapshotDigest', 'handoffReceiptId', 'projectCount', 'assetCount', 'sourceWorkbookRevision', 'collectionHeadRevision']) {
      if (String(authority[field]) !== String(input[field])) mismatches.push(field)
    }
    if (mismatches.length) {
      return Object.freeze({ state: 'undetermined', relation: 'current', deploy: false, reason: `current-authority-identity-contradiction:${mismatches.join(',')}`, observedCurrentAuthority: null })
    }
    return Object.freeze({ state: 'admitted', relation: 'current', deploy: true, reason: 'current-authority-exact-match', observedCurrentAuthority: null })
  }
  return Object.freeze({ state: 'undetermined', relation: null, deploy: false, reason: lastReason, observedCurrentAuthority: null })
}
