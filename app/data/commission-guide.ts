import {
  COMMISSION_GUIDE_MOCK,
} from '~/content/commission-guide.mock'

import {
  createCommissionGuideSnapshot,
} from '~~/shared/schema/commission-guide'
import {
  resolveCommissionTermsForService,
} from '~/utils/commission-terms'

import type {
  CommissionServiceId,
} from '~~/shared/types/commission-guide'

export const commissionGuide =
  createCommissionGuideSnapshot(COMMISSION_GUIDE_MOCK)

export const enabledCommissionServices = Object.freeze(
  commissionGuide.services.filter(service => service.enabled),
)

export const enabledCommissionTerms = Object.freeze(
  commissionGuide.terms.filter(term => term.enabled),
)

export function resolveCommissionTerms(
  serviceId: CommissionServiceId,
) {
  const service = enabledCommissionServices.find(candidate => (
    candidate.id === serviceId
  ))
  if (service === undefined) {
    throw new TypeError(`commission-service-missing:${serviceId}`)
  }

  return Object.freeze(
    resolveCommissionTermsForService(
      enabledCommissionTerms,
      service,
    ),
  )
}
