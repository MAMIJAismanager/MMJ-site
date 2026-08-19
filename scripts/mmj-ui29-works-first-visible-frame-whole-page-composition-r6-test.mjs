import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import ts from 'typescript'

async function importSolverFixture() {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'mmj-works-r6-'))
  try {
    const compositionSource = await readFile(
      new URL('../app/works/works-page-composition.ts', import.meta.url),
      'utf8',
    )
    const solverSource = await readFile(
      new URL('../app/works/works-page-composition-solver.ts', import.meta.url),
      'utf8',
    )
    const compilerOptions = {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    }
    const compositionModule = ts.transpileModule(compositionSource, {
      compilerOptions,
      fileName: 'works-page-composition.ts',
    }).outputText
    const solverModule = ts.transpileModule(
      solverSource.replace(
        "from './works-page-composition'",
        "from './works-page-composition.mjs'",
      ),
      {
        compilerOptions,
        fileName: 'works-page-composition-solver.ts',
      },
    ).outputText
    await writeFile(
      join(temporaryDirectory, 'works-page-composition.mjs'),
      compositionModule,
      'utf8',
    )
    const solverPath = join(temporaryDirectory, 'works-page-composition-solver.mjs')
    await writeFile(solverPath, solverModule, 'utf8')
    return await import(pathToFileURL(solverPath).href)
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
}

const {
  advanceWorksPageSolve,
  beginWorksPageSolve,
  createWorksPageCandidates,
} = await importSolverFixture()

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

let testCount = 0
function pass(name, callback) {
  callback()
  testCount += 1
  process.stdout.write(`${name}: PASS\n`)
}

function input(width, height, availableBlock = height - 72) {
  return Object.freeze({
    key: `fixture:${width}x${height}`,
    viewportWidthPx: width,
    viewportHeightPx: height,
    availableInlinePx: width - 64,
    availableBlockPx: availableBlock,
    rootFontPx: 16,
    projectCount: 8,
    queryPlacement: width <= 767 ? 'mobile-menu' : 'inline',
  })
}

function receipt(candidate, overrides = {}) {
  const cardInlinePx = (
    candidate.railInlinePx
    - candidate.gridGapPx * (candidate.columnCount - 1)
  ) / candidate.columnCount
  return Object.freeze({
    key: candidate.key,
    probeId: candidate.probeId,
    presetId: candidate.presetId,
    railInlinePx: candidate.railInlinePx,
    gridInlinePx: candidate.railInlinePx,
    cardInlinePx,
    headerBlockPx: 54,
    queryBlockPx: candidate.queryPlacement === 'inline' ? 84 : 0,
    summaryBlockPx: 20,
    gridBlockPx: 570,
    paginationBlockPx: 44,
    totalPageBlockPx: 800,
    queryRowCount: candidate.queryPlacement === 'inline' ? 1 : 0,
    horizontalOverflowPx: 0,
    metadataClipCount: 0,
    latinTokenFragmentedCount: 0,
    singleGraphemeCollapseCount: 0,
    stable: true,
    ...overrides,
  })
}

pass('1920x1080 starts from known reference full-page preset', () => {
  const first = beginWorksPageSolve(input(1920, 1080))
  assert(first.kind === 'probe-required', '1920 must request a physical probe')
  assert(first.candidate.presetId === 'display-reference', 'reference preset must be first')
  assert(first.candidate.columnCount === 4, 'reference must be four columns')
  assert(first.candidate.railInlinePx === 1248, 'reference rail drifted')
})

pass('1920x1080 first physical pass commits without visible convergence', () => {
  const first = beginWorksPageSolve(input(1920, 1080))
  assert(first.kind === 'probe-required', 'probe expected')
  const next = advanceWorksPageSolve(first, receipt(first.candidate, {
    totalPageBlockPx: 820,
  }))
  assert(next.kind === 'commit-ready', 'reference physical receipt should commit')
  assert(next.commit.mode === 'display-single-viewport', 'reference must remain single viewport')
  assert(next.commit.pageRailInlinePx === 1248, 'committed rail must equal probed rail')
  assert(next.commit.columnCount === 4, 'committed reference column count drifted')
  assert(next.commit.singleViewportVerified === true, 'reference verification seal missing')
})

