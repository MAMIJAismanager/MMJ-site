import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

import {
  canonicalDigest,
  computeProducerRevision,
  createBuildInputLock,
  createPublicReleaseManifest,
  createRouteManifest,
  prettyJson,
  sha256,
  verifyGeneratedArtifactSet,
} from './lib/mmj-ui29-public-contract.mjs'

const PATCH = 'MMJ-PUBLIC-BUILD-INPUT-LOCK-OBSERVED-HEAD-AND-ARTIFACT-REVERIFY-AUTHORITY-SEPARATION-R1'
const R14B = '0.7.20-mmj-portfolio-legacy-optional-year-r14b'
const R14C = '0.7.21-mmj-immediate-publication-fast-lane-r14c'
const root = process.cwd()
const origin = 'https://cms.mamajing.work'
const mediaBaseUrl = 'https://media.mamajing.work'
const clone = value => structuredClone(value)
const assert = (condition, message) => { if (!condition) throw new Error(`FAIL_${PATCH}: ${message}`) }
let passCount = 0

function pass(name) {
  passCount += 1
  process.stdout.write(`${name}: PASS\n`)
}

function reject(name, callback, expectedMessage) {
  let caught = null
  try { callback() } catch (error) { caught = error }
  assert(caught, `${name}: expected rejection`)
  if (expectedMessage) assert(String(caught.message).includes(expectedMessage), `${name}: unexpected error ${caught.message}`)
  pass(name)
}

const asset = Object.freeze({
  schemaVersion: 1,
  id: 'ast_locktest1',
  kind: 'image',
  label: 'Lock test image',
  caption: null,
  credit: null,
  defaultRenditionId: 'primary-webp',
  renditions: [Object.freeze({
    id: 'primary-webp',
    purpose: 'primary',
    objectKey: 'assets/image/ast_locktest1/primary.webp',
    mediaType: 'image/webp',
    byteSize: 128,
    sha256: '4'.repeat(64),
    metadata: Object.freeze({ width: 1200, height: 900 }),
  })],
  altText: 'Lock test accessible description.',
})

const project = Object.freeze({
  schemaVersion: 1,
  id: 'prj_locktest1',
  slug: 'lock-test',
  title: 'Lock test',
  category: 'video',
  gatewayCategoryIds: ['video-production'],
  roles: [],
  tags: [Object.freeze({ token: 'lock-test', label: 'Lock test' })],
  timing: Object.freeze({ year: 2026, releaseDate: '2026-08-19' }),
  client: null,
  summary: '',
  description: '',
  post: Object.freeze({
    comment: '',
    mediaItems: [Object.freeze({ position: 0, assetId: asset.id })],
    tags: [Object.freeze({ token: 'lock-test', label: 'Lock test' })],
  }),
  credits: [],
  externalLinks: [],
  relatedProjectIds: [],
  assets: Object.freeze({
    coverAssetId: asset.id,
    backdropAssetId: null,
    primaryAssetId: asset.id,
    galleryAssetIds: [],
  }),
  featured: false,
  order: 1,
  seo: Object.freeze({
    title: 'Lock test | MMJ',
    description: '',
    ogAssetId: asset.id,
    indexable: true,
  }),
})

const snapshot = Object.freeze({
  assets: [asset],
  projects: [project],
  publicationCutoff: '2026-08-19T00:00:00.000Z',
  schemaVersion: 1,
  sourceDigest: '1'.repeat(64),
})

const snapshotBytes = Buffer.from(prettyJson(snapshot), 'utf8')
const snapshotDigest = sha256(snapshotBytes)
const collectionVersionId = `pcol_${snapshotDigest.slice(0, 26)}`
const receiptId = `phnd_${'3'.repeat(26)}`
const routeSlugs = [project.slug]
const routes = [`/works/${project.slug}`]

