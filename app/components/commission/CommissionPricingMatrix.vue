<script setup lang="ts">
import {
  computed,
  nextTick,
  ref,
  watch,
} from 'vue'

import CommissionPricingRowTabs from '~/components/commission/CommissionPricingRowTabs.vue'

import {
  formatCommissionPriceCell,
  formatCommissionPriceCellAccessible,
} from '~/utils/commission-price-formatter'
import {
  formatCommissionRecurringPrice,
  formatCommissionRecurringPriceAccessible,
} from '~/utils/commission-recurring-price-formatter'
import {
  createCommissionPricingCoordinate,
  createCommissionPricingMatrixView,
} from '~/utils/commission-pricing-matrix'

import type {
  CommissionMatrixPricing,
  CommissionPricingCell,
  CommissionPricingFullSpanCell,
  CommissionPricingRowId,
} from '~~/shared/types/commission-guide'
import type {
  CommissionMatrixHeaderProjection,
  CommissionMobileMatrixRowProjection,
  CommissionPricingRowTabLayout,
} from '~/types/commission-presentation'
import type {
  CommissionDetailDensity,
} from '~/utils/commission-detail-density'

interface Props {
  readonly pricing: CommissionMatrixPricing
  readonly idPrefix: string
  readonly density?: CommissionDetailDensity
  readonly headerProjection?: CommissionMatrixHeaderProjection
  readonly accessibleTitle?: string
  readonly mobileRowProjection?: CommissionMobileMatrixRowProjection
  readonly mobileRowTabLayout?: CommissionPricingRowTabLayout
}

interface CommissionPricingCellView {
  readonly columnId: string
  readonly columnLabel: string
  readonly columnDetailLabel: string | null
  readonly displayPrice: string
  readonly accessiblePrice: string
  readonly note: string | null
}

interface CommissionPricingFullSpanCellView {
  readonly displayPrice: string
  readonly accessiblePrice: string
  readonly note: string | null
}

interface CommissionPricingRowView {
  readonly id: string
  readonly label: string
  readonly detailLabel: string | null
  readonly shortLabel: string | null
  readonly cells: readonly CommissionPricingCellView[]
  readonly fullSpanCell: CommissionPricingFullSpanCellView | null
}

const props = withDefaults(defineProps<Props>(), {
  density: 'comfortable',
  headerProjection: 'full',
  mobileRowProjection: 'stacked',
  mobileRowTabLayout: 'equal',
})

const emit = defineEmits<{
  rowChange: [rowId: CommissionPricingRowId]
}>()

const matrix = computed(() => (
  createCommissionPricingMatrixView(props.pricing)
))

const descriptionId = computed(() => (
  `${props.idPrefix}-pricing-description`
))

const displayDescription = computed(() => (
  props.density === 'compact'
    ? props.pricing.compactDescription
    : props.pricing.description
))

const describedById = computed(() => (
  props.headerProjection === 'full' && displayDescription.value
    ? descriptionId.value
    : undefined
))

const tableCaption = computed(() => (
  props.accessibleTitle?.trim()
    || props.pricing.title
))

const sectionLabelledBy = computed(() => (
  props.headerProjection === 'full'
    ? `${props.idPrefix}-pricing-title`
    : undefined
))

const sectionAriaLabel = computed(() => (
  props.headerProjection === 'full'
    ? undefined
    : tableCaption.value
))

const shouldRenderFootnote = computed(() => (
  Boolean(props.pricing.footnote)
  && props.headerProjection !== 'hidden'
  && (
    props.headerProjection === 'unit-only'
    || props.density === 'comfortable'
  )
))

const rowViews = computed<readonly CommissionPricingRowView[]>(() => (
  matrix.value.rows.map(row => {
    const fullSpanCell = matrix.value.fullSpanCellByRowId.get(row.id)
    return {
      id: row.id,
      label: row.label,
      detailLabel: row.detailLabel,
      shortLabel: row.shortLabel ?? null,
      cells: fullSpanCell === undefined
        ? matrix.value.columns.map(column => {
            const cell = getCell(row.id, column.id)
            return {
              columnId: column.id,
              columnLabel: column.label,
              columnDetailLabel: column.detailLabel,
              displayPrice: formatCommissionPriceCell(cell, props.pricing),
              accessiblePrice: formatCommissionPriceCellAccessible(cell, props.pricing),
              note: cell.note,
            }
          })
        : [],
      fullSpanCell: fullSpanCell === undefined
        ? null
        : createFullSpanCellView(fullSpanCell),
    }
  })
))

