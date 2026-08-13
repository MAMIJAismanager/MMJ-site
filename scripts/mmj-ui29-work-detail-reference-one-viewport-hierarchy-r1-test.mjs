import {
  resolveWorkDetailLayoutProfile,
  WORK_DETAIL_REFERENCE_VIEWPORT,
} from '../app/work-detail/work-detail-layout-profile.ts'
import {
  reconstructWorkDescriptionInline,
  segmentWorkDescriptionInline,
} from '../app/utils/work-description-inline.ts'

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

let testCount = 0
function pass(name, callback) {
  callback()
  testCount += 1
  process.stdout.write(`${name}: PASS\n`)
}

pass('reference viewport identity', () => {
  assert(WORK_DETAIL_REFERENCE_VIEWPORT.width === 1920, 'reference width drifted')
  assert(WORK_DETAIL_REFERENCE_VIEWPORT.height === 1080, 'reference height drifted')
})

pass('1920x1080 resolves reference split', () => {
  const profile = resolveWorkDetailLayoutProfile({
    viewport: { width: 1920, height: 1080 },
    hasPrimaryMedia: true,
    primaryMedia: { width: 1920, height: 1080 },
  })
  assert(profile.mode === 'reference-split', `unexpected mode: ${profile.mode}`)
  assert(profile.coreViewportFit === true, 'reference core viewport fit missing')
  assert(profile.titlePx <= 52, 'reference title exceeds hard cap')
  assert(profile.titlePx >= 44, 'reference title collapsed below minimum')
  assert(profile.mediaMaxInlinePx <= 920, 'reference media width exceeds authority')
})

pass('ultrawide grows media not title', () => {
  const profile = resolveWorkDetailLayoutProfile({
    viewport: { width: 3440, height: 1440 },
    hasPrimaryMedia: true,
    primaryMedia: { width: 1920, height: 1080 },
  })
  assert(profile.mode === 'wide-split', `unexpected ultrawide mode: ${profile.mode}`)
  assert(profile.titlePx === 52, 'ultrawide title must remain capped')
  assert(profile.mediaMaxInlinePx <= 1040, 'ultrawide media width exceeded cap')
})

pass('mobile resolves compact stack', () => {
  const profile = resolveWorkDetailLayoutProfile({
    viewport: { width: 390, height: 844 },
    hasPrimaryMedia: true,
    primaryMedia: { width: 1920, height: 1080 },
  })
  assert(profile.mode === 'mobile-stack', `unexpected mobile mode: ${profile.mode}`)
  assert(profile.coreViewportFit === false, 'mobile must remain natural document flow')
  assert(profile.titlePx <= 38, 'mobile title exceeds compact cap')
})

pass('short desktop falls back to flow', () => {
  const profile = resolveWorkDetailLayoutProfile({
    viewport: { width: 1366, height: 768 },
    hasPrimaryMedia: true,
    primaryMedia: { width: 1920, height: 1080 },
  })
  assert(profile.mode === 'compact-stack', `unexpected compact mode: ${profile.mode}`)
  assert(profile.coreViewportFit === false, 'compact desktop must not claim one-viewport fit')
})

pass('inline url segmentation preserves source identity', () => {
  const source = '영상 링크 https://youtu.be/4E1BxkfKNVw 입니다.\n두 번째 https://example.com/a?b=1.'
  const segments = segmentWorkDescriptionInline(source)
  assert(reconstructWorkDescriptionInline(segments) === source, 'description reconstruction drifted')
  const links = segments.filter(segment => segment.kind === 'external-link')
  assert(links.length === 2, `expected two links, received ${links.length}`)
  assert(links[0].value === 'https://youtu.be/4E1BxkfKNVw', 'youtube link token drifted')
  assert(links[1].value === 'https://example.com/a?b=1', 'trailing punctuation was not preserved as text')
})

pass('unsafe schemes remain text', () => {
  const source = 'javascript:alert(1) data:text/html,boom blob:https://example.com/id'
  const segments = segmentWorkDescriptionInline(source)
  assert(segments.every(segment => segment.kind === 'text'), 'unsafe scheme was promoted to link')
  assert(reconstructWorkDescriptionInline(segments) === source, 'unsafe source identity drifted')
})

console.log(JSON.stringify({
  event: 'PASS_MMJ_UI29_WORK_DETAIL_REFERENCE_ONE_VIEWPORT_HIERARCHY_AND_INLINE_LINK_AUTHORITY_R1',
  testCount,
}))
