import {
  findPortfolioGatewayCategoryIconAsset,
  PUBLIC_PORTFOLIO_GATEWAY_CATEGORIES,
} from '~~/shared/constants/portfolio-gateway-categories'

import type {
  HomeGatewayShowcaseView,
} from '~/types/home-gateway'

import type {
  ShowcaseProjectView,
} from '~~/shared/view/portfolio-project-view'

export function createHomeShowcasePreview(
  source: readonly ShowcaseProjectView[],
): readonly HomeGatewayShowcaseView[] {
  const base = source[0]
  if (!base) return []

  return Object.freeze(
    PUBLIC_PORTFOLIO_GATEWAY_CATEGORIES.map(category => {
      const suffix = String(category.order).padStart(2, '0')
      const gatewayIconAsset = (
        findPortfolioGatewayCategoryIconAsset(category.id)
      )

      if (!gatewayIconAsset) {
        throw new Error(
          `Missing category icon asset binding for ${category.id}.`,
        )
      }

      return Object.freeze({
        ...base,
        id: `prj_gateway${suffix}`,
        slug: `gateway-${category.id}`,
        href: `/works?category=${encodeURIComponent(category.id)}`,
        title: category.title,
        gatewayTitleLines: category.titleLines,
        gatewayCategoryId: category.id,
        gatewayIconAsset,
        gatewayCategoryIds: Object.freeze([category.id]),
        tags: Object.freeze([
          Object.freeze({
            token: 'category-gateway',
            label: 'CATEGORY GATEWAY',
          }),
        ]),
        displayMeta: Object.freeze({
          timing: Object.freeze({
            year: null,
            releaseDate: null,
          }),
          client: 'PORTFOLIO GATEWAY',
          metaLine: `CATEGORY ${suffix}`,
        }),
        summary: category.description,
        featured: true,
        order: category.order * 10,
        cover: base.cover,
        backdrop: base.backdrop ?? base.cover,
        primary: null,
      })
    }),
  )
}
