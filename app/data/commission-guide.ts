import {
  COMMISSION_GUIDE_MOCK,
} from '~/content/commission-guide.mock'

import {
  createCommissionGuideSnapshot,
} from '~~/shared/schema/commission-guide'

export const commissionGuide =
  createCommissionGuideSnapshot(COMMISSION_GUIDE_MOCK)

export const enabledCommissionServices = Object.freeze(
  commissionGuide.services.filter(service => service.enabled),
)
