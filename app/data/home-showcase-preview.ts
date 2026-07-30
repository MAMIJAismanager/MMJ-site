import {
  findPortfolioGatewayCategoryIconAsset,
  PUBLIC_PORTFOLIO_GATEWAY_CATEGORIES,
} from '~~/shared/constants/portfolio-gateway-categories'

import type {
  HomeGatewayShowcaseView,
} from '~/types/home-gateway'

const GATEWAY_CATEGORY_VIEW = Object.freeze({
  token: 'producing' as const,
  label: '포트폴리오',
  order: 0,
})

/**
 * Home gateway navigation is a local structural surface.
 * It must remain available even when the CMS collection is empty, contains no
 * featured project, or is temporarily unavailable during a build handoff.
 */
export function createHomeShowcasePreview():
readonly HomeGatewayShowcaseView[] {
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
        id: `prj_gateway${suffix}`,
        slug: `gateway-${category.id}`,
        href: `/works?category=${encodeURIComponent(category.id)}`,
        title: category.title,
        gatewayTitleLines: category.titleLines,
        gatewayCategoryId: category.id,
        gatewayIconAsset,
        category: GATEWAY_CATEGORY_VIEW,
        gatewayCategoryIds: Object.freeze([category.id]),
        roles: Object.freeze([]),
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
      })
    }),
  )
}
