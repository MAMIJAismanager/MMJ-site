import { readFile } from 'node:fs/promises'

const PATCH = 'MMJ-PUBLIC-DISPATCH-GENERATION-RECEIPT-PROVENANCE-AUTHORITY-R1'
const contract = await readFile(new URL('./lib/mmj-ui29-public-contract.mjs', import.meta.url), 'utf8')
const adopt = await readFile(new URL('./mmj-ui29-portfolio-adopt.mjs', import.meta.url), 'utf8')
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

const fail = message => { throw new Error(`FAIL_${PATCH}: ${message}`) }

for (const token of [
  "admitProducerRelease(input.receipt.producerRelease, '$buildInputLock.input.receipt.producerRelease', code, 'Receipt')",
  'if (!input.generation) {',
  "admitProducerRelease(input.head.producerRelease, '$buildInputLock.input.head.producerRelease', code, 'Head')",
  'input.head.producerRelease !== input.receipt.producerRelease',
  'producerRelease: input.receipt.producerRelease',
]) {
  if (!contract.includes(token)) fail(`required contract token missing: ${token}`)
}

const dispatchStart = adopt.indexOf('async function dispatchGenerationTransaction()')
const dispatchEnd = adopt.indexOf('\nasync function adopt(', dispatchStart)
if (dispatchStart < 0 || dispatchEnd < 0) fail('dispatch-generation function boundary missing')
const dispatchSource = adopt.slice(dispatchStart, dispatchEnd)

if (dispatchSource.includes("fetchJson('/api/v1/public/portfolio-snapshot/head'")) {
  fail('dispatch-generation performs forbidden live head fetch')
}

const syntheticHeadStart = dispatchSource.indexOf('const head = {')
const syntheticHeadEnd = dispatchSource.indexOf('\n  const generation = Object.freeze', syntheticHeadStart)
if (syntheticHeadStart < 0 || syntheticHeadEnd < 0) fail('synthetic dispatch head block missing')
const syntheticHead = dispatchSource.slice(syntheticHeadStart, syntheticHeadEnd)
if (syntheticHead.includes('producerRelease')) fail('synthetic dispatch head owns fake producer provenance')

if (packageJson.mmjPublicDispatchGenerationReceiptProvenanceAuthorityR1Release !== PATCH) {
  fail('package release marker mismatch')
}
if (typeof packageJson.scripts?.['gate:public-dispatch-generation-receipt-provenance-authority-r1'] !== 'string') {
  fail('package gate script missing')
}

console.log(JSON.stringify({
  event: 'PASS_MMJ_PUBLIC_DISPATCH_GENERATION_RECEIPT_PROVENANCE_AUTHORITY_R1_STATIC_GATE',
  release: PATCH,
  receiptProducerAuthority: true,
  currentHeadReceiptParityPreserved: true,
  liveHeadFetchInDispatch: false,
  fakeHeadProvenance: false,
}))
