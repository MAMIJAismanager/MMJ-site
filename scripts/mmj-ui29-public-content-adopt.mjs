import { spawnSync } from 'node:child_process'

for (const script of ['scripts/mmj-ui29-portfolio-adopt.mjs', 'scripts/mmj-ui29-commission-guide-adopt.mjs']) {
  const result = spawnSync(process.execPath, [script], { stdio: 'inherit', env: process.env })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log(JSON.stringify({ event: 'PASS_MMJ_UI29_PUBLIC_CONTENT_ADOPTED', portfolio: true, commissionGuide: true }))
