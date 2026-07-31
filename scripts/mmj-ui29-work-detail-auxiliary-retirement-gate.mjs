import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')

function fail(code, message, details = undefined) {
  const error = new Error(message)
  error.name = code
  error.code = code
  error.details = details
  throw error
}

const [header, page, css] = await Promise.all([
  read('app/components/work/WorkDetailHeader.vue'),
  read('app/pages/works/[slug].vue'),
  read('app/assets/css/work-detail.css'),
])

for (const signature of [
  'data-mm-work-meta-line',
  'data-mm-work-roles',
  'data-mm-work-release-date',
  'project.displayMeta.metaLine',
  'project.displayMeta.timing.releaseDate',
  'v-for="role in project.roles"',
  'aria-label="담당 역할"',
]) {
  if (header.includes(signature)) {
    fail(
      'E_MMJ_WORK_DETAIL_AUXILIARY_HEADER_RESIDUE',
      'Retired work-detail header projection remains.',
      { signature },
    )
  }
}

for (const signature of [
  'data-mm-work-detail-header',
  'project.category.label',
  'project.title',
]) {
  if (!header.includes(signature)) {
    fail(
      'E_MMJ_WORK_DETAIL_HEADER_AUTHORITY_REGRESSION',
      'Required work-detail header projection is missing.',
      { signature },
    )
  }
}

for (const signature of [
  'definePageMeta',
  'hideSiteFooter: true',
]) {
  if (!page.includes(signature)) {
    fail(
      'E_MMJ_WORK_DETAIL_SITE_FOOTER_SUPPRESSION_MISSING',
      'Work-detail route does not suppress the global site footer.',
      { signature },
    )
  }
}

for (const signature of [
  'mm-work-detail__footer',
  'mm-work-detail__all-works',
  'data-mm-work-return-link',
  'returnTarget.href',
  'returnTarget.label',
]) {
  if (!page.includes(signature)) {
    fail(
      'E_MMJ_WORK_DETAIL_RETURN_LINK_REMOVED',
      'Internal work return navigation was removed.',
      { signature },
    )
  }
}

for (const signature of [
  'useSeoMeta',
  'project.seo.title',
  'project.seo.description',
  'project.seo.indexable',
  'ogImage',
]) {
  if (!page.includes(signature)) {
    fail(
      'E_MMJ_WORK_DETAIL_SEO_AUTHORITY_REGRESSION',
      'Work-detail SEO authority is missing.',
      { signature },
    )
  }
}

for (const signature of [
  '.mm-work-detail-header__meta',
  '.mm-work-detail-header__roles',
  '.mm-work-detail-header__release',
  'minmax(16rem, 0.4fr)',
]) {
  if (css.includes(signature)) {
    fail(
      'E_MMJ_WORK_DETAIL_AUXILIARY_CSS_RESIDUE',
      'Retired work-detail auxiliary CSS remains.',
      { signature },
    )
  }
}

const desktopHeaderBlock = css.match(
  /@media\s*\(min-width:\s*80rem\)\s*\{[\s\S]*?\.mm-work-detail-header\s*\{([\s\S]*?)\}[\s\S]*?\}/,
)?.[1] ?? null

if (
  desktopHeaderBlock === null
  || !desktopHeaderBlock.includes('grid-template-columns: minmax(0, 1fr)')
  || !desktopHeaderBlock.includes('max-width: var(--mm-copy-max)')
) {
  fail(
    'E_MMJ_WORK_DETAIL_HEADER_REFLOW_INVALID',
    'Desktop work-detail header is not sealed as a single-column flow.',
  )
}

console.log(JSON.stringify({
  event: 'PASS_MMJ_PUBLIC_WORK_DETAIL_AUXILIARY_SURFACE_RETIREMENT_R1',
  headerMetaProjection: 'absent',
  roleProjection: 'absent',
  releaseDateProjection: 'absent',
  desktopHeaderColumns: 1,
  globalSiteFooter: 'absent',
  internalReturnLink: 'preserved',
  cmsDataAuthority: 'preserved',
  seoAuthority: 'preserved',
  cssResidue: 0,
}))
