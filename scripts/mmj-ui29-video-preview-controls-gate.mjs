import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')
const fail = message => { throw new Error(`E_MMJ_UI29_VIDEO_STAGE_R2: ${message}`) }

const player = await read('app/components/media/VideoPlayer.vue')
const playerCss = await read('app/assets/css/video-player.css')

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
  'width: min(100%, 120rem)',
  'max-width: 120rem',
  'aspect-ratio: 16 / 9',
  'object-fit: contain',
  'object-position: center',
  '> .mm-video-player:fullscreen',
  'width: 100vw',
  'height: 100vh',
  'aspect-ratio: auto',
]) {
  if (!playerCss.includes(token)) fail(`responsive 1920x1080 stage contract missing: ${token}`)
}

for (const retired of [
  'width: min(100%, 45rem)',
  'aspect-ratio: 3 / 2',
  '720 x 480',
]) {
  if (playerCss.includes(retired)) fail(`retired bounded preview contract remains: ${retired}`)
}

console.log(JSON.stringify({
  event: 'PASS_MMJ_UI29_VIDEO_STAGE_R2',
  nativeControls: false,
  downloadUi: 'denied',
  designWidthPx: 1920,
  designHeightPx: 1080,
  stageAspectRatio: '16:9',
  sourceFit: 'contain',
  fullscreenFit: 'contain',
}))