pass('1915x901 can reject reference behind the curtain then commit compact', () => {
  const first = beginWorksPageSolve(input(1915, 901, 829))
  assert(first.kind === 'probe-required', 'probe expected')
  const second = advanceWorksPageSolve(first, receipt(first.candidate, {
    totalPageBlockPx: 850,
  }))
  assert(second.kind === 'probe-required', 'overflowing reference must remain hidden and continue')
  assert(second.candidate.presetId === 'display-compact', 'compact preset must be second')
  const committed = advanceWorksPageSolve(second, receipt(second.candidate, {
    totalPageBlockPx: 790,
  }))
  assert(committed.kind === 'commit-ready', 'compact should commit')
  assert(committed.commit.singleViewportVerified === true, 'compact display seal missing')
})

pass('1900x900 tight path remains physical and never becomes grid-only authority', () => {
  const first = beginWorksPageSolve(input(1900, 900, 828))
  assert(first.kind === 'probe-required', 'probe expected')
  const second = advanceWorksPageSolve(first, receipt(first.candidate, { totalPageBlockPx: 850 }))
  assert(second.kind === 'probe-required', 'compact probe expected')
  const third = advanceWorksPageSolve(second, receipt(second.candidate, { totalPageBlockPx: 840 }))
  assert(third.kind === 'probe-required', 'tight probe expected')
  assert(third.candidate.presetId === 'display-tight', 'tight preset missing')
  const committed = advanceWorksPageSolve(third, receipt(third.candidate, { totalPageBlockPx: 780 }))
  assert(committed.kind === 'commit-ready', 'tight display should commit')
  assert(committed.commit.pageRailInlinePx === third.candidate.railInlinePx, 'page/grid rail parity drifted')
})

pass('inline query wrapping rejects a display candidate', () => {
  const first = beginWorksPageSolve(input(1920, 1080))
  assert(first.kind === 'probe-required', 'probe expected')
  const next = advanceWorksPageSolve(first, receipt(first.candidate, {
    queryRowCount: 2,
  }))
  assert(next.kind === 'probe-required', 'wrapped query must not be committed')
})

pass('mobile 360 does not force a two-column candidate below readable floor', () => {
  const candidates = createWorksPageCandidates(input(360, 800))
  assert(candidates.length >= 1, 'mobile candidate missing')
  assert(candidates[0].columnCount === 1, '360px viewport must start at one column')
})

pass('mobile 412 may probe two columns but readability failure forces one column before publication', () => {
  const first = beginWorksPageSolve(input(412, 915))
  assert(first.kind === 'probe-required', 'probe expected')
  assert(first.candidate.columnCount === 2, '412 may attempt two columns offscreen')
  const second = advanceWorksPageSolve(first, receipt(first.candidate, {
    latinTokenFragmentedCount: 1,
  }))
  assert(second.kind === 'probe-required', 'unreadable mobile two-column must not commit')
  assert(second.candidate.columnCount === 1, 'one-column fallback must be probed before publication')
})

pass('stale or mismatched receipt fails closed', () => {
  const first = beginWorksPageSolve(input(1920, 1080))
  assert(first.kind === 'probe-required', 'probe expected')
  const next = advanceWorksPageSolve(first, receipt(first.candidate, {
    key: 'stale-key',
  }))
  assert(next.kind === 'failed', 'stale receipt must fail closed')
  assert(next.reason === 'invalid-receipt', 'stale receipt reason drifted')
})

console.log(JSON.stringify({
  event: 'PASS_MMJ_UI29_WORKS_FIRST_VISIBLE_FRAME_WHOLE_PAGE_COMPOSITION_AUTHORITY_R6',
  testCount,
}))
