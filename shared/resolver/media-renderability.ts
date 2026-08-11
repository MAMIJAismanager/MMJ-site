export const PRIMARY_RENDITION_PURPOSE: 'primary' = 'primary'

export interface RenditionPurposeLike {
  readonly purpose: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function hasExactPrimaryRendition(
  renditions: readonly unknown[],
): boolean {
  if (!Array.isArray(renditions)) return false
  return renditions.some(rendition => (
    isRecord(rendition)
    && rendition.purpose === PRIMARY_RENDITION_PURPOSE
  ))
}
