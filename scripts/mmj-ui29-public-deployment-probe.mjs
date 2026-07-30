import { appendFile } from 'node:fs/promises'

const canonical = process.env.MMJ_CANONICAL_PUBLIC_URL
const expected = process.env.MMJ_EXPECTED_SNAPSHOT_DIGEST
if (!canonical || !expected) throw new Error('E_MMJ_UI29_DEPLOYMENT_PROBE_CONFIGURATION_MISSING')
const url = new URL('/.well-known/mmj-public-release.json', canonical)
let lastError
for (let attempt = 1; attempt <= 12; attempt += 1) {
  try {
    const response = await fetch(url, { cache: 'no-store', headers: { 'cache-control': 'no-cache', pragma: 'no-cache' } })
    if (response.ok) {
      const body = await response.json()
      if (body.snapshotDigest === expected) {
        const probedAt = new Date().toISOString()
        console.log(JSON.stringify({ event: 'PASS_MMJ_UI29_B_PUBLIC_DEPLOYMENT_PROBE', snapshotDigest: expected, probeStatus: response.status, probedAt, url: url.href }))
        if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `probe_status=${response.status}\nprobed_at=${probedAt}\n`)
        process.exit(0)
      }
      lastError = new Error(`Snapshot digest mismatch: ${body.snapshotDigest}`)
    } else {
      lastError = new Error(`Probe returned HTTP ${response.status}`)
    }
  } catch (error) { lastError = error }
  await new Promise(resolve => setTimeout(resolve, attempt * 5_000))
}
console.error(String(lastError?.message || lastError || 'Deployment probe failed.'))
process.exit(1)
