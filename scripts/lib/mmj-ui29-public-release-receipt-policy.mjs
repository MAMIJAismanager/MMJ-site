export const PUBLIC_RELEASE_RECEIPT_PATH = 'public/.well-known/mmj-public-release.json'

export const PUBLIC_RELEASE_ALLOWED_DIRECTORIES = Object.freeze([
  'public',
  'public/.well-known',
])

const ALLOWED_DIRECTORIES = new Set(PUBLIC_RELEASE_ALLOWED_DIRECTORIES)
const ALLOWED_FILES = new Set([PUBLIC_RELEASE_RECEIPT_PATH])

export class PublicReleaseReceiptPolicyError extends Error {
  constructor(message, details = {}) {
    super(message)
    this.name = 'PublicReleaseReceiptPolicyError'
    this.details = Object.freeze({ ...details })
  }
}

function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '')
}

function fail(message, details = {}) {
  throw new PublicReleaseReceiptPolicyError(message, details)
}

export function validatePublicReleaseTree(entries) {
  if (!Array.isArray(entries)) fail('public tree entries must be an array.')
  if (entries.length === 0) {
    return Object.freeze({ present: false, receiptPath: null })
  }

  const seen = new Set()
  for (const raw of entries) {
    const path = normalizePath(raw?.path)
    const kind = String(raw?.kind || '')
    if (!path) fail('public tree entry path is invalid.')
    if (seen.has(path)) fail(`duplicate public tree entry: ${path}`)
    seen.add(path)

    if (ALLOWED_DIRECTORIES.has(path)) {
      if (kind !== 'directory') fail(`public directory kind is invalid: ${path}`, { kind })
      continue
    }
    if (ALLOWED_FILES.has(path)) {
      if (kind !== 'file') fail(`public receipt must be a regular file: ${path}`, { kind })
      continue
    }
    fail(`unexpected public entry: ${path}`, { kind })
  }

  for (const directory of PUBLIC_RELEASE_ALLOWED_DIRECTORIES) {
    if (!seen.has(directory)) fail(`required public directory is missing: ${directory}`)
  }
  if (!seen.has(PUBLIC_RELEASE_RECEIPT_PATH)) {
    fail(`required public receipt is missing: ${PUBLIC_RELEASE_RECEIPT_PATH}`)
  }
  if (seen.size !== PUBLIC_RELEASE_ALLOWED_DIRECTORIES.length + 1) {
    fail('public release receipt tree is not exact.')
  }

  return Object.freeze({
    present: true,
    receiptPath: PUBLIC_RELEASE_RECEIPT_PATH,
  })
}
