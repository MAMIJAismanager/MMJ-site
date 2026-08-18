import { appendFile } from 'node:fs/promises'
import { readPublicConvergenceEnvironment } from './lib/mmj-ui29-public-convergence.mjs'
import { observePublicConvergenceDeploymentAdmission } from './lib/mmj-ui29-public-convergence-deployment-authority.mjs'

const input = readPublicConvergenceEnvironment(process.env)
const origin = new URL(process.env.MMJ_PORTFOLIO_HANDOFF_ORIGIN || 'https://cms.mamajing.work').origin
const result = await observePublicConvergenceDeploymentAdmission({ input, origin })

const output = process.env.GITHUB_OUTPUT
if (!output) throw new Error('E_MMJ_PUBLIC_CONVERGENCE_GITHUB_OUTPUT_MISSING')
await appendFile(output, [
  `deploy=${result.deploy ? 'true' : 'false'}`,
  `state=${result.state}`,
  `relation=${result.relation ?? 'unknown'}`,
  `reason=${result.reason}`,
  `observed_current_convergence_key=${result.observedCurrentAuthority?.convergenceKey ?? ''}`,
  `observed_current_convergence_digest=${result.observedCurrentAuthority?.convergenceDigest ?? ''}`,
  `observed_current_convergence_revision=${result.observedCurrentAuthority?.convergenceRevision ?? ''}`,
  '',
].join('\n'), 'utf8')
console.log(JSON.stringify({ event: 'MMJ_PUBLIC_CONVERGENCE_DEPLOYMENT_ADMISSION', convergenceKey: input.convergenceKey, ...result }))
