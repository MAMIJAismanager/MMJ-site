import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')
const fail = message => { throw new Error(`E_MMJ_UI29_VIDEO_PREVIEW_INTRINSIC_GEOMETRY_R4: ${message}`) }

const [player, playerCss, geometry] = await Promise.all([
  read('app/components/media/VideoPlayer.vue'),
  read('app/assets/css/video-player.css'),
  read('app/video/video-geometry-profile.ts'),
])

for (const token of [
  ':controls="false"',
  'controlslist="nodownload noplaybackrate noremoteplayback"',
  'disablepictureinpicture',
  'disableremoteplayback',
  'data-mm-video-custom-controls',
  'type="range"',
  '@contextmenu.prevent',
]) {
  if (!player.includes(token)) fail(`player contract missing: ${token}`)
}

if (player.includes(':controls="controlsVisible"')) fail('native controls must remain disabled')
if (!playerCss.includes('.mm-video-player__controls')) fail('custom control surface CSS missing')

for (const token of [
  'resolveVideoGeometryProfile',
  'readonly geometryConstraint?: VideoGeometryConstraint',
  ':data-mm-video-geometry-mode="geometryProfile.mode"',
  ':data-mm-video-fullscreen="runtimeState.fullscreen ? \'true\' : \'false\'"',
  "'--mm-video-player-inline-size'",
  "'--mm-video-player-intrinsic-inline-size'",
  "'--mm-video-player-intrinsic-block-size'",
]) {
  if (!player.includes(token)) fail(`Vue video geometry projection missing: ${token}`)
}

for (const token of [
  "readonly fit: 'contain'",
  'readonly allowCrop: false',
  'readonly allowStretch: false',
  'readonly allowUpscale: false',
  "| 'fullscreen-contain'",
  'const scale = Math.min(1, inlineScale, blockScale)',
]) {
  if (!geometry.includes(token)) fail(`TypeScript video geometry authority missing: ${token}`)
}

for (const token of [
  'width: min(100%, var(--mm-video-player-inline-size))',
  'aspect-ratio: var(--mm-video-player-ratio)',
  'object-fit: contain',
  'object-position: center',
  ".mm-video-player[data-mm-video-fullscreen='true']",
  'var(--mm-video-player-intrinsic-inline-size)',
  'var(--mm-video-player-intrinsic-block-size)',
]) {
  if (!playerCss.includes(token)) fail(`intrinsic video renderer contract missing: ${token}`)
}

for (const retired of [
  'width: min(100%, clamp(40rem, 50vw, 60rem))',
  'max-width: 60rem',
  'aspect-ratio: 16 / 9',
  'width: 100vw',
  'height: 100vh',
  'object-fit: cover',
]) {
  if (playerCss.includes(retired)) fail(`retired layout-owned video geometry remains: ${retired}`)
}

console.log(JSON.stringify({
  event: 'PASS_MMJ_UI29_VIDEO_PREVIEW_INTRINSIC_GEOMETRY_R4',
  nativeControls: false,
  downloadUi: 'denied',
  stageAspectRatio: 'intrinsic',
  sourceFit: 'contain',
  sourceCrop: 'denied',
  sourceStretch: 'denied',
  mandatoryUpscale: 'denied',
  fullscreenOuterAuthority: 'browser-containing-block',
}))
