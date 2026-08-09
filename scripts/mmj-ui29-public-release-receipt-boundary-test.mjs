import assert from 'node:assert/strict'

import {
  PUBLIC_RELEASE_ALLOWED_DIRECTORIES,
  PUBLIC_RELEASE_RECEIPT_PATH,
  PublicReleaseReceiptPolicyError,
  validatePublicReleaseTree,
} from './lib/mmj-ui29-public-release-receipt-policy.mjs'

const EXPECTED_RECEIPT_PATH = 'public/.well-known/mmj-public-release.json'
const exactTree = () => [
  { path: 'public', kind: 'directory' },
  { path: 'public/.well-known', kind: 'directory' },
  { path: EXPECTED_RECEIPT_PATH, kind: 'file' },
]

let passCount = 0
function pass(name, callback) {
  callback()
  passCount += 1
  process.stdout.write(`${name}: PASS\n`)
}
function reject(name, callback, pattern = /public/i) {
  assert.throws(callback, error => (
    error instanceof PublicReleaseReceiptPolicyError
    && pattern.test(error.message)
  ))
  passCount += 1
  process.stdout.write(`${name}: PASS\n`)
}

pass('canonical receipt path authority', () => {
  assert.equal(PUBLIC_RELEASE_RECEIPT_PATH, EXPECTED_RECEIPT_PATH)
  assert.deepEqual(PUBLIC_RELEASE_ALLOWED_DIRECTORIES, ['public', 'public/.well-known'])
})
pass('public root absent admitted', () => {
  assert.deepEqual(validatePublicReleaseTree([]), { present: false, receiptPath: null })
})
pass('exact receipt tree admitted', () => {
  assert.deepEqual(validatePublicReleaseTree(exactTree()), {
    present: true,
    receiptPath: EXPECTED_RECEIPT_PATH,
  })
})
reject('empty public root denied', () => validatePublicReleaseTree([
  { path: 'public', kind: 'directory' },
]), /required public directory is missing/)
reject('empty well-known denied', () => validatePublicReleaseTree([
  { path: 'public', kind: 'directory' },
  { path: 'public/.well-known', kind: 'directory' },
]), /required public receipt is missing/)
reject('extra public file denied', () => validatePublicReleaseTree([
  ...exactTree(),
  { path: 'public/debug.json', kind: 'file' },
]), /unexpected public entry/)
reject('extra well-known file denied', () => validatePublicReleaseTree([
  ...exactTree(),
  { path: 'public/.well-known/debug.json', kind: 'file' },
]), /unexpected public entry/)
reject('extra public directory denied', () => validatePublicReleaseTree([
  ...exactTree(),
  { path: 'public/assets', kind: 'directory' },
]), /unexpected public entry/)
reject('receipt symlink denied', () => validatePublicReleaseTree([
  { path: 'public', kind: 'directory' },
  { path: 'public/.well-known', kind: 'directory' },
  { path: EXPECTED_RECEIPT_PATH, kind: 'symlink' },
]), /regular file/)
reject('public symlink denied', () => validatePublicReleaseTree([
  { path: 'public', kind: 'symlink' },
]), /directory kind is invalid/)
reject('receipt path drift denied', () => validatePublicReleaseTree([
  { path: 'public', kind: 'directory' },
  { path: 'public/.well-known', kind: 'directory' },
  { path: 'public/.well-known/public-release.json', kind: 'file' },
]), /unexpected public entry/)

console.log(JSON.stringify({
  event: 'PASS_MMJ_UI29_PUBLIC_RELEASE_RECEIPT_BOUNDARY_ADMISSION_R1',
  testCount: passCount,
  receiptPath: PUBLIC_RELEASE_RECEIPT_PATH,
}))
