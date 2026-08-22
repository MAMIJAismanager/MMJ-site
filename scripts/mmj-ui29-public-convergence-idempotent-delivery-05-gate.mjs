import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const pages = await readFile('.github/workflows/pages.yml', 'utf8')
const admission = await readFile('scripts/mmj-ui29-public-convergence-delivery-admission.mjs', 'utf8')
const helper = await readFile('scripts/lib/mmj-ui29-public-convergence.mjs', 'utf8')
assert.match(pages, /delivery-admission:/)
assert.match(pages, /MMJ_CMS_PUBLIC_CONVERGENCE_DELIVERY_ADMISSION_ENDPOINT/)
assert.match(pages, /needs: delivery-admission/)
assert.match(pages, /needs\.delivery-admission\.outputs\.build_authorized == 'true'/)
assert.match(pages, /Legacy convergence source predates MMJ-PUBLIC-CONVERGENCE-IDEMPOTENT-DELIVERY-05/)
assert.equal((pages.match(/actions\/deploy-pages@/g) ?? []).length, 1)
assert.match(pages, /- mmj_public_converge/)
assert.doesNotMatch(pages.slice(pages.indexOf('on:'), pages.indexOf('permissions:')), /^\s*push\s*:/m)
assert.match(admission, /MMJ-PUBLIC-CONVERGENCE-DELIVERY-ADMISSION-V1/)
assert.match(admission, /build_authorized=/)
assert.match(admission, /result\.buildAuthorized === true/)
assert.match(helper, /derivePublicConvergenceDeliveryIdentity/)
console.log('PASS_05_PUBLIC_DELIVERY_ADMISSION_GATE')