function makeHead(producerRelease) {
  return {
    schemaVersion: 1,
    collectionVersionId,
    snapshotObjectKey: `portfolio-collections/v1/snapshots/${collectionVersionId}.json`,
    snapshotDigest,
    sourceHeadSetDigest: snapshot.sourceDigest,
    sourceDigest: snapshot.sourceDigest,
    publicationCutoff: snapshot.publicationCutoff,
    projectCount: 1,
    assetCount: 1,
    routeCount: 1,
    generation: 79,
    previousCollectionVersionId: null,
    previousSnapshotDigest: null,
    handoffReceiptId: receiptId,
    promotedAt: snapshot.publicationCutoff,
    producerRelease,
  }
}

function makeReceipt(producerRelease) {
  return {
    schemaVersion: 1,
    receiptId,
    collectionVersionId,
    collectionHeadGeneration: 79,
    snapshotObjectKey: `portfolio-collections/v1/snapshots/${collectionVersionId}.json`,
    snapshotDigest,
    sourceHeadSetDigest: snapshot.sourceDigest,
    sourceDigest: snapshot.sourceDigest,
    publicationCutoff: snapshot.publicationCutoff,
    projectCount: 1,
    assetCount: 1,
    routeCount: 1,
    routesDigest: canonicalDigest(routeSlugs),
    routeSlugs,
    activePublicationEvidence: [{
      projectId: project.id,
      publicationVersionId: 'pver_lock_test',
      versionSnapshotDigest: '5'.repeat(64),
      publicationDigest: '6'.repeat(64),
    }],
    producerRelease,
    createdAt: snapshot.publicationCutoff,
  }
}

const generation = Object.freeze({
  deliveryKey: `pdispatch_v1_${'8'.repeat(64)}`,
  generationContract: 'mmj-portfolio-dispatch-generation-identity-v1',
  generationDigest: '9'.repeat(64),
  sourceWorkbookRevision: 1077,
  collectionHeadRevision: 79,
})

async function writeStage(parent, name, producerRelease, mode) {
  const stage = resolve(parent, name)
  await mkdir(stage)
  const receipt = makeReceipt(producerRelease)
  const receiptBytes = Buffer.from(prettyJson(receipt), 'utf8')
  const handoffReceiptDigest = sha256(receiptBytes)
  const fullHead = makeHead(producerRelease)
  const head = mode === 'dispatch'
    ? (() => {
        const value = clone(fullHead)
        delete value.producerRelease
        return value
      })()
    : fullHead
  const lock = createBuildInputLock({
    upstreamOrigin: origin,
    head,
    receipt,
    handoffReceiptDigest,
    generation: mode === 'dispatch' ? generation : null,
  })
  const lockBytes = Buffer.from(prettyJson(lock), 'utf8')
  const routeManifest = createRouteManifest(routes, snapshotDigest)
  const routeBytes = Buffer.from(prettyJson(routeManifest), 'utf8')
  const producerRevision = await computeProducerRevision(root)
  const manifest = createPublicReleaseManifest({
    snapshotDigest,
    routesFileDigest: sha256(routeBytes),
    producerRevision,
    handoffReceiptDigest,
    projectCount: 1,
    assetCount: 1,
    publicationCutoff: snapshot.publicationCutoff,
    generatedAt: receipt.createdAt,
    collectionVersionId,
    handoffReceiptId: receipt.receiptId,
    sourceDigest: receipt.sourceDigest,
    buildInputLockDigest: sha256(lockBytes),
  })
  await Promise.all([
    writeFile(resolve(stage, 'portfolio.snapshot.json'), snapshotBytes),
    writeFile(resolve(stage, 'portfolio.handoff.json'), receiptBytes),
    writeFile(resolve(stage, 'portfolio.routes.json'), routeBytes),
    writeFile(resolve(stage, 'portfolio.build-input-lock.json'), lockBytes),
    writeFile(resolve(stage, 'public-release.manifest.json'), Buffer.from(prettyJson(manifest), 'utf8')),
  ])
  return { stage, receipt, lock }
}

