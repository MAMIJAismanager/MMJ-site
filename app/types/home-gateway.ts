import type {
  ProjectPresentationBase,
} from '~~/shared/view/portfolio-project-view'

import type {
  PortfolioGatewayCategoryId,
} from '~~/shared/types/portfolio-gateway-category'

/**
 * The home gateway is navigation chrome, not a published portfolio project.
 * It deliberately owns no cover, backdrop, or primary media binding.
 */
export interface HomeGatewayShowcaseView
  extends ProjectPresentationBase {
  readonly gatewayCategoryId: PortfolioGatewayCategoryId
  readonly gatewayIconAsset: string
  readonly gatewayTitleLines: readonly string[]
}
