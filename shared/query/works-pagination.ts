export const WORKS_PAGE_SIZE = 8 as const

export interface WorksPageWindow {
  readonly pageSize: typeof WORKS_PAGE_SIZE
  readonly requestedPage: number
  readonly currentPage: number
  readonly pageCount: number
  readonly startIndex: number
  readonly endIndexExclusive: number
  readonly pageResultCount: number
  readonly outOfRange: boolean
}

export function parseWorksPageNumber(
  value: string,
): number | null {
  if (!/^[1-9][0-9]*$/.test(value)) return null

  const parsed = Number(value)
  return Number.isSafeInteger(parsed)
    ? parsed
    : null
}

export function resolveWorksPageWindow(
  resultCount: number,
  requestedPage: number,
): WorksPageWindow {
  if (!Number.isSafeInteger(resultCount) || resultCount < 0) {
    throw new TypeError('resultCount must be a non-negative safe integer.')
  }

  if (!Number.isSafeInteger(requestedPage) || requestedPage < 1) {
    throw new TypeError('requestedPage must be a positive safe integer.')
  }

  const pageCount = Math.ceil(resultCount / WORKS_PAGE_SIZE)
  const outOfRange = (
    requestedPage > 1
    && (pageCount === 0 || requestedPage > pageCount)
  )
  const currentPage = outOfRange
    ? 1
    : requestedPage
  const startIndex = pageCount === 0
    ? 0
    : (currentPage - 1) * WORKS_PAGE_SIZE
  const endIndexExclusive = Math.min(
    startIndex + WORKS_PAGE_SIZE,
    resultCount,
  )

  return Object.freeze({
    pageSize: WORKS_PAGE_SIZE,
    requestedPage,
    currentPage,
    pageCount,
    startIndex,
    endIndexExclusive,
    pageResultCount: endIndexExclusive - startIndex,
    outOfRange,
  })
}
