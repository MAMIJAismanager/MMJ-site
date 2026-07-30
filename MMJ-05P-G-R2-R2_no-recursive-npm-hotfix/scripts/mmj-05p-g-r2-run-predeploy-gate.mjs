import { spawnSync } from 'node:child_process'

const revision = 'MMJ-05P-G-R2-R2'
const steps = [
  'scripts/mmj-05p-g-r2-migrate-g-r1-residue.test.mjs',
  'scripts/mmj-05p-e1-existing-media-library-gate.mjs',
  'scripts/mmj-05p-e1-existing-media-library-runtime.test.mjs',
  'scripts/mmj-05p-e2-r1-cms-asset-retirement-gate.mjs',
  'scripts/mmj-05p-e2-r1-runtime.test.mjs',
  'scripts/mmj-05p-g-r2-existing-bound-owner-webapp-gate.mjs',
  'scripts/mmj-05p-g-r2-existing-bound-owner-webapp.test.mjs',
  'scripts/mmj-05p-g-r2-apps-script-syntax.test.mjs',
]

for (const script of steps) {
  process.stdout.write(`[${revision}] RUN ${script}\n`)
  const result = spawnSync(process.execPath, [script], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)

  if (result.error) {
    process.stderr.write(`[${revision}] E_MMJ_G_R2_GATE_STEP_SPAWN_FAILED ${script}: ${result.error.message}\n`)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.stderr.write(`[${revision}] E_MMJ_G_R2_GATE_STEP_FAILED ${script} exit=${String(result.status)} signal=${String(result.signal || '')}\n`)
    process.exit(result.status || 1)
  }
}

console.log(JSON.stringify({
  schemaVersion: 1,
  revision,
  event: 'PASS_MMJ_05P_G_R2_R2_DIRECT_NODE_GATE_RUNNER',
  recursiveNpmInvocations: 0,
  completedSteps: steps.length,
}))