const temp = await mkdtemp(resolve(tmpdir(), 'mmj-lock-reverify-r1-'))
try {
  const r14cHead = makeHead(R14C)
  const r14cReceipt = makeReceipt(R14C)
  const receiptDigest = sha256(Buffer.from(prettyJson(r14cReceipt), 'utf8'))
  const currentLock = createBuildInputLock({
    upstreamOrigin: origin,
    head: r14cHead,
    receipt: r14cReceipt,
    handoffReceiptDigest: receiptDigest,
    generation: null,
  })
  assert(currentLock.schemaVersion === 1, 'current-head creation did not produce V1 lock')
  assert(currentLock.producerRelease === R14C, 'current-head lock did not preserve receipt producer')
  pass('observed current-head R14C producer parity')

  reject('observed current-head cross-producer rejection', () => {
    createBuildInputLock({
      upstreamOrigin: origin,
      head: makeHead(R14B),
      receipt: makeReceipt(R14C),
      handoffReceiptDigest: receiptDigest,
      generation: null,
    })
  }, 'Build input head and receipt producer releases differ')

  reject('observed current-head missing producer rejection', () => {
    const head = makeHead(R14C)
    delete head.producerRelease
    createBuildInputLock({
      upstreamOrigin: origin,
      head,
      receipt: r14cReceipt,
      handoffReceiptDigest: receiptDigest,
      generation: null,
    })
  }, '$buildInputLock.input.head.producerRelease')

  for (const producerRelease of [R14B, R14C]) {
    const label = producerRelease === R14B ? 'R14B' : 'R14C'
    const v1 = await writeStage(temp, `v1-${label}`, producerRelease, 'current')
    const verifiedV1 = await verifyGeneratedArtifactSet(v1.stage, root, { expectedOrigin: origin, mediaBaseUrl })
    assert(verifiedV1.lock.schemaVersion === 1, `${label} V1 reverify schema drifted`)
    assert(verifiedV1.lock.producerRelease === producerRelease, `${label} V1 reverify producer drifted`)
    pass(`${label} V1 artifact reverify without synthetic head producer`)

    const v2 = await writeStage(temp, `v2-${label}`, producerRelease, 'dispatch')
    const verifiedV2 = await verifyGeneratedArtifactSet(v2.stage, root, { expectedOrigin: origin, mediaBaseUrl })
    assert(verifiedV2.lock.schemaVersion === 2, `${label} V2 reverify schema drifted`)
    assert(verifiedV2.lock.producerRelease === producerRelease, `${label} V2 reverify producer drifted`)
    pass(`${label} V2 artifact reverify without synthetic head producer`)
  }

  const tampered = await writeStage(temp, 'v1-tampered', R14B, 'current')
  const tamperedLock = { ...tampered.lock, producerRelease: R14C }
  await writeFile(resolve(tampered.stage, 'portfolio.build-input-lock.json'), Buffer.from(prettyJson(tamperedLock), 'utf8'))
  let tamperError = null
  try {
    await verifyGeneratedArtifactSet(tampered.stage, root, { expectedOrigin: origin, mediaBaseUrl })
  } catch (error) {
    tamperError = error
  }
  assert(tamperError?.code === 'E_MMJ_UI29_GENERATED_STAGE_INVALID', 'tampered lock producer did not fail generated-stage validation')
  assert(String(tamperError?.message).includes('does not match handoff receipt'), 'tampered producer failure attribution drifted')
  pass('tampered persisted lock producer rejected against receipt')

  console.log(JSON.stringify({
    event: 'PASS_MMJ_PUBLIC_BUILD_INPUT_LOCK_OBSERVED_HEAD_AND_ARTIFACT_REVERIFY_AUTHORITY_SEPARATION_R1_TESTS',
    release: PATCH,
    testCount: passCount,
    observedHeadProducerParity: true,
    artifactReverifyUsesObservedHeadProducer: false,
    receiptProducerPreserved: true,
    v1Reverify: true,
    v2Reverify: true,
  }))
} finally {
  await rm(temp, { recursive: true, force: true })
}
