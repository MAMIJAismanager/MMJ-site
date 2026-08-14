export interface WorksCardPhysicalReceipt {
  readonly projectId: string
  readonly cardBlockPx: number
  readonly metadataBlockPx: number
}

export interface WorksCardPhysicalReader {
  readPhysicalReceipt(): WorksCardPhysicalReceipt | null
}

export interface WorksProjectGridPhysicalReader {
  readCardPhysicalReceipts(): readonly WorksCardPhysicalReceipt[]
}

export function maxWorksCardMetadataBlockPx(
  receipts: readonly WorksCardPhysicalReceipt[],
): number {
  let maximum = 0
  for (const receipt of receipts) {
    if (!Number.isFinite(receipt.metadataBlockPx)) continue
    maximum = Math.max(maximum, receipt.metadataBlockPx)
  }
  return maximum
}
