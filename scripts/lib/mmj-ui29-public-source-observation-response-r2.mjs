const SHA40 = /^[0-9a-f]{40}$/

function sha40(value, field) {
  const normalized = String(value ?? '').toLowerCase()
  if (!SHA40.test(normalized)) throw new Error(`E_MMJ_PUBLIC_SOURCE_OBSERVATION_RESPONSE_INVALID:${field}`)
  return normalized
}

export function classifyPublicSourceObservationResponseR2(payload, expectedAfterSha) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('E_MMJ_PUBLIC_SOURCE_OBSERVATION_RESPONSE_INVALID:body')
  }
  if (payload.accepted !== true) throw new Error('E_MMJ_PUBLIC_SOURCE_OBSERVATION_RESPONSE_NOT_ACCEPTED')
  const afterSha = sha40(expectedAfterSha, 'expectedAfterSha')
  const admission = String(payload.admission ?? '')
  const currentSourceAuthoritySha = payload.sourceAuthority?.commitSha == null
    ? null
    : sha40(payload.sourceAuthority.commitSha, 'sourceAuthority.commitSha')
  const refreshState = String(payload.convergenceRefresh?.state ?? '')
  const refreshSourceSha = payload.convergenceRefresh?.sourceCommitSha == null
    ? null
    : sha40(payload.convergenceRefresh.sourceCommitSha, 'convergenceRefresh.sourceCommitSha')

  if (admission === 'advanced') {
    if (currentSourceAuthoritySha !== afterSha) {
      throw new Error('E_MMJ_PUBLIC_SOURCE_OBSERVATION_ADVANCED_AUTHORITY_MISMATCH')
    }
    if (!['scheduled', 'already-pending'].includes(refreshState) || refreshSourceSha !== afterSha) {
      throw new Error('E_MMJ_PUBLIC_SOURCE_OBSERVATION_ADVANCED_REFRESH_MISMATCH')
    }
    return Object.freeze({
      disposition: 'advanced',
      event: 'PASS_MMJ_PUBLIC_SOURCE_OBSERVATION_ADVANCED',
      currentSourceAuthoritySha,
      refreshState,
    })
  }

  if (admission === 'idempotent') {
    if (currentSourceAuthoritySha !== afterSha) {
      throw new Error('E_MMJ_PUBLIC_SOURCE_OBSERVATION_IDEMPOTENT_AUTHORITY_MISMATCH')
    }
    if (!['not-required', 'scheduled', 'already-pending'].includes(refreshState)) {
      throw new Error('E_MMJ_PUBLIC_SOURCE_OBSERVATION_IDEMPOTENT_REFRESH_INVALID')
    }
    if (refreshState !== 'not-required' && refreshSourceSha !== afterSha) {
      throw new Error('E_MMJ_PUBLIC_SOURCE_OBSERVATION_IDEMPOTENT_REFRESH_MISMATCH')
    }
    return Object.freeze({
      disposition: 'idempotent-current',
      event: 'PASS_MMJ_PUBLIC_SOURCE_OBSERVATION_ALREADY_CURRENT',
      currentSourceAuthoritySha,
      refreshState,
    })
  }

  if (admission === 'historical') {
    return Object.freeze({
      disposition: 'historical-superseded',
      event: 'PASS_MMJ_PUBLIC_SOURCE_OBSERVATION_SUPERSEDED',
      currentSourceAuthoritySha,
      refreshState,
    })
  }

  throw new Error(`E_MMJ_PUBLIC_SOURCE_OBSERVATION_RESPONSE_DISPOSITION_INVALID:${admission || 'missing'}`)
}
