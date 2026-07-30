// Generated only by the sealed MMJ public-content handoff transaction.
import commissionGuideSnapshot from '../../generated/commission-guide.snapshot.json'

import {
  createCommissionGuideSnapshot,
} from '~~/shared/schema/commission-guide'
import {
  resolveCommissionTermsForService,
} from '~/utils/commission-terms'

import type {
  CommissionGuideContent,
  CommissionServiceId,
} from '~~/shared/types/commission-guide'

const publishedCommissionGuide =
  commissionGuideSnapshot.content as CommissionGuideContent

export const commissionGuide =
  createCommissionGuideSnapshot(publishedCommissionGuide)

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
