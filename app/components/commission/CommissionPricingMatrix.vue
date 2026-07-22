<script setup lang="ts">
import {
  computed,
} from 'vue'

import {
  formatCommissionPriceCell,
} from '~/utils/commission-price-formatter'
import {
  createCommissionPricingCoordinate,
  createCommissionPricingMatrixView,
} from '~/utils/commission-pricing-matrix'

import type {
  CommissionMatrixPricing,
  CommissionPricingCell,
} from '~~/shared/types/commission-guide'

interface Props {
  readonly pricing: CommissionMatrixPricing
  readonly idPrefix: string
}

const props = defineProps<Props>()

const matrix = computed(() => (
  createCommissionPricingMatrixView(props.pricing)
))

const descriptionId = computed(() => (
  `${props.idPrefix}-pricing-description`
))

function getCell(
  rowId: string,
  columnId: string,
): CommissionPricingCell {
  const cell = matrix.value.cellByCoordinate.get(
    createCommissionPricingCoordinate(rowId, columnId),
  )
  if (cell === undefined) {
    throw new TypeError(
      `missing-commission-pricing-cell:${rowId}:${columnId}`,
    )
  }
  return cell
}
</script>

<template>
  <section
    class="mm-commission-pricing-matrix"
    :aria-labelledby="`${idPrefix}-pricing-title`"
    data-mm-commission-pricing-kind="matrix"
  >
    <header class="mm-commission-pricing-matrix__header">
      <div>
        <h3
          :id="`${idPrefix}-pricing-title`"
          class="mm-commission-pricing-matrix__title"
        >
          {{ pricing.title }}
        </h3>
        <p
          v-if="pricing.description"
          :id="descriptionId"
          class="mm-commission-pricing-matrix__description"
        >
          {{ pricing.description }}
        </p>
      </div>
      <p class="mm-commission-pricing-matrix__unit">
        단위: {{ pricing.unitLabel }}
      </p>
    </header>

    <table
      class="mm-commission-pricing-table"
      :aria-describedby="pricing.description ? descriptionId : undefined"
    >
      <caption class="mm-visually-hidden">
        {{ pricing.title }}
      </caption>
      <thead>
        <tr>
          <th scope="col">
            {{ pricing.rowAxisLabel }}
          </th>
          <th
            v-for="column in matrix.columns"
            :key="column.id"
            scope="col"
          >
            <span>{{ column.label }}</span>
            <small v-if="column.detailLabel">
              {{ column.detailLabel }}
            </small>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in matrix.rows"
          :key="row.id"
        >
          <th scope="row">
            <span>{{ row.label }}</span>
            <small v-if="row.detailLabel">
              {{ row.detailLabel }}
            </small>
          </th>
          <td
            v-for="column in matrix.columns"
            :key="column.id"
            :data-column-label="column.shortLabel"
          >
            <strong>
              {{ formatCommissionPriceCell(getCell(row.id, column.id), pricing) }}
            </strong>
            <small v-if="getCell(row.id, column.id).note">
              {{ getCell(row.id, column.id).note }}
            </small>
          </td>
        </tr>
      </tbody>
    </table>

    <p
      v-if="pricing.footnote"
      class="mm-commission-pricing-matrix__footnote"
    >
      {{ pricing.footnote }}
    </p>
  </section>
</template>
