export type WorkDescriptionInlineSegment =
  | Readonly<{
      kind: 'text'
      value: string
    }>
  | Readonly<{
      kind: 'external-link'
      value: string
      href: string
    }>

const URL_PATTERN = /(?<![A-Za-z0-9+.\-:])https?:\/\/[^\s<>"']+/giu
const TRAILING_PUNCTUATION_PATTERN = /[),.!?;:\]}]+$/u

function splitTrailingPunctuation(value: string): Readonly<{
  linkValue: string
  trailingText: string
}> {
  const trailing = value.match(TRAILING_PUNCTUATION_PATTERN)?.[0] ?? ''
  if (trailing.length === 0) {
    return Object.freeze({ linkValue: value, trailingText: '' })
  }
  return Object.freeze({
    linkValue: value.slice(0, -trailing.length),
    trailingText: trailing,
  })
}

function admitHttpUrl(value: string): string | null {
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.href
  } catch {
    return null
  }
}

export function segmentWorkDescriptionInline(
  value: string,
): readonly WorkDescriptionInlineSegment[] {
  if (value.length === 0) {
    return Object.freeze([])
  }

  const segments: WorkDescriptionInlineSegment[] = []
  let cursor = 0

  for (const match of value.matchAll(URL_PATTERN)) {
    const start = match.index
    const raw = match[0]
    if (start > cursor) {
      segments.push(Object.freeze({
        kind: 'text',
        value: value.slice(cursor, start),
      }))
    }

    const { linkValue, trailingText } = splitTrailingPunctuation(raw)
    const href = admitHttpUrl(linkValue)
    if (href === null || linkValue.length === 0) {
      segments.push(Object.freeze({
        kind: 'text',
        value: raw,
      }))
    } else {
      segments.push(Object.freeze({
        kind: 'external-link',
        value: linkValue,
        href,
      }))
      if (trailingText.length > 0) {
        segments.push(Object.freeze({
          kind: 'text',
          value: trailingText,
        }))
      }
    }

    cursor = start + raw.length
  }

  if (cursor < value.length) {
    segments.push(Object.freeze({
      kind: 'text',
      value: value.slice(cursor),
    }))
  }

  return Object.freeze(segments)
}

export function reconstructWorkDescriptionInline(
  segments: readonly WorkDescriptionInlineSegment[],
): string {
  return segments.map(segment => segment.value).join('')
}
