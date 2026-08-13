const ID_PATTERNS = Object.freeze({
  deliveryKey: /^pdispatch_v1_[0-9a-f]{64}$/,
  collectionVersionId: /^pcol_[A-Za-z0-9_-]{8,128}$/,
  snapshotDigest: /^[0-9a-f]{64}$/,
  handoffReceiptId: /^phnd_[A-Za-z0-9_-]{8,128}$/,
})

const NUMERIC_FIELDS = Object.freeze([
  'projectCount',
  'assetCount',
  'sourceWorkbookRevision',
  'collectionHeadRevision',
])

function requiredString(value, field) {
  if (typeof value !== 'string' || value.length === 0) {
    throw evidenceError(field, value, `${field} is required.`)
  }
  return value
}

function evidenceError(field, observedValue, message) {
  const error = new Error(message)
  error.code = 'E_MMJ_UI29_FAILURE_RECEIPT_EVIDENCE_INVALID'
  error.details = Object.freeze({ field, observedValue: normalizeObservedValue(observedValue) })
  return error
}

function normalizeObservedValue(value) {
  if (value === undefined) return null
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value
  return String(value).slice(0, 256)
}

function nonNegativeInteger(value, field) {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw evidenceError(field, value, `${field} is not structurally reportable.`)
  }
  return parsed
}

function positiveInteger(value, field) {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw evidenceError(field, value, `${field} is invalid.`)
  }
  return parsed
}

function canonicalIso(value) {
  const text = String(value || '')
  const parsed = Date.parse(text)
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === text
}

function parseHttpsOrigin(value, field) {
  let url
  try { url = new URL(requiredString(value, field)) } catch {
    throw evidenceError(field, value, `${field} is invalid.`)
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || (url.pathname !== '' && url.pathname !== '/')) {
    throw evidenceError(field, value, `${field} must be an HTTPS origin.`)
  }
  return url.origin
}

export function readFailureReceiptRawInput(env = process.env) {
  return Object.freeze({
    deliveryKey: env.MMJ_DELIVERY_KEY,
    collectionVersionId: env.MMJ_COLLECTION_VERSION_ID,
    snapshotDigest: env.MMJ_EXPECTED_SNAPSHOT_DIGEST,
    handoffReceiptId: env.MMJ_HANDOFF_RECEIPT_ID,
    projectCount: env.MMJ_PROJECT_COUNT,
    assetCount: env.MMJ_ASSET_COUNT,
    sourceWorkbookRevision: env.MMJ_SOURCE_WORKBOOK_REVISION,
    collectionHeadRevision: env.MMJ_COLLECTION_HEAD_REVISION,
    issuedAt: env.MMJ_ISSUED_AT,
    repository: env.GITHUB_REPOSITORY,
    githubRunId: env.GITHUB_RUN_ID,
    githubRunAttempt: env.GITHUB_RUN_ATTEMPT,
    githubSha: env.GITHUB_SHA,
    githubServerUrl: env.GITHUB_SERVER_URL,
  })
}

export function inspectBuildAdmissionFailure(raw) {
  for (const [field, pattern] of Object.entries(ID_PATTERNS)) {
    const value = String(raw[field] || '')
    if (!pattern.test(value)) {
      return Object.freeze({
        error: 'E_MMJ_UI29_DISPATCH_INPUT_INVALID',
        message: `${field} is invalid.`,
        field,
        observedValue: normalizeObservedValue(raw[field]),
      })
    }
  }

  for (const field of ['projectCount', 'assetCount']) {
    const parsed = Number(raw[field])
    if (!Number.isSafeInteger(parsed) || parsed < 0) {
      return Object.freeze({
        error: 'E_MMJ_UI29_DISPATCH_INPUT_INVALID',
        message: `${field} is invalid.`,
        field,
        observedValue: normalizeObservedValue(Number.isFinite(parsed) ? parsed : raw[field]),
      })
    }
  }

  for (const field of ['sourceWorkbookRevision', 'collectionHeadRevision']) {
    const parsed = Number(raw[field])
    if (!Number.isSafeInteger(parsed) || parsed < 1) {
      return Object.freeze({
        error: 'E_MMJ_UI29_DISPATCH_INPUT_INVALID',
        message: `${field} is invalid.`,
        field,
        observedValue: normalizeObservedValue(Number.isFinite(parsed) ? parsed : raw[field]),
      })
    }
  }

  if (!canonicalIso(raw.issuedAt)) {
    return Object.freeze({
      error: 'E_MMJ_UI29_DISPATCH_INPUT_INVALID',
      message: 'issuedAt is invalid.',
      field: 'issuedAt',
      observedValue: normalizeObservedValue(raw.issuedAt),
    })
  }

  return null
}

export function inspectFailureReceiptEvidence(env = process.env) {
  const raw = readFailureReceiptRawInput(env)

  for (const [field, pattern] of Object.entries(ID_PATTERNS)) {
    const value = requiredString(raw[field], field)
    if (!pattern.test(value)) throw evidenceError(field, value, `${field} is not structurally reportable.`)
  }

  const numeric = Object.fromEntries(NUMERIC_FIELDS.map(field => [field, nonNegativeInteger(raw[field], field)]))
  const repository = requiredString(raw.repository, 'repository')
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw evidenceError('repository', repository, 'repository is invalid.')
  }
  const githubRunId = positiveInteger(raw.githubRunId, 'githubRunId')
  const githubRunAttempt = positiveInteger(raw.githubRunAttempt, 'githubRunAttempt')
  const githubSha = requiredString(raw.githubSha, 'githubSha')
  if (!/^[0-9a-fA-F]{40,64}$/.test(githubSha)) throw evidenceError('githubSha', githubSha, 'githubSha is invalid.')
  const githubServerUrl = parseHttpsOrigin(raw.githubServerUrl, 'githubServerUrl')

  const buildAdmissionFailure = inspectBuildAdmissionFailure(raw)

  return Object.freeze({
    schemaVersion: 1,
    contract: 'mmj-ui29-failure-receipt-evidence-authority-v1',
    failureReceiptEvidenceEligible: true,
    buildAdmissionEligible: buildAdmissionFailure === null,
    buildAdmissionFailure,
    delivery: Object.freeze({
      deliveryKey: raw.deliveryKey,
      collectionVersionId: raw.collectionVersionId,
      snapshotDigest: raw.snapshotDigest,
      handoffReceiptId: raw.handoffReceiptId,
      ...numeric,
      issuedAt: raw.issuedAt ?? null,
    }),
    githubRun: Object.freeze({
      repository,
      githubRunId,
      githubRunAttempt,
      githubSha: githubSha.toLowerCase(),
      githubServerUrl,
    }),
  })
}
