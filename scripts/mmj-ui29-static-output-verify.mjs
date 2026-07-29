import { readdir, readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  fail,
  pathExists,
  verifyGeneratedArtifactSet,
} from './lib/mmj-ui29-public-contract.mjs'

const root = process.cwd()
const outputRoot = resolve(root, '.output', 'public')
const generated = await verifyGeneratedArtifactSet(resolve(root, 'generated'), root)

if (!await pathExists(outputRoot)) fail('E_MMJ_UI29_PRERENDER_ROUTE_MISSING', 'Nuxt static output directory is missing.')

function decodeHtml(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/&#x([a-f0-9]+);/gi, (_, number) => String.fromCodePoint(Number.parseInt(number, 16)))
}

function attributes(tag) {
  const output = {}
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    output[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? '')
  }
  return output
}

function headValue(html, selector, key = 'content') {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = attributes(tag)
    if (selector(attrs)) return attrs[key] ?? null
  }
  return null
}

function titleValue(html) {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i)
  return match ? decodeHtml(match[1]) : null
}

const mediaBase = String(process.env.NUXT_PUBLIC_MMJ_MEDIA_BASE_URL ?? '').replace(/\/+$/, '')
if (generated.projectCount > 0 && !mediaBase) fail('E_MMJ_UI29_SEO_PARITY_MISMATCH', 'NUXT_PUBLIC_MMJ_MEDIA_BASE_URL is required for SEO parity.')
const assetById = new Map(generated.snapshot.assets.map(asset => [asset.id, asset]))

for (const project of generated.snapshot.projects) {
  const file = resolve(outputRoot, 'works', project.slug, 'index.html')
  if (!await pathExists(file)) fail('E_MMJ_UI29_PRERENDER_ROUTE_MISSING', 'Work detail route is missing.', { route: `/works/${project.slug}` })
  const html = await readFile(file, 'utf8')
  const actualTitle = titleValue(html)
  const actualDescription = headValue(html, attrs => attrs.name === 'description')
  const actualRobots = headValue(html, attrs => attrs.name === 'robots')
  const actualOgImage = headValue(html, attrs => attrs.property === 'og:image')
  const ogAsset = assetById.get(project.seo.ogAssetId)
  const rendition = ogAsset?.renditions?.find(item => item.id === ogAsset.defaultRenditionId)
  const expectedOgImage = rendition ? `${mediaBase}/${rendition.objectKey}` : null
  const expectedRobots = project.seo.indexable ? 'index,follow' : 'noindex,nofollow'
  if (actualTitle !== project.seo.title) fail('E_MMJ_UI29_SEO_PARITY_MISMATCH', 'Prerender title differs from snapshot.', { slug: project.slug })
  if (actualDescription !== project.seo.description) fail('E_MMJ_UI29_SEO_PARITY_MISMATCH', 'Prerender description differs from snapshot.', { slug: project.slug })
  if (actualRobots !== expectedRobots) fail('E_MMJ_UI29_SEO_PARITY_MISMATCH', 'Prerender robots policy differs from snapshot.', { slug: project.slug })
  if (actualOgImage !== expectedOgImage) fail('E_MMJ_UI29_SEO_PARITY_MISMATCH', 'Prerender Open Graph image differs from snapshot.', { slug: project.slug })
}

const worksRoot = resolve(outputRoot, 'works')
const actualWorkSlugs = []
if (await pathExists(worksRoot)) {
  for (const entry of await readdir(worksRoot, { withFileTypes: true })) {
    if (entry.isDirectory()) actualWorkSlugs.push(entry.name)
  }
}
actualWorkSlugs.sort()
const expectedWorkSlugs = generated.snapshot.projects.map(project => project.slug).sort()
if (actualWorkSlugs.join('\0') !== expectedWorkSlugs.join('\0')) {
  fail('E_MMJ_UI29_PRERENDER_ROUTE_STALE', 'Static output contains missing or stale work routes.', { actualWorkSlugs, expectedWorkSlugs })
}

const forbidden = [
  'MMJ_PORTFOLIO_HANDOFF_ORIGIN',
  'portfolio-snapshot/head',
  'portfolio-snapshot/receipts',
  'cms.mamajing.work/api/v1/public/portfolio-snapshot',
]
let scanned = 0
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name)
    if (entry.isDirectory()) await walk(path)
    else if (/\.(?:js|html)$/i.test(entry.name)) {
      const info = await stat(path)
      if (info.size > 32 * 1024 * 1024) continue
      const text = await readFile(path, 'utf8')
      scanned += 1
      for (const signature of forbidden) {
        if (text.includes(signature)) fail('E_MMJ_UI29_CMS_ORIGIN_CLIENT_LEAK', 'Build-time portfolio handoff signature leaked into public output.', { signature })
      }
    }
  }
}
await walk(outputRoot)

console.log(JSON.stringify({
  event: 'PASS_MMJ_UI29_A_BUILD_ARTIFACT_SEALED_UNPROMOTED',
  releaseId: generated.releaseId,
  routeCount: generated.routeCount,
  scannedRuntimeFileCount: scanned,
  seoParity: 'pass',
  cmsRuntimeFetch: 'absent',
}))
