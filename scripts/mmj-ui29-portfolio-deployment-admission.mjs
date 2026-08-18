import { appendFile } from 'node:fs/promises'
import { observePortfolioDeploymentAdmission } from './lib/mmj-ui29-portfolio-deployment-authority.mjs'

const result = await observePortfolioDeploymentAdmission({ env: process.env })
const output = process.env.GITHUB_OUTPUT
if (!output) throw new Error('E_MMJ_UI29_GITHUB_OUTPUT_MISSING')
await appendFile(output, [
  `deploy=${result.deploy ? 'true' : 'false'}`,
  `state=${result.state}`,
  `relation=${result.relation ?? 'unknown'}`,
  `reason=${result.reason}`,
  `observed_current_delivery_key=${result.observedCurrentAuthority?.deliveryKey ?? ''}`,
  `observed_current_collection_version_id=${result.observedCurrentAuthority?.collectionVersionId ?? ''}`,
  `observed_current_snapshot_digest=${result.observedCurrentAuthority?.snapshotDigest ?? ''}`,
  `observed_current_head_revision=${result.observedCurrentAuthority?.collectionHeadRevision ?? ''}`,
  '',
].join('\n'), 'utf8')
console.log(JSON.stringify({ event: 'MMJ_PORTFOLIO_DEPLOYMENT_ADMISSION', ...result }))
