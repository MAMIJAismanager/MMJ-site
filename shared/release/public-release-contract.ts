export const MMJ_PUBLIC_RELEASE_MANIFEST_SCHEMA_VERSION = 1 as const
export const MMJ_PUBLIC_RELEASE_QUERY_KEY = 'mmj_rev'
export const MMJ_PUBLIC_RELEASE_PROBE_QUERY_KEY = 'mmj_probe'
export const MMJ_PUBLIC_RELEASE_REBOOT_PREFIX = 'mmj-release-rebootstrap:'
export const MMJ_PUBLIC_RELEASE_CHECK_LEASE_MS = 45_000

const SHA40_PATTERN = /^[a-f0-9]{40}$/

export interface MmjPublicReleaseManifest {
  readonly schemaVersion: typeof MMJ_PUBLIC_RELEASE_MANIFEST_SCHEMA_VERSION
  readonly revision: string
}

export type MmjPublicReleaseFreshnessDecision =
  | 'ignore'
  | 'current'
  | 'rebootstrap'
  | 'propagation-pending'

export function isCanonicalPublicReleaseRevision(
  value: unknown,
): value is string {
  return typeof value === 'string' && SHA40_PATTERN.test(value)
}

export function normalizePublicReleaseRevision(
  value: unknown,
): string {
  return isCanonicalPublicReleaseRevision(value)
    ? value
    : 'development'
}

export function parsePublicReleaseManifest(
  value: unknown,
): MmjPublicReleaseManifest | null {
  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
  ) {
    return null
  }

  const record = value as Record<string, unknown>
  if (
    record.schemaVersion !== MMJ_PUBLIC_RELEASE_MANIFEST_SCHEMA_VERSION
    || !isCanonicalPublicReleaseRevision(record.revision)
  ) {
    return null
  }

  return Object.freeze({
    schemaVersion: MMJ_PUBLIC_RELEASE_MANIFEST_SCHEMA_VERSION,
    revision: record.revision,
  })
}

export function resolvePublicReleaseFreshnessDecision(
  loadedRevision: string,
  remoteRevision: string,
  rebootstrapAlreadyAttempted: boolean,
): MmjPublicReleaseFreshnessDecision {
  if (
    !isCanonicalPublicReleaseRevision(loadedRevision)
    || !isCanonicalPublicReleaseRevision(remoteRevision)
  ) {
    return 'ignore'
  }

  if (loadedRevision === remoteRevision) {
    return 'current'
  }

  return rebootstrapAlreadyAttempted
    ? 'propagation-pending'
    : 'rebootstrap'
}

export function publicReleaseRebootstrapKey(
  revision: string,
): string {
  if (!isCanonicalPublicReleaseRevision(revision)) {
    throw new TypeError('E_MMJ_PUBLIC_RELEASE_INVALID_REVISION')
  }
  return `${MMJ_PUBLIC_RELEASE_REBOOT_PREFIX}${revision}`
}

export function withPublicReleaseRevision(
  href: string,
  revision: string,
  probeNonce: string,
): string {
  if (!isCanonicalPublicReleaseRevision(revision)) {
    throw new TypeError('E_MMJ_PUBLIC_RELEASE_INVALID_REVISION')
  }

  const url = new URL(href)
  url.searchParams.set(MMJ_PUBLIC_RELEASE_QUERY_KEY, revision)
  url.searchParams.set(MMJ_PUBLIC_RELEASE_PROBE_QUERY_KEY, probeNonce)
  return url.toString()
}

export function stripPublicReleaseQuery(
  href: string,
): string {
  const url = new URL(href)
  url.searchParams.delete(MMJ_PUBLIC_RELEASE_QUERY_KEY)
  url.searchParams.delete(MMJ_PUBLIC_RELEASE_PROBE_QUERY_KEY)
  return url.toString()
}

export function buildPublicReleaseBootstrapSource(
  revision: string,
): string {
  if (!isCanonicalPublicReleaseRevision(revision)) return ''

  const loaded = JSON.stringify(revision)
  const manifestPath = JSON.stringify('/mmj-release.json')
  const queryKey = JSON.stringify(MMJ_PUBLIC_RELEASE_QUERY_KEY)
  const probeKey = JSON.stringify(MMJ_PUBLIC_RELEASE_PROBE_QUERY_KEY)
  const rebootPrefix = JSON.stringify(MMJ_PUBLIC_RELEASE_REBOOT_PREFIX)

  return `(()=>{const loaded=${loaded};const manifestPath=${manifestPath};const queryKey=${queryKey};const probeKey=${probeKey};const rebootPrefix=${rebootPrefix};const sha=/^[a-f0-9]{40}$/;const clean=()=>{const url=new URL(location.href);if(!url.searchParams.has(queryKey)&&!url.searchParams.has(probeKey))return;url.searchParams.delete(queryKey);url.searchParams.delete(probeKey);history.replaceState(history.state,'',url.toString())};const probe=new URL(manifestPath,location.origin);probe.searchParams.set(probeKey,loaded+'-'+Date.now().toString(36));fetch(probe.toString(),{cache:'no-store',credentials:'same-origin',headers:{accept:'application/json'}}).then(response=>response.ok?response.json():null).then(value=>{const remote=value&&value.schemaVersion===1&&typeof value.revision==='string'&&sha.test(value.revision)?value.revision:null;if(remote===null)return;if(remote===loaded){clean();return}const marker=rebootPrefix+remote;if(sessionStorage.getItem(marker)==='1')return;sessionStorage.setItem(marker,'1');const next=new URL(location.href);next.searchParams.set(queryKey,remote);next.searchParams.set(probeKey,Date.now().toString(36));location.replace(next.toString())}).catch(()=>{})})();`
}
