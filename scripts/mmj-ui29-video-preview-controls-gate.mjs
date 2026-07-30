import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = path => readFile(resolve(root, path), 'utf8')
const fail = message => { throw new Error(`E_MMJ_UI29_VIDEO_PREVIEW_CONTROLS_R1: ${message}`) }

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
for (const token of ['45rem', 'aspect-ratio: 3 / 2', 'primary-detail']) {
  if (!playerCss.includes(token)) fail(`720x480 preview contract missing: ${token}`)
}

console.log(JSON.stringify({
  event: 'PASS_MMJ_UI29_VIDEO_PREVIEW_CONTROLS_R1',
  nativeControls: false,
  downloadUi: 'denied',
  previewMaxWidthPx: 720,
  previewMaxHeightPx: 480,
}))
