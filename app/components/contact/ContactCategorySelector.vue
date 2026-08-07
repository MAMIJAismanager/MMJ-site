<script setup lang="ts">
import { CONTACT_INQUIRY_CATEGORIES } from '~/contact/contact-category-registry'
import type { ContactInquiryCategoryId } from '~/contact/contact-form-schema'

interface Props {
  readonly modelValue: ContactInquiryCategoryId | null
}

interface Emits {
  (event: 'update:modelValue', value: ContactInquiryCategoryId): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <fieldset
    class="mm-contact-form__fieldset"
    data-mm-contact-category-selector
  >
    <legend class="mm-contact-form__legend">
      문의 카테고리 <span aria-hidden="true">*</span>
    </legend>

    <div class="mm-contact-form__choice-grid">
      <label
        v-for="category in CONTACT_INQUIRY_CATEGORIES"
        :key="category.id"
        class="mm-contact-form__choice"
      >
        <input
          class="mm-contact-form__radio"
          type="radio"
          name="inquiry_category"
          :value="category.id"
          :checked="modelValue === category.id"
          @change="emit('update:modelValue', category.id)"
        >
        <span>{{ category.label }}</span>
      </label>
    </div>
  </fieldset>
</template>
