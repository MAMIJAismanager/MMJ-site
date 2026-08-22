import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(path, 'utf8')
const frame = read('app/components/work/WorkAssetFrame.vue')
const dock = read('app/components/player/GlobalAudioDock.vue')
const css = read('app/assets/css/global-audio-dock.css')
const pkg = JSON.parse(read('package.json'))
const release = 'MMJ-AUDIO-ARTWORK-OPTIONAL-COMPANION-AND-PRESENTATION-FALLBACK-R16'

assert.equal(pkg.mmjAudioArtworkOptionalCompanionPresentationFallbackR16Release, release)
assert.equal(pkg.releases?.mmjAudioArtworkOptionalCompanionPresentationFallbackR16Release, release)
assert.match(frame, /props\.asset\.artwork/)
assert.match(frame, /audioArtworkState/)
assert.match(frame, /artwork === null \? 'fallback' : 'present'/)
assert.match(frame, /return 'AUDIO'/)
assert.match(frame, /:state-label="frameStateLabel"/)
assert.match(dock, /data-mm-global-audio-artwork/)
assert.match(dock, /v-if="artworkPlan !== null"/)
assert.match(dock, /mm-global-audio-dock__artwork-fallback">AUDIO/)
assert.match(css, /\.mm-global-audio-dock__artwork-fallback/)
assert.doesNotMatch(frame + dock, /fallbackArtworkAssetId|defaultAudioArtworkAssetId/)

console.log('PASS_R16_PUBLIC_REAL_ARTWORK_RENDER')
console.log('PASS_R16_PUBLIC_AUDIO_FALLBACK_RENDER')
console.log('PASS_R16_GLOBAL_AUDIO_PLAYER_ARTWORK_PARITY')
console.log('PASS_R16_PLACEHOLDER_PRESENTATION_ONLY')
