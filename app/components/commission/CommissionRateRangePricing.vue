<script setup lang="ts">
import {
  computed,
} from 'vue'

import {
  formatCommissionRateRange,
  formatCommissionRateRangeAccessible,
} from '~/utils/commission-price-range-formatter'

import type {
  CommissionRateRangePricing,
} from '~~/shared/types/commission-guide'
import type {
  CommissionDetailDensity,
} from '~/utils/commission-detail-density'

interface Props {
  readonly pricing: CommissionRateRangePricing
  readonly idPrefix: string
  readonly mode: 'desktop' | 'mobile'
  readonly density?: CommissionDetailDensity
  readonly serviceLabel: string
}

const props = withDefaults(defineProps<Props>(), {
  density: 'comfortable',
})

const visibleItems = computed(() => (
  props.pricing.items
    .filter(item => item.enabled)
    .toSorted((left, right) => left.order - right.order)
    .map(item => ({
      ...item,
      displayPrice: formatCommissionRateRange(item, props.pricing),
      accessiblePrice: formatCommissionRateRangeAccessible(
        item,
        props.pricing,
      ),
      metaLabel: [item.basisLabel, item.expenseLabel]
        .filter((value): value is string => Boolean(value))
        .join(' · '),
    }))
))

const accessibleTitle = computed(() => (
  `${props.serviceLabel} 기본 가격표`
))
</script>

<template>
  <section
    class="mm-commission-rate-range"
    data-mm-commission-pricing-kind="rate-range"
    :data-mm-commission-rate-count="visibleItems.length"
    :data-mm-commission-density="density"
  >
    <header
      v-if="mode === 'mobile'"
      class="mm-commission-rate-range__header"
    >
      <p class="mm-commission-rate-range__unit">
        단위: {{ pricing.unitLabel }}
      </p>
    </header>

    <div class="mm-commission-rate-range__desktop">
      <div class="mm-commission-pricing-table-frame">
        <table class="mm-commission-pricing-table mm-commission-rate-range__table">
          <caption class="mm-visually-hidden">
            {{ accessibleTitle }}
          </caption>
          <colgroup>
            <col class="mm-commission-rate-range__role-column">
            <col class="mm-commission-rate-range__price-column">
          </colgroup>
          <thead>
            <tr>
              <th scope="col">
                {{ pricing.rowAxisLabel }}
              </th>
              <th scope="col">
                <span class="mm-commission-pricing-table__column-label">
                  {{ pricing.rangeAxisLabel }}
                </span>
                <small
                  v-if="pricing.rangeAxisDetailLabel"
                  class="mm-commission-pricing-table__column-detail"
                >
                  {{ pricing.rangeAxisDetailLabel }}
                </small>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in visibleItems"
              :key="item.id"
            >
              <th
                scope="row"
                class="mm-commission-pricing-table__row-header"
              >
                <span class="mm-commission-pricing-table__row-header-content">
                  <span class="mm-commission-pricing-table__row-label">
                    {{ item.label }}
                  </span>
                  <small
                    v-if="item.detailLabel"
                    class="mm-commission-pricing-table__row-detail"
                  >
                    {{ item.detailLabel }}
                  </small>
                </span>
              </th>
              <td class="mm-commission-pricing-table__price-cell">
                <strong :aria-label="item.accessiblePrice">
                  {{ item.displayPrice }}
                </strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      class="mm-commission-rate-range__mobile"
      role="list"
      :aria-label="accessibleTitle"
    >
      <article
        v-for="item in visibleItems"
        :key="item.id"
        class="mm-commission-pricing-card mm-commission-rate-card"
        role="listitem"
        :aria-labelledby="`${idPrefix}-rate-${item.id}`"
      >
        <header class="mm-commission-pricing-card__header">
          <h4
            :id="`${idPrefix}-rate-${item.id}`"
            class="mm-commission-pricing-card__title"
          >
            {{ item.label }}
          </h4>
          <p
            v-if="item.detailLabel"
            class="mm-commission-pricing-card__detail"
          >
            {{ item.detailLabel }}
          </p>
        </header>
        <div class="mm-commission-rate-card__body">
          <strong
            class="mm-commission-rate-card__price"
            :aria-label="item.accessiblePrice"
          >
            {{ item.displayPrice }}
          </strong>
          <span class="mm-commission-rate-card__meta">
            {{ item.metaLabel }}
          </span>
          <small v-if="item.note">
            {{ item.note }}
          </small>
        </div>
      </article>
    </div>

    <p
      v-if="pricing.footnote"
      class="mm-commission-rate-range__footnote"
    >
      {{ pricing.footnote }}
    </p>
  </section>
</template>