const activePricingRowId = ref<CommissionPricingRowId | null>(
  rowViews.value[0]?.id ?? null,
)

const activeRow = computed<CommissionPricingRowView | null>(() => (
  rowViews.value.find(row => row.id === activePricingRowId.value)
  ?? rowViews.value[0]
  ?? null
))

const usesSingleMobileRow = computed(() => (
  props.mobileRowProjection === 'single-row-tabs'
  && rowViews.value.length > 1
))

const mobileRows = computed<readonly CommissionPricingRowView[]>(() => (
  usesSingleMobileRow.value
    ? (activeRow.value === null ? [] : [activeRow.value])
    : rowViews.value
))

watch(
  () => rowViews.value.map(row => row.id).join('|'),
  () => {
    const activeStillExists = rowViews.value.some(row => (
      row.id === activePricingRowId.value
    ))
    if (!activeStillExists) {
      activePricingRowId.value = rowViews.value[0]?.id ?? null
    }
  },
)

async function selectPricingRow(rowId: CommissionPricingRowId): Promise<void> {
  const exists = rowViews.value.some(row => row.id === rowId)
  if (!exists) {
    throw new TypeError(`commission-pricing-row-unknown:${rowId}`)
  }
  if (activePricingRowId.value === rowId) return

  activePricingRowId.value = rowId
  await nextTick()
  emit('rowChange', rowId)
}

