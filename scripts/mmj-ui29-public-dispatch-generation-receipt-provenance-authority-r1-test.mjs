import assert from 'node:assert/strict'
import {
  createBuildInputLock,
} from './lib/mmj-ui29-public-contract.mjs'

const PATCH = 'MMJ-PUBLIC-DISPATCH-GENERATION-RECEIPT-PROVENANCE-AUTHORITY-R1'
const R14B = '0.7.20-mmj-portfolio-legacy-optional-year-r14b'
const R14C = '0.7.21-mmj-immediate-publication-fast-lane-r14c'
const FUTURE = '0.7.22-mmj-portfolio-future'

let passCount = 0
const pass = (name, fn) => {
  fn()
  passCount += 1
  process.stdout.write(`${name}: PASS\n`)
}
const reject = (name, expectedCode, fn) => {
  let caught = null
  try { fn() } catch (error) { caught = error }
  assert.equal(caught?.code, expectedCode, `${name}: wrong error code`)
  passCount += 1
  process.stdout.write(`${name}: PASS\n`)
}

const baseHead = Object.freeze({
  collectionVersionId: 'pcol_provenance_r1',
  generation: 79,
  snapshotDigest: '1'.repeat(64),
  sourceDigest: '2'.repeat(64),
  sourceHeadSetDigest: '3'.repeat(64),
  publicationCutoff: '2026-08-19T06:35:55.792Z',
  projectCount: 108,
  assetCount: 142,
  routeCount: 108,
})

const receipt = producerRelease => Object.freeze({
  receiptId: 'phnd_provenance_r1',
  routesDigest: '4'.repeat(64),
  createdAt: '2026-08-19T06:35:55.792Z',
  producerRelease,
})

const generation = Object.freeze({
  deliveryKey: `pdispatch_v1_${'5'.repeat(64)}`,
  generationContract: 'mmj-portfolio-dispatch-generation-identity-v1',
  generationDigest: '6'.repeat(64),
  sourceWorkbookRevision: 1077,
  collectionHeadRevision: 79,
})

const lockInput = (head, receiptValue, generationValue = null) => ({
  upstreamOrigin: 'https://cms.mamajing.work',
  head,
  receipt: receiptValue,
  handoffReceiptDigest: '7'.repeat(64),
  ...(generationValue === null ? {} : { generation: generationValue }),
})

pass('current R14B head and receipt exact producer parity', () => {
  const lock = createBuildInputLock(lockInput({ ...baseHead, producerRelease: R14B }, receipt(R14B)))
  assert.equal(lock.schemaVersion, 1)
  assert.equal(lock.producerRelease, R14B)
})

pass('current R14C head and receipt exact producer parity', () => {
  const lock = createBuildInputLock(lockInput({ ...baseHead, producerRelease: R14C }, receipt(R14C)))
  assert.equal(lock.schemaVersion, 1)
  assert.equal(lock.producerRelease, R14C)
})

reject('current R14B head with R14C receipt is rejected', 'E_MMJ_UI29_GENERATED_STAGE_INVALID', () => {
  createBuildInputLock(lockInput({ ...baseHead, producerRelease: R14B }, receipt(R14C)))
})

reject('current R14C head with R14B receipt is rejected', 'E_MMJ_UI29_GENERATED_STAGE_INVALID', () => {
  createBuildInputLock(lockInput({ ...baseHead, producerRelease: R14C }, receipt(R14B)))
})

reject('current head missing producer is rejected', 'E_MMJ_UI29_GENERATED_STAGE_INVALID', () => {
  createBuildInputLock(lockInput(baseHead, receipt(R14B)))
})

pass('dispatch historical R14B receipt requires no synthetic head producer', () => {
  const lock = createBuildInputLock(lockInput(baseHead, receipt(R14B), generation))
  assert.equal(lock.schemaVersion, 2)
  assert.equal(lock.adoptionMode, 'dispatch-generation')
  assert.equal(lock.producerRelease, R14B)
})

pass('dispatch R14C receipt requires no synthetic head producer', () => {
  const lock = createBuildInputLock(lockInput(baseHead, receipt(R14C), generation))
  assert.equal(lock.schemaVersion, 2)
  assert.equal(lock.producerRelease, R14C)
})

pass('dispatch synthetic head producer is not provenance authority', () => {
  const lock = createBuildInputLock(lockInput({ ...baseHead, producerRelease: R14C }, receipt(R14B), generation))
  assert.equal(lock.producerRelease, R14B)
})

reject('dispatch unknown future receipt producer is rejected', 'E_MMJ_UI29_GENERATED_STAGE_INVALID', () => {
  createBuildInputLock(lockInput(baseHead, receipt(FUTURE), generation))
})

pass('dispatch build input lock V2 identity is deterministic', () => {
  const input = lockInput(baseHead, receipt(R14B), generation)
  const a = createBuildInputLock(input)
  const b = createBuildInputLock(input)
  assert.deepEqual(a, b)
  assert.equal(a.producerRelease, R14B)
  assert.equal(a.deliveryKey, generation.deliveryKey)
  assert.equal(a.generationDigest, generation.generationDigest)
})

console.log(JSON.stringify({
  event: 'PASS_MMJ_PUBLIC_DISPATCH_GENERATION_RECEIPT_PROVENANCE_AUTHORITY_R1_TESTS',
  release: PATCH,
  testCount: passCount,
  currentHeadReceiptExactParity: true,
  dispatchReceiptProducerAuthority: true,
  syntheticHeadProducerRequired: false,
  exactReceiptProducerPreserved: true,
}))
