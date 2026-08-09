import { appendFile } from 'node:fs/promises'

const canonical = process.env.MMJ_CANONICAL_PUBLIC_URL
const expected = process.env.MMJ_EXPECTED_SNAPSHOT_DIGEST
if (!canonical || !expected) throw new Error('E_MMJ_UI29_DEPLOYMENT_PROBE_CONFIGURATION_MISSING')

const observeOnly = process.argv.includes('--observe')
const strict = process.argv.includes('--strict') || !observeOnly
const url = new URL('/.well-known/mmj-public-release.json', canonical)
const delaysBeforeAttemptMs = [0, 2_000, 5_000]
const requestTimeoutMs = 3_000

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
let lastError = null
let lastObservedDigest = null
let lastStatus = null

for (let index = 0; index < delaysBeforeAttemptMs.length; index += 1) {
  const attempt = index + 1
  const delayMs = delaysBeforeAttemptMs[index]
  if (delayMs > 0) await sleep(delayMs)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs)
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
    })
    lastStatus = response.status
    if (response.ok) {
      const body = await response.json()
      lastObservedDigest = typeof body?.snapshotDigest === 'string' ? body.snapshotDigest : null
      if (lastObservedDigest === expected) {
        const probedAt = new Date().toISOString()
        console.log(JSON.stringify({
          event: 'PASS_MMJ_UI29_PUBLIC_PROPAGATION_OBSERVED',
          state: 'confirmed',
          snapshotDigest: expected,
          probeStatus: response.status,
          probedAt,
          attempt,
          url: url.href,
        }))
        if (process.env.GITHUB_OUTPUT) {
          await appendFile(process.env.GITHUB_OUTPUT, `propagation_state=confirmed\nprobe_status=${response.status}\nprobed_at=${probedAt}\n`)
        }
        process.exit(0)
      }
      lastError = new Error(`Snapshot digest mismatch: ${lastObservedDigest}`)
    } else {
      lastError = new Error(`Probe returned HTTP ${response.status}`)
    }
  } catch (error) {
    lastError = error
  } finally {
    clearTimeout(timeout)
  }
}

const pending = {
  event: 'OBSERVE_MMJ_UI29_PUBLIC_PROPAGATION_PENDING',
  state: 'pending',
  expectedSnapshotDigest: expected,
  lastObservedDigest,
  lastStatus,
  attemptCount: delaysBeforeAttemptMs.length,
  url: url.href,
  lastError: String(lastError?.message || lastError || 'Deployment propagation is pending.'),
}
console.log(JSON.stringify(pending))
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, 'propagation_state=pending\n')
if (strict) process.exit(1)