function createFullSpanCellView(
  cell: CommissionPricingFullSpanCell,
): CommissionPricingFullSpanCellView {
  return {
    displayPrice: formatCommissionRecurringPrice(cell, props.pricing),
    accessiblePrice: formatCommissionRecurringPriceAccessible(cell),
    note: cell.note,
  }
}

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
    :aria-labelledby="sectionLabelledBy"
    :aria-label="sectionAriaLabel"
    data-mm-commission-pricing-kind="matrix"
    :data-mm-commission-pricing-row-count="matrix.rows.length"
    :data-mm-commission-pricing-column-count="matrix.columns.length"
    :data-mm-commission-pricing-cell-count="matrix.expectedCellCount"
    :data-mm-commission-pricing-standard-cell-count="matrix.standardCellCount"
    :data-mm-commission-pricing-full-span-cell-count="matrix.fullSpanCellCount"
    :data-mm-commission-density="density"
    :data-mm-commission-header-projection="headerProjection"
    :data-mm-commission-mobile-row-projection="mobileRowProjection"
    :data-mm-commission-row-tab-layout="mobileRowTabLayout"
    :data-mm-commission-active-row-id="activePricingRowId ?? undefined"
  >
    <CommissionPricingRowTabs
      v-if="usesSingleMobileRow && activePricingRowId"
      :rows="rowViews"
      :active-row-id="activePricingRowId"
      :id-prefix="idPrefix"
      :accessible-title="tableCaption"
      :layout="mobileRowTabLayout"
      @select="selectPricingRow"
    />

    <header
      v-if="headerProjection !== 'hidden'"
      class="mm-commission-pricing-matrix__header"
    >
      <div v-if="headerProjection === 'full'">
        <h3
          :id="`${idPrefix}-pricing-title`"
          class="mm-commission-pricing-matrix__title"
        >
          {{ pricing.title }}
        </h3>
        <p
          v-if="displayDescription"
          :id="descriptionId"
          class="mm-commission-pricing-matrix__description"
        >
          {{ displayDescription }}
        </p>
      </div>
      <p class="mm-commission-pricing-matrix__unit">
        단위: {{ pricing.unitLabel }}
      </p>
    </header>

    <div class="mm-commission-pricing-matrix__desktop">
      <div class="mm-commission-pricing-table-frame">
        <table
          class="mm-commission-pricing-table"
          :aria-describedby="describedById"
        >
          <caption class="mm-visually-hidden">
            {{ tableCaption }}
          </caption>
          <colgroup>
            <col class="mm-commission-pricing-table__row-axis">
            <col
              v-for="column in matrix.columns"
              :key="column.id"
              class="mm-commission-pricing-table__price-column"
            >
          </colgroup>
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
                <span class="mm-commission-pricing-table__column-label">
                  {{ column.label }}
                </span>
                <small
                  v-if="column.detailLabel"
                  class="mm-commission-pricing-table__column-detail"
                >
                  {{ column.detailLabel }}
                </small>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rowViews"
              :key="row.id"
            >
              <th
                scope="row"
                class="mm-commission-pricing-table__row-header"
              >
                <span class="mm-commission-pricing-table__row-header-content">
                  <span class="mm-commission-pricing-table__row-label">
                    {{ row.label }}
                  </span>
                  <small
                    v-if="row.detailLabel"
                    class="mm-commission-pricing-table__row-detail"
                  >
                    {{ row.detailLabel }}
                  </small>
                </span>
              </th>
              <td
                v-if="row.fullSpanCell"
                :colspan="matrix.columns.length"
                class="mm-commission-pricing-table__price-cell mm-commission-pricing-table__full-span"
              >
                <strong :aria-label="row.fullSpanCell.accessiblePrice">
                  {{ row.fullSpanCell.displayPrice }}
                </strong>
                <small v-if="row.fullSpanCell.note">
                  {{ row.fullSpanCell.note }}
                </small>
              </td>
              <template v-else>
                <td
                  v-for="cell in row.cells"
                  :key="`${row.id}:${cell.columnId}`"
                  class="mm-commission-pricing-table__price-cell"
                >
                  <strong :aria-label="cell.accessiblePrice">{{ cell.displayPrice }}</strong>
                  <small v-if="cell.note">
                    {{ cell.note }}
                  </small>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      :id="usesSingleMobileRow ? `${idPrefix}-row-panel` : undefined"
      class="mm-commission-pricing-matrix__mobile"
      :role="usesSingleMobileRow ? 'tabpanel' : 'list'"
      :aria-labelledby="usesSingleMobileRow && activePricingRowId
        ? `${idPrefix}-row-tab-${activePricingRowId}`
        : undefined"
      :aria-label="usesSingleMobileRow ? undefined : tableCaption"
    >
      <article
        v-for="row in mobileRows"
        :key="row.id"
        class="mm-commission-pricing-card"
        :role="usesSingleMobileRow ? undefined : 'listitem'"
        :aria-labelledby="`${idPrefix}-pricing-row-${row.id}`"
      >
        <header class="mm-commission-pricing-card__header">
          <h4
            :id="`${idPrefix}-pricing-row-${row.id}`"
            class="mm-commission-pricing-card__title"
          >
            {{ row.label }}
          </h4>
          <p
            v-if="row.detailLabel"
            class="mm-commission-pricing-card__detail"
          >
            {{ row.detailLabel }}
          </p>
        </header>
        <div
          v-if="row.fullSpanCell"
          class="mm-commission-pricing-card__full-span"
        >
          <strong :aria-label="row.fullSpanCell.accessiblePrice">
            {{ row.fullSpanCell.displayPrice }}
          </strong>
          <small v-if="row.fullSpanCell.note">
            {{ row.fullSpanCell.note }}
          </small>
        </div>
        <dl
          v-else
          class="mm-commission-pricing-card__list"
        >
          <div
            v-for="cell in row.cells"
            :key="`${row.id}:${cell.columnId}`"
            class="mm-commission-pricing-card__item"
          >
            <dt>
              <span>{{ cell.columnLabel }}</span>
              <small v-if="cell.columnDetailLabel">
                {{ cell.columnDetailLabel }}
              </small>
            </dt>
            <dd>
              <strong :aria-label="cell.accessiblePrice">{{ cell.displayPrice }}</strong>
              <small v-if="cell.note">
                {{ cell.note }}
              </small>
            </dd>
          </div>
        </dl>
      </article>
    </div>

    <p
      v-if="shouldRenderFootnote"
      class="mm-commission-pricing-matrix__footnote"
    >
      {{ pricing.footnote }}
    </p>
  </section>
</template>
