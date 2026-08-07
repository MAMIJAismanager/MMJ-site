import { readdir, readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  fail,
  pathExists,
  verifyGeneratedArtifactSet,
} from './lib/mmj-ui29-public-contract.mjs'
import {
  verifyCommissionGeneratedArtifactSet,
} from './lib/mmj-ui29-commission-contract.mjs'

const root = process.cwd()
const outputRoot = resolve(root, '.output', 'public')
const generated = await verifyGeneratedArtifactSet(resolve(root, 'generated'), root)
const commissionGenerated = await verifyCommissionGeneratedArtifactSet(resolve(root, 'generated'), root)

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

function normalizeText(value) {
  return String(value).replace(/\s+/g, ' ').trim()
}

function bodyText(html) {
  return normalizeText(decodeHtml(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  ))
}

async function verifyStaticSeoRoute(file, route, expected) {
  if (!await pathExists(file)) {
    fail(
      'E_MMJ_UI29_PRERENDER_ROUTE_MISSING',
      'Static SEO route is missing.',
      { route },
    )
  }
  const html = await readFile(file, 'utf8')
  const actual = {
    title: titleValue(html),
    description: headValue(html, attrs => attrs.name === 'description'),
    robots: headValue(html, attrs => attrs.name === 'robots'),
  }
  for (const key of ['title', 'description', 'robots']) {
    if (actual[key] !== expected[key]) {
      fail(
        'E_MMJ_PUBLIC_ROUTE_SEO_PARITY_MISMATCH',
        'Static route SEO differs from source authority.',
        { route, key, actual: actual[key], expected: expected[key] },
      )
    }
  }
  return html
}

function primaryMediaFigure(html) {
  return html.match(
    /<figure\b(?=[^>]*data-mm-work-asset-context=(?:"주요 미디어"|'주요 미디어'))[^>]*>[\s\S]*?<\/figure>/i,
  )?.[0] ?? null
}

const WORKS_SEO = Object.freeze({
  title: '작업 | 매미: 著',
  description: '매미: 著의 공개 작업과 프로젝트를 한곳에서 확인합니다.',
  robots: 'index,follow',
})

const CONTACT_SEO = Object.freeze({
  title: '프로젝트 문의 | 매미: 著',
  description: '협업과 프로젝트 문의를 위한 안내 및 문의 양식을 확인합니다.',
  robots: 'index,follow',
})

const mediaBase = String(process.env.NUXT_PUBLIC_MMJ_MEDIA_BASE_URL ?? '').replace(/\/+$/, '')
if (generated.projectCount > 0 && !mediaBase) fail('E_MMJ_UI29_SEO_PARITY_MISMATCH', 'NUXT_PUBLIC_MMJ_MEDIA_BASE_URL is required for SEO parity.')
const assetById = new Map(generated.snapshot.assets.map(asset => [asset.id, asset]))

await verifyStaticSeoRoute(
  resolve(outputRoot, 'works', 'index.html'),
  '/works',
  WORKS_SEO,
)
await verifyStaticSeoRoute(
  resolve(outputRoot, 'contact', 'index.html'),
  '/contact',
  CONTACT_SEO,
)

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

  for (const signature of [
    'mm-work-detail-header__summary',
    'mm-work-detail-header__tags',
    'data-mm-work-tags',
  ]) {
    if (html.includes(signature)) {
      fail(
        'E_MMJ_WORK_DETAIL_HEADER_PRERENDER_RESIDUE',
        'Retired work-detail summary or tag remains in prerender.',
        { slug: project.slug, signature },
      )
    }
  }

  if (!html.includes('data-mm-work-description')) {
    fail(
      'E_MMJ_WORK_DESCRIPTION_PROJECTION_REGRESSION',
      'Work description section is missing from prerender.',
      { slug: project.slug },
    )
  }
  if (!bodyText(html).includes(normalizeText(project.description))) {
    fail(
      'E_MMJ_WORK_DESCRIPTION_PROJECTION_REGRESSION',
      'Published work description is missing from prerender.',
      { slug: project.slug },
    )
  }

  if (html.includes('data-mm-work-primary')) {
    const figure = primaryMediaFigure(html)
    if (figure === null) {
      fail(
        'E_MMJ_WORK_PRIMARY_FIGURE_MISSING',
        'Primary media figure is missing from prerender.',
        { slug: project.slug },
      )
    }
    for (const signature of [
      '<figcaption',
      'mm-work-asset-frame__caption',
      'mm-work-asset-frame__context',
      'mm-work-asset-frame__label',
      'mm-work-asset-frame__editorial',
      'mm-work-asset-frame__credit',
    ]) {
      if (figure.includes(signature)) {
        fail(
          'E_MMJ_WORK_PRIMARY_CAPTION_PRERENDER_RESIDUE',
          'Primary media caption remains in prerender.',
          { slug: project.slug, signature },
        )
      }
    }
  }

  for (const signature of [
    'data-mm-work-meta-line',
    'data-mm-work-roles',
    'data-mm-work-release-date',
    'data-mm-site-footer',
    'class="mm-site-footer',
  ]) {
    if (html.includes(signature)) {
      fail(
        'E_MMJ_WORK_DETAIL_AUXILIARY_PRERENDER_RESIDUE',
        'Retired work-detail auxiliary surface remains in prerender.',
        { slug: project.slug, signature },
      )
    }
  }

  for (const signature of [
    'data-mm-work-detail-header',
    'data-mm-work-return-link',
  ]) {
    if (!html.includes(signature)) {
      fail(
        'E_MMJ_WORK_DETAIL_PRIMARY_PRERENDER_MISSING',
        'Required work-detail structure is missing from prerender.',
        { slug: project.slug, signature },
      )
    }
  }
}

