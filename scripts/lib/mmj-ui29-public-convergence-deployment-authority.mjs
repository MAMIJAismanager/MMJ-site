import { assertPublicConvergenceAuthority } from './mmj-ui29-public-convergence.mjs'

export async function observePublicConvergenceDeploymentAdmission({ input, origin, fetchImpl = fetch, retryDelaysMs = [0, 1000, 3000], sleep = delay => new Promise(resolve => setTimeout(resolve, delay)) }) {
  let authority = null
  let failure = null
  for (const delay of retryDelaysMs) {
    if (delay) await sleep(delay)
    try {
      const response = await fetchImpl(`${origin}/api/v1/public/public-convergence/authority`, {
        headers: { accept: 'application/json', 'cache-control': 'no-cache' },
        redirect: 'error',
        signal: AbortSignal.timeout(5_000),
      })
      if (!response.ok) throw new Error(`HTTP_${response.status}`)
      authority = assertPublicConvergenceAuthority(await response.json())
      break
    } catch (error) {
      failure = error
    }
  }

  if (!authority) {
    return Object.freeze({
      deploy: false,
      state: 'undetermined',
      relation: null,
      reason: `authority-unavailable:${failure?.message ?? 'unknown'}`,
      observedCurrentAuthority: null,
    })
  }
  if (authority.currentConvergenceKey === input.convergenceKey && authority.convergenceDigest === input.convergenceDigest) {
    return Object.freeze({
      deploy: true,
      state: 'admitted',
      relation: 'current',
      reason: 'current-convergence-exact',
      observedCurrentAuthority: Object.freeze({
        convergenceKey: authority.currentConvergenceKey,
        convergenceDigest: authority.convergenceDigest,
        convergenceRevision: authority.convergenceRevision,
      }),
    })
  }
  return Object.freeze({
    deploy: false,
    state: 'withheld',
    relation: 'historical',
    reason: 'convergence-no-longer-current',
    observedCurrentAuthority: Object.freeze({
      convergenceKey: authority.currentConvergenceKey,
      convergenceDigest: authority.convergenceDigest,
      convergenceRevision: authority.convergenceRevision,
    }),
  })
}
