import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, relative, resolve, win32 } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  PRIMARY_RENDITION_PURPOSE,
  hasExactPrimaryRendition,
} from '../shared/resolver/media-renderability.ts'
import {
  validateSnapshot,
} from './lib/mmj-ui29-public-contract.mjs'

const PATCH = 'MMJ-PUBLIC-WORK-DETAIL-MEDIA-RENDERABILITY-ADMISSION-CLOSURE-R1-R2'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const authority = resolve(root, 'shared/resolver/media-renderability.ts')
const relativeAuthority = relative(root, authority)

assert.equal(PRIMARY_RENDITION_PURPOSE, 'primary')
assert.equal(hasExactPrimaryRendition([{ purpose: 'primary' }]), true)
assert.equal(hasExactPrimaryRendition([{ purpose: 'thumbnail' }]), false)
assert.equal(hasExactPrimaryRendition([{ purpose: 'preview' }]), false)
assert.equal(hasExactPrimaryRendition([{ purpose: 'download' }]), false)
assert.equal(hasExactPrimaryRendition([{ purpose: 'preview' }, { purpose: 'primary' }]), true)
assert.equal(hasExactPrimaryRendition([]), false)
assert.equal(hasExactPrimaryRendition(null), false)
assert.equal(relativeAuthority.startsWith('..'), false)
assert.equal(relativeAuthority.includes('media-renderability.ts'), true)

const windowsRoot = 'D:\\11124\\m2\\MMJ-site'
const windowsAuthority = win32.resolve(windowsRoot, 'shared\\resolver\\media-renderability.ts')
const windowsRelative = win32.relative(windowsRoot, windowsAuthority)
const escapedWindowsAuthority = win32.resolve(windowsRoot, '..\\shared\\resolver\\media-renderability.ts')
assert.equal(windowsRelative.startsWith('..'), false)
assert.equal(win32.relative(windowsRoot, escapedWindowsAuthority).startsWith('..'), true)

const contractSource = await readFile(resolve(root, 'scripts/lib/mmj-ui29-public-contract.mjs'), 'utf8')
const runtimeSource = await readFile(resolve(root, 'shared/resolver/media-resolution.ts'), 'utf8')
assert.match(contractSource, /\.\.\/\.\.\/shared\/resolver\/media-renderability\.ts/)
assert.match(runtimeSource, /from '\.\/media-renderability'/)
assert.doesNotMatch(contractSource, /media-renderability\.mjs/)
assert.doesNotMatch(runtimeSource, /media-renderability\.mjs/)

const HEX = 'a'.repeat(64)
const assetId = 'ast_r2primary1'
const rendition = {
  id: 'rend_r2_primary',
  purpose: 'primary',
  objectKey: `assets/image/${assetId}/primary.webp`,
  mediaType: 'image/webp',
  byteSize: 128,
  sha256: HEX,
  metadata: { width: 16, height: 16 },
}
const asset = {
  schemaVersion: 1,
  id: assetId,
  kind: 'image',
  label: 'R2 primary',
  caption: null,
  credit: null,
  defaultRenditionId: rendition.id,
  renditions: [rendition],
  altText: 'R2 primary',
}
const tag = { token: 'fixture', label: 'Fixture' }
const project = {
  schemaVersion: 1,
  id: 'prj_r2fixture1',
  slug: 'r2-fixture',
  title: 'R2 Fixture',
  category: 'choreography',
  gatewayCategoryIds: ['choreography'],
  roles: [],
  tags: [tag],
  timing: { year: null, releaseDate: null },
  client: null,
  summary: 'R2 summary',
  description: 'R2 description',
  post: { comment: 'R2 description', mediaItems: [{ position: 0, assetId }], tags: [tag] },
  credits: [],
  externalLinks: [],
  relatedProjectIds: [],
  assets: { coverAssetId: assetId, backdropAssetId: null, primaryAssetId: assetId, galleryAssetIds: [] },
  featured: false,
  order: 0,
  seo: { title: 'R2 Fixture', description: 'R2 description', ogAssetId: assetId, indexable: false },
}
const snapshot = {
  schemaVersion: 1,
  sourceDigest: 'b'.repeat(64),
  publicationCutoff: '2026-08-11T00:00:00.000Z',
  projects: [project],
  assets: [asset],
}
assert.deepEqual(validateSnapshot(snapshot).routes, ['/works/r2-fixture'])

console.log(JSON.stringify({
  event: 'PASS_MMJ_PUBLIC_WORK_DETAIL_MEDIA_RENDERABILITY_ADMISSION_CLOSURE_R1_R2',
  release: PATCH,
  authorityPath: 'shared/resolver/media-renderability.ts',
  buildImportMode: 'node-native-typescript',
  runtimeImportMode: 'nuxt-typescript-graph',
  exactPrimaryPreserved: true,
  parentRootEscapeRejected: true,
}))
