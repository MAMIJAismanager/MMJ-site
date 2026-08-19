import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  matchesStaticSeoDescription,
} from './lib/mmj-ui29-static-seo-description-parity.mjs'

let passCount = 0
function pass(name, callback) {
  callback()
  passCount += 1
  process.stdout.write(`${name}: PASS\n`)
}

function expect(value, expected, message) {
  if (value !== expected) throw new Error(`${message}: expected ${expected}, received ${value}`)
}

pass('canonical empty description admits omitted meta', () => {
  expect(matchesStaticSeoDescription(null, ''), true, 'empty/null parity')
})

pass('canonical empty description admits explicit empty meta', () => {
  expect(matchesStaticSeoDescription('', ''), true, 'empty/empty parity')
})

pass('canonical empty description rejects generated text', () => {
  expect(matchesStaticSeoDescription('generated fallback', ''), false, 'generated fallback rejection')
})

pass('nonempty description requires exact parity', () => {
  expect(matchesStaticSeoDescription('정확한 설명', '정확한 설명'), true, 'nonempty exact parity')
})

pass('nonempty description rejects omitted meta', () => {
  expect(matchesStaticSeoDescription(null, '정확한 설명'), false, 'nonempty missing rejection')
})

pass('nonempty description rejects explicit empty meta', () => {
  expect(matchesStaticSeoDescription('', '정확한 설명'), false, 'nonempty empty rejection')
})

pass('nonempty description rejects mismatch', () => {
  expect(matchesStaticSeoDescription('다른 설명', '정확한 설명'), false, 'nonempty mismatch rejection')
})

const verifier = await readFile(resolve(process.cwd(), 'scripts/mmj-ui29-static-output-verify.mjs'), 'utf8')

pass('static verifier uses semantic description parity helper', () => {
  if (!verifier.includes('matchesStaticSeoDescription(actualDescription, expectedDescription)')) {
    throw new Error('semantic description parity helper is not wired')
  }
})

pass('failure diagnostics preserve raw actual and expected description', () => {
  if (!verifier.includes('actualDescription,') || !verifier.includes('expectedDescription,')) {
    throw new Error('raw actual/expected description diagnostics are missing')
  }
})

pass('legacy raw strict comparison is retired', () => {
  if (verifier.includes('actualDescription !== project.seo.description')) {
    throw new Error('legacy raw description comparison remains')
  }
})

process.stdout.write(`MMJ-PUBLIC-R11-EMPTY-SEO-DESCRIPTION-PRERENDER-PARITY-R1: ${passCount} PASS\n`)
