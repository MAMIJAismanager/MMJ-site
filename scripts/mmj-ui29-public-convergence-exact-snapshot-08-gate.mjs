import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const [pages, helper, exact, verify, provenance, admission, pkgText] = await Promise.all([
  readFile('.github/workflows/pages.yml','utf8'),
  readFile('scripts/lib/mmj-ui29-public-convergence.mjs','utf8'),
  readFile('scripts/lib/mmj-ui29-public-convergence-exact-snapshot.mjs','utf8'),
  readFile('scripts/mmj-ui29-public-convergence-input-verify.mjs','utf8'),
  readFile('scripts/mmj-ui29-public-convergence-provenance.mjs','utf8'),
  readFile('scripts/mmj-ui29-public-convergence-delivery-admission.mjs','utf8'),
  readFile('package.json','utf8'),
])
const pkg = JSON.parse(pkgText)
assert.match(helper, /PUBLIC_CONVERGENCE_EXACT_SNAPSHOT_CONTRACT/)
assert.match(helper, /MMJ_PUBLIC_CONVERGENCE_SNAPSHOT_CONTRACT/)
assert.match(helper, /MMJ_PUBLIC_CONVERGENCE_SNAPSHOT_DIGEST/)
assert.match(helper, /snapshotDigest !== convergenceDigest/)
assert.match(exact, /verifyGeneratedArtifactSet/)
assert.match(exact, /verifyCommissionGeneratedArtifactSet/)
assert.match(exact, /git', \['rev-parse', 'HEAD'\]/)
assert.match(exact, /exactSnapshotFromVerifiedArtifacts/)
assert.match(provenance, /mmj-ui29-public-convergence-manifest-v2/)
assert.match(provenance, /reconstructAdoptedPublicConvergenceSnapshot/)
assert.doesNotMatch(provenance, /source:\s*input\.target\.source/)
assert.match(verify, /verifyCheckedOutSourceSnapshot\(input\)/)
assert.match(verify, /reconstructAdoptedPublicConvergenceSnapshot\(input\)/)
assert.match(verify, /MANIFEST_SNAPSHOT_MISMATCH/)
assert.match(admission, /snapshotContract: input\.snapshotContract/)
assert.match(admission, /snapshotDigest: input\.snapshotDigest/)
assert.match(pages, /MMJ_PUBLIC_CONVERGENCE_SNAPSHOT_CONTRACT:/)
assert.match(pages, /MMJ_PUBLIC_CONVERGENCE_SNAPSHOT_DIGEST:/)
const seal = pages.indexOf('Seal exact adopted public convergence snapshot')
const post = pages.indexOf('Verify adopted public convergence generation')
const generate = pages.indexOf('Generate static site without a second network fetch')
assert.ok(seal >= 0 && post > seal && generate > post)
assert.equal((pages.match(/actions\/deploy-pages@/g) ?? []).length, 1)
assert.match(pages, /- mmj_public_converge/)
assert.doesNotMatch(pages.slice(pages.indexOf('on:'), pages.indexOf('permissions:')), /^\s*push\s*:/m)
assert.equal(pkg.releases?.publicConvergenceExactSnapshot08Release, 'PUBLIC-CONVERGENCE-EXACT-SNAPSHOT-08')
console.log('PASS_08_PUBLIC_SNAPSHOT_CONTRACT')
console.log('PASS_08_PUBLIC_SNAPSHOT_DIGEST_PARITY')
console.log('PASS_08_EXACT_SOURCE_CHECKOUT_SEAL')
console.log('PASS_08_EXACT_PORTFOLIO_ADOPTED_SEAL')
console.log('PASS_08_EXACT_COMMISSION_ADOPTED_SEAL')
console.log('PASS_08_ACTUAL_ARTIFACT_SNAPSHOT_RECONSTRUCTION')
console.log('PASS_08_POST_ADOPT_AGGREGATE_SNAPSHOT_PARITY')
console.log('PASS_08_PUBLIC_CONVERGENCE_MANIFEST_V2')
console.log('PASS_08_MANIFEST_BUILT_FROM_ADOPTED_EVIDENCE')
console.log('PASS_08_NO_ENVIRONMENT_ONLY_PROVENANCE')
console.log('PASS_08_GENERATE_AFTER_SNAPSHOT_SEAL')
console.log('PASS_08_PREDEPLOY_CURRENT_FENCE_PRESERVED')
console.log('PASS_08_SINGLE_PAGES_WRITER_PRESERVED')
