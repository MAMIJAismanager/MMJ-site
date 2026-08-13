export interface VideoGeometryConstraint {
  readonly maxInlinePx: number
  readonly maxBlockPx: number
}

export type VideoGeometryMode =
  | 'intrinsic'
  | 'downscaled-inline'
  | 'downscaled-block'
  | 'fullscreen-contain'

export interface VideoGeometryInput {
  readonly intrinsicWidth: number
  readonly intrinsicHeight: number
  readonly constraint: VideoGeometryConstraint | null
  readonly fullscreen: boolean
}

export interface VideoGeometryProfile {
  readonly intrinsicWidth: number
  readonly intrinsicHeight: number
  readonly aspectRatio: number
  readonly renderedInlinePx: number
  readonly renderedBlockPx: number
  readonly fit: 'contain'
  readonly allowCrop: false
  readonly allowStretch: false
  readonly allowUpscale: false
  readonly mode: VideoGeometryMode
}

function finitePositive(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError(`E_MMJ_VIDEO_GEOMETRY_INVALID_${name.toUpperCase()}`)
  }
  return value
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

export function resolveVideoGeometryProfile(
  input: VideoGeometryInput,
): VideoGeometryProfile {
  const intrinsicWidth = finitePositive(input.intrinsicWidth, 'intrinsic_width')
  const intrinsicHeight = finitePositive(input.intrinsicHeight, 'intrinsic_height')
  const aspectRatio = intrinsicWidth / intrinsicHeight

  let inlineScale = 1
  let blockScale = 1

  if (input.constraint !== null) {
    const maxInlinePx = finitePositive(input.constraint.maxInlinePx, 'max_inline')
    const maxBlockPx = finitePositive(input.constraint.maxBlockPx, 'max_block')
    inlineScale = maxInlinePx / intrinsicWidth
    blockScale = maxBlockPx / intrinsicHeight
  }

  const scale = Math.min(1, inlineScale, blockScale)
  const renderedInlinePx = round(intrinsicWidth * scale)
  const renderedBlockPx = round(intrinsicHeight * scale)

  let mode: VideoGeometryMode
  if (input.fullscreen) {
    mode = 'fullscreen-contain'
  } else if (scale >= 1) {
    mode = 'intrinsic'
  } else if (inlineScale <= blockScale) {
    mode = 'downscaled-inline'
  } else {
    mode = 'downscaled-block'
  }

  return Object.freeze({
    intrinsicWidth,
    intrinsicHeight,
    aspectRatio: round(aspectRatio),
    renderedInlinePx,
    renderedBlockPx,
    fit: 'contain',
    allowCrop: false,
    allowStretch: false,
    allowUpscale: false,
    mode,
  })
}
