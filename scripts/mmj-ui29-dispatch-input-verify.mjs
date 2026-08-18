import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  assertPortfolioDispatchGenerationAuthority,
  assertPortfolioDispatchGenerationInput,
  readPortfolioDispatchGenerationEnvironment,
} from './lib/mmj-ui29-portfolio-dispatch-generation.mjs'

const mode = process.argv[2] || 'preflight'

function fail(code, message, details = undefined) {
  console.error(JSON.stringify({ schemaVersion: 1, error: code, message, details }))
  process.exit(1)
}

function inputOrFail() {
  try { return assertPortfolioDispatchGenerationInput(readPortfolioDispatchGenerationEnvironment(process.env)) }
  catch (error) { fail('E_MMJ_UI29_DISPATCH_INPUT_INVALID', 'Portfolio dispatch generation input is invalid.', { cause: error?.message ?? String(error) }) }
}

function resolveOrigin() {
  const raw = process.env.MMJ_PORTFOLIO_HANDOFF_ORIGIN
  if (!raw) fail('E_MMJ_UI29_HANDOFF_ORIGIN_MISSING', 'MMJ_PORTFOLIO_HANDOFF_ORIGIN is required.')
  let url
  try { url = new URL(raw) } catch { fail('E_MMJ_UI29_HANDOFF_ORIGIN_INVALID', 'MMJ_PORTFOLIO_HANDOFF_ORIGIN is invalid.') }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || (url.pathname !== '' && url.pathname !== '/')) {
    fail('E_MMJ_UI29_HANDOFF_ORIGIN_INVALID', 'MMJ_PORTFOLIO_HANDOFF_ORIGIN must be an HTTPS origin.')
  }
  return url.origin
}

async function preflight(input) {
  const origin = resolveOrigin()
  const response = await fetch(`${origin}/api/v1/public/portfolio-snapshot/dispatch-generations/${encodeURIComponent(input.deliveryKey)}`, {
    headers: { accept: 'application/json', 'cache-control': 'no-cache' },
    redirect: 'error',
  })
  if (!response.ok) fail('E_MMJ_UI29_DISPATCH_GENERATION_FETCH_FAILED', 'Portfolio dispatch generation request failed.', { status: response.status })
  try {
    const authority = assertPortfolioDispatchGenerationAuthority(await response.json(), input)
    console.log(JSON.stringify({ event: 'PASS_MMJ_UI29_GENERATION_BOUND_DISPATCH_PREFLIGHT', relation: authority.relation, ...input }))
  } catch (error) {
    fail('E_MMJ_UI29_DISPATCH_GENERATION_MISMATCH', 'Portfolio dispatch generation does not match the immutable CMS delivery generation.', { cause: error?.message ?? String(error) })
  }
}

async function postAdopt(input) {
  const root = process.cwd()
  const [manifestBytes, handoffBytes, lockBytes] = await Promise.all([
    readFile(resolve(root, 'generated/public-release.manifest.json')),
    readFile(resolve(root, 'generated/portfolio.handoff.json')),
    readFile(resolve(root, 'generated/portfolio.build-input-lock.json')),
  ])
  const manifest = JSON.parse(manifestBytes.toString('utf8'))
  const handoff = JSON.parse(handoffBytes.toString('utf8'))
  const lock = JSON.parse(lockBytes.toString('utf8'))
  const portfolioManifest = manifest.schemaVersion === 2 ? manifest.portfolio : {
    snapshotDigest: manifest.snapshotDigest,
    collectionVersionId: manifest.portfolioCollectionVersionId,
    handoffReceiptId: manifest.portfolioHandoffReceiptId,
    projectCount: manifest.projectCount,
    assetCount: manifest.assetCount,
  }
  const generation = portfolioManifest.generation ?? null
  const mismatches = []
  const checks = [
    ['snapshotDigest', portfolioManifest.snapshotDigest, input.snapshotDigest],
    ['collectionVersionId', portfolioManifest.collectionVersionId, input.collectionVersionId],
    ['handoffReceiptId', portfolioManifest.handoffReceiptId, input.handoffReceiptId],
    ['projectCount', portfolioManifest.projectCount, input.projectCount],
    ['assetCount', portfolioManifest.assetCount, input.assetCount],
    ['handoff.snapshotDigest', handoff.snapshotDigest, input.snapshotDigest],
    ['lock.deliveryKey', lock.deliveryKey, input.deliveryKey],
    ['lock.generationDigest', lock.generationDigest, input.generationDigest],
    ['lock.collectionHeadRevision', lock.collectionHeadRevision, input.collectionHeadRevision],
    ['manifest.generation.deliveryKey', generation?.deliveryKey, input.deliveryKey],
    ['manifest.generation.generationDigest', generation?.generationDigest, input.generationDigest],
  ]
  for (const [field, actual, expected] of checks) if (String(actual) !== String(expected)) mismatches.push({ field, expected, actual })
  if (mismatches.length) fail('E_MMJ_UI29_DISPATCH_ADOPTION_MISMATCH', 'Adopted artifacts do not match dispatch generation.', { mismatches })
  console.log(JSON.stringify({
    event: 'PASS_MMJ_UI29_GENERATION_BOUND_DISPATCH_ADOPTION_VERIFIED',
    ...input,
    publicReleaseManifestDigest: createHash('sha256').update(manifestBytes).digest('hex'),
  }))
}

const input = inputOrFail()
if (mode === 'preflight') await preflight(input)
else if (mode === 'post-adopt') await postAdopt(input)
else fail('E_MMJ_UI29_DISPATCH_MODE_INVALID', 'Expected preflight or post-adopt mode.')
