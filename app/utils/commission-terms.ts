import type {
  CommissionService,
  CommissionTerm,
} from '~~/shared/types/commission-guide'

export function resolveCommissionTermsForService(
  terms: readonly CommissionTerm[],
  service: Pick<CommissionService, 'id' | 'excludedGlobalTermIds'>,
): readonly CommissionTerm[] {
  const excludedGlobalTermIds = new Set(
    service.excludedGlobalTermIds,
  )

  return terms.filter(term => (
    term.enabled
    && (
      (
        term.scope === 'global'
        && !excludedGlobalTermIds.has(term.id)
      )
      || (
        term.scope === 'service'
        && term.serviceId === service.id
      )
    )
  ))
}
