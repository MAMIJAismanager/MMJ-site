export interface WorksCardPhysicalReceipt {
  readonly projectId: string
  readonly index: number
  readonly cardInlinePx: number
  readonly cardBlockPx: number
  readonly metadataBlockPx: number
}

export interface WorksCardPhysicalReader {
  readPhysicalReceipt(): WorksCardPhysicalReceipt | null
}

export interface WorksProjectGridPhysicalReader {
  readCardPhysicalReceipts(): readonly WorksCardPhysicalReceipt[]
}

export interface WorksRowMetadataReceipt {
  readonly visibleCardCount: number
  readonly row0MetadataMaxPx: number
  readonly row1MetadataMaxPx: number
  readonly overallMetadataMaxPx: number
  readonly maxCardInlinePx: number
}

function finiteBlock(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}

export function resolveWorksRowMetadataReceipt(
  receipts: readonly WorksCardPhysicalReceipt[],
  columnCount = 4,
): WorksRowMetadataReceipt {
  const safeColumnCount = Number.isSafeInteger(columnCount) && columnCount > 0
    ? columnCount
    : 4

  let row0MetadataMaxPx = 0
  let row1MetadataMaxPx = 0
  let overallMetadataMaxPx = 0
  let maxCardInlinePx = 0
  let visibleCardCount = 0

  for (const receipt of receipts) {
    if (!Number.isSafeInteger(receipt.index) || receipt.index < 0) continue

    const metadataBlockPx = finiteBlock(receipt.metadataBlockPx)
    maxCardInlinePx = Math.max(maxCardInlinePx, finiteBlock(receipt.cardInlinePx))
    overallMetadataMaxPx = Math.max(overallMetadataMaxPx, metadataBlockPx)
    visibleCardCount += 1

    if (receipt.index < safeColumnCount) {
      row0MetadataMaxPx = Math.max(row0MetadataMaxPx, metadataBlockPx)
      continue
    }

    if (receipt.index < safeColumnCount * 2) {
      row1MetadataMaxPx = Math.max(row1MetadataMaxPx, metadataBlockPx)
    }
  }

  return Object.freeze({
    visibleCardCount,
    row0MetadataMaxPx,
    row1MetadataMaxPx,
    overallMetadataMaxPx,
    maxCardInlinePx,
  })
}

export function maxWorksCardMetadataBlockPx(
  receipts: readonly WorksCardPhysicalReceipt[],
): number {
  return resolveWorksRowMetadataReceipt(receipts).overallMetadataMaxPx
}
