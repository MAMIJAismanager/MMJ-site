<script setup lang="ts">
import {
  ref,
} from 'vue'

import type {
  ComponentPublicInstance,
} from 'vue'

import type {
  CommissionService,
  CommissionServiceId,
} from '~~/shared/types/commission-guide'

interface Props {
  readonly heading: string
  readonly services: readonly CommissionService[]
}

defineProps<Props>()

const activeServiceId = ref<CommissionServiceId | null>(null)
const triggerElements = new Map<CommissionServiceId, HTMLButtonElement>()

function toggleService(
  serviceId: CommissionServiceId,
): void {
  activeServiceId.value = activeServiceId.value === serviceId
    ? null
    : serviceId
}

function isActive(
  serviceId: CommissionServiceId,
): boolean {
  return activeServiceId.value === serviceId
}

function setTriggerElement(
  serviceId: CommissionServiceId,
  element: Element | ComponentPublicInstance | null,
): void {
  if (
    typeof HTMLButtonElement !== 'undefined'
    && element instanceof HTMLButtonElement
  ) {
    triggerElements.set(serviceId, element)
    return
  }

  triggerElements.delete(serviceId)
}

function closeActiveService(): void {
  const active = activeServiceId.value
  if (active === null) return

  activeServiceId.value = null
  triggerElements.get(active)?.focus({ preventScroll: true })
}
</script>

<template>
  <section
    class="mm-commission-explorer"
    aria-labelledby="mm-commission-services-heading"
    data-mm-commission-explorer
    :data-mm-commission-active-service="activeServiceId ?? 'none'"
    @keydown.esc.prevent="closeActiveService"
  >
    <h2
      id="mm-commission-services-heading"
      class="mm-info-section__title"
    >
      {{ heading }}
    </h2>

    <TransitionGroup
      tag="ul"
      name="mm-commission-shift"
      class="mm-commission-service-list"
      data-mm-commission-service-list
    >
      <li
        v-for="service in services"
        :key="service.id"
        class="mm-commission-service"
        :data-active="isActive(service.id) ? 'true' : 'false'"
        :data-mm-commission-service-id="service.id"
      >
        <button
          :id="`mm-commission-trigger-${service.id}`"
          :ref="element => setTriggerElement(service.id, element)"
          class="mm-commission-service__trigger"
          type="button"
          :aria-expanded="isActive(service.id)"
          :aria-controls="`mm-commission-panel-${service.id}`"
          @click="toggleService(service.id)"
        >
          <span class="mm-commission-service__trigger-copy">
            <span class="mm-commission-service__label">
              {{ service.label }}
            </span>
            <span class="mm-commission-service__summary">
              {{ service.summary }}
            </span>
          </span>
          <span
            class="mm-commission-service__indicator"
            aria-hidden="true"
          >
            {{ isActive(service.id) ? '−' : '+' }}
          </span>
        </button>

        <section
          :id="`mm-commission-panel-${service.id}`"
          class="mm-commission-service__panel"
          role="region"
          :aria-labelledby="`mm-commission-trigger-${service.id}`"
          :aria-hidden="isActive(service.id) ? undefined : 'true'"
          :inert="!isActive(service.id)"
        >
          <div class="mm-commission-service__panel-inner">
            <div class="mm-commission-service__detail-grid">
              <div class="mm-commission-service__description-block">
                <p class="mm-commission-service__description">
                  {{ service.description }}
                </p>
              </div>

              <dl class="mm-commission-service__facts">
                <div class="mm-commission-service__fact mm-commission-service__fact--price">
                  <dt>기본 견적</dt>
                  <dd>
                    <strong>{{ service.price.displayLabel }}</strong>
                    <span
                      v-if="service.price.note"
                      class="mm-commission-service__price-note"
                    >
                      {{ service.price.note }}
                    </span>
                  </dd>
                </div>

                <div class="mm-commission-service__fact">
                  <dt>예상 기간</dt>
                  <dd>{{ service.turnaroundLabel }}</dd>
                </div>

                <div class="mm-commission-service__fact">
                  <dt>수정 범위</dt>
                  <dd>{{ service.revisionLabel }}</dd>
                </div>
              </dl>

              <div class="mm-commission-service__included">
                <h3 class="mm-commission-service__subheading">
                  기본 포함
                </h3>
                <ul class="mm-commission-service__included-list">
                  <li
                    v-for="item in service.includedItems"
                    :key="item"
                  >
                    {{ item }}
                  </li>
                </ul>
              </div>

              <p
                v-if="service.additionalCostNote"
                class="mm-commission-service__additional-note"
              >
                {{ service.additionalCostNote }}
              </p>

              <NuxtLink
                class="mm-info-action mm-info-action--primary mm-commission-service__inquiry"
                to="/contact"
              >
                {{ service.inquiryLabel }}
              </NuxtLink>
            </div>
          </div>
        </section>
      </li>
    </TransitionGroup>
  </section>
</template>

<style src="~/assets/css/commission-guide.css"></style>