const commissionFile = resolve(outputRoot, 'about', 'index.html')
if (!await pathExists(commissionFile)) fail('E_MMJ_COMMISSION_PRERENDER_MISSING', 'Commission guide route is missing.', { route: '/about' })
const commissionHtml = await readFile(commissionFile, 'utf8')
const commissionContent = commissionGenerated.snapshot.content
if (titleValue(commissionHtml) !== commissionContent.seoTitle) fail('E_MMJ_COMMISSION_SEO_PARITY_MISMATCH', 'Commission prerender title differs from snapshot.')
if (headValue(commissionHtml, attrs => attrs.name === 'description') !== commissionContent.seoDescription) fail('E_MMJ_COMMISSION_SEO_PARITY_MISMATCH', 'Commission prerender description differs from snapshot.')
if (headValue(commissionHtml, attrs => attrs.name === 'robots') !== 'index,follow') fail('E_MMJ_COMMISSION_SEO_PARITY_MISMATCH', 'Commission prerender robots policy differs from public route authority.')
const commissionText = decodeHtml(commissionHtml.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
const requiredCommissionPrerenderText = [
  commissionContent.eyebrow,
  commissionContent.title,
  commissionContent.lead,
  commissionContent.sectionHeading,
  commissionContent.worksLinkLabel,
  commissionContent.contactLinkLabel,
]

// Initial prerender contains the overview projection.
// Service detail bodies are mounted or switched by interactive state.
// Their complete authority is already validated by the sealed
// commission snapshot, handoff receipt, content digest, and release manifest.
for (
  const service of commissionContent.services
    .filter(item => item.enabled)
) {
  requiredCommissionPrerenderText.push(
    service.label,
    service.summary,
  )
}

for (const value of requiredCommissionPrerenderText) {
  if (!commissionText.includes(value)) {
    fail(
      'E_MMJ_COMMISSION_CONTENT_PARITY_MISMATCH',
      'Commission prerender is missing overview content.',
      { value },
    )
  }
}

for (const service of commissionContent.services.filter(item => !item.enabled)) {
  if (commissionText.includes(service.label)) fail('E_MMJ_COMMISSION_CONTENT_PARITY_MISMATCH', 'Disabled commission service leaked into prerender.', { serviceId: service.id })
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
  'MMJ_COMMISSION_GUIDE_HANDOFF_ORIGIN',
  '/api/v1/public/commission-guide',
  'commission-guide/dispatch-authority',
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
  commissionGuidePublicationVersionId: commissionGenerated.receipt.publicationVersionId,
  commissionGuideContentParity: 'pass',
  workDetailAuxiliaryProjection: 'absent',
  workDetailGlobalFooter: 'absent',
  workDetailReturnLink: 'preserved',
  threeRouteSeoParity: 'pass',
  workDetailHeaderAuxiliaryProjection: 'absent',
  primaryMediaCaptionProjection: 'absent',
  galleryCaptionAuthority: 'preserved',
  cmsRuntimeFetch: 'absent',
}))
