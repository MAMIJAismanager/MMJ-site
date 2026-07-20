<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  watch,
} from 'vue'

import SiteNavList from '~/components/shell/SiteNavList.vue'

import {
  useBrandEntryArbitrator,
} from '~/composables/useBrandEntryArbitrator'
import {
  useDocumentScrollLock,
} from '~/composables/useDocumentScrollLock'
import {
  useMobileMenuController,
} from '~/composables/useMobileMenuController'
import {
  resolveNavigationOriginPath,
} from '~/utils/navigation-restoration'

const route = useRoute()

const {
  pendingSingleClick: brandClickPending,
  onPointerDown: onBrandPointerDown,
  onPointerMove: onBrandPointerMove,
  onPointerUp: onBrandPointerUp,
  onClick: onBrandClick,
} = useBrandEntryArbitrator()

const {
  phase: menuPhase,
  active: menuActive,
  isMobileViewport,
  triggerVisibility,
  open: openMenuPhase,
  close: closeMenuPhase,
} = useMobileMenuController()

const {
  locked: scrollLocked,
  owner: scrollLockOwner,
  lock: lockDocumentScroll,
  unlock: unlockDocumentScroll,
  forceRelease: forceReleaseDocumentScroll,
} = useDocumentScrollLock()

const headerInnerRef = ref<HTMLElement | null>(null)
const menuSurfaceRef = ref<HTMLElement | null>(null)
const menuOpenButtonRef = ref<HTMLButtonElement | null>(null)
const menuCloseButtonRef = ref<HTMLButtonElement | null>(null)
const shouldRestoreTriggerFocus = ref(false)
const inertSnapshots = new Map<HTMLElement, boolean>()

const hasWorksContext = computed(() => (
  resolveNavigationOriginPath(route.path) === '/works'
))
const menuContext = computed(() => (
  hasWorksContext.value ? 'works' : 'none'
))

function backgroundInertTargets(): HTMLElement[] {
  if (!import.meta.client) return []

  return [
    headerInnerRef.value,
    document.querySelector<HTMLElement>('.mm-skip-link'),
    document.querySelector<HTMLElement>('#main-content'),
    document.querySelector<HTMLElement>('.mm-site-footer'),
    document.querySelector<HTMLElement>('[data-mm-global-audio-host]'),
  ].filter((element): element is HTMLElement => element !== null)
}

function setBackgroundInert(enabled: boolean): void {
  if (!import.meta.client) return

  if (enabled) {
    for (const element of backgroundInertTargets()) {
      if (!inertSnapshots.has(element)) {
        inertSnapshots.set(element, element.inert)
      }
      element.inert = true
    }
    return
  }

  for (const [element, previousValue] of inertSnapshots) {
    element.inert = previousValue
  }
  inertSnapshots.clear()
}

function focusableMenuElements(): HTMLElement[] {
  const surface = menuSurfaceRef.value
  if (surface === null) return []

  return Array.from(surface.querySelectorAll<HTMLElement>([
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(','))).filter(element => (
    !element.hidden
    && element.getAttribute('aria-hidden') !== 'true'
    && element.offsetParent !== null
  ))
}

async function focusInitialMenuControl(): Promise<void> {
  await nextTick()
  requestAnimationFrame(() => {
    const surface = menuSurfaceRef.value
    const currentPageLink = surface?.querySelector<HTMLElement>(
      '.mm-site-navigation__link[aria-current="page"]',
    )
    const firstNavigationLink = surface?.querySelector<HTMLElement>(
      '.mm-site-navigation__link',
    )

    ;(currentPageLink ?? firstNavigationLink ?? menuCloseButtonRef.value)?.focus()
  })
}

function openMenu(): void {
  if (!isMobileViewport.value || menuActive.value) return

  shouldRestoreTriggerFocus.value = false
  lockDocumentScroll('site-menu')
  setBackgroundInert(true)
  openMenuPhase()
  void focusInitialMenuControl()
}

function closeMenu(
  restoreTriggerFocus = false,
  immediate = false,
): void {
  if (!menuActive.value && menuPhase.value === 'closed') return

  shouldRestoreTriggerFocus.value = restoreTriggerFocus
  closeMenuPhase(immediate)
}

function handleMenuSurfaceKeydown(event: KeyboardEvent): void {
  if (!menuActive.value) return

  if (event.key === 'Escape') {
    event.preventDefault()
    closeMenu(true)
    return
  }

  if (event.key !== 'Tab') return

  const focusable = focusableMenuElements()
  if (focusable.length === 0) {
    event.preventDefault()
    menuCloseButtonRef.value?.focus()
    return
  }

  const first = focusable[0]
  const last = focusable.at(-1)
  const activeElement = document.activeElement

  if (event.shiftKey && activeElement === first) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}

watch(
  () => route.path,
  (nextPath, previousPath) => {
    if (nextPath !== previousPath) closeMenu(false, true)
  },
)

watch(
  menuPhase,
  async phase => {
    if (phase !== 'closed') return

    setBackgroundInert(false)
    unlockDocumentScroll('site-menu')

    if (shouldRestoreTriggerFocus.value) {
      shouldRestoreTriggerFocus.value = false
      await nextTick()
      menuOpenButtonRef.value?.focus()
    }
  },
)

watch(
  isMobileViewport,
  isMobile => {
    if (!isMobile) closeMenu(false, true)
  },
)

onBeforeUnmount(() => {
  setBackgroundInert(false)
  forceReleaseDocumentScroll('site-menu')
})
</script>

<template>
  <header
    class="mm-site-header"
    :data-menu-open="menuActive ? 'true' : 'false'"
    :data-mm-mobile-menu-phase="menuPhase"
    :data-mm-menu-trigger-visibility="triggerVisibility"
    :data-mm-document-scroll-lock="scrollLocked ? 'locked' : 'unlocked'"
    :data-mm-document-scroll-lock-owner="scrollLockOwner"
    data-mm-site-header
  >
    <div
      ref="headerInnerRef"
      class="mm-shell-frame mm-site-header__inner"
    >
      <a
        class="mm-site-header__brand"
        href="/"
        aria-label="매미: 著 홈. 데스크톱 더블클릭 시 숨은 작업실 진입"
        :data-mm-brand-click-pending="brandClickPending ? 'true' : 'false'"
        data-mm-brand-hidden-entry
        @pointerdown="onBrandPointerDown"
        @pointermove="onBrandPointerMove"
        @pointerup="onBrandPointerUp"
        @pointercancel="onBrandPointerUp"
        @click="onBrandClick"
      >
        매미: 著
      </a>

      <button
        ref="menuOpenButtonRef"
        class="mm-site-header__menu-button"
        type="button"
        aria-controls="mm-mobile-menu-surface"
        :aria-expanded="menuActive"
        aria-label="사이트 메뉴 열기"
        @click="openMenu"
      >
        <span aria-hidden="true">메뉴</span>
      </button>

      <div class="mm-site-header__desktop-navigation">
        <SiteNavList label="주요 메뉴" />
      </div>
    </div>

    <div
      id="mm-mobile-menu-surface"
      ref="menuSurfaceRef"
      class="mm-mobile-menu-surface"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mm-mobile-menu-title"
      :aria-hidden="menuActive ? undefined : 'true'"
      :inert="!menuActive"
      :data-mm-mobile-menu-phase="menuPhase"
      :data-mm-mobile-menu-has-context-panel="hasWorksContext ? 'true' : 'false'"
      :data-mm-mobile-menu-context="menuContext"
      @keydown="handleMenuSurfaceKeydown"
    >
      <h2
        id="mm-mobile-menu-title"
        class="mm-visually-hidden"
      >
        사이트 메뉴 및 작업 필터
      </h2>

      <div class="mm-mobile-menu-surface__bar">
        <NuxtLink
          class="mm-site-header__brand"
          to="/"
          @click="closeMenu(false)"
        >
          매미: 著
        </NuxtLink>

        <button
          ref="menuCloseButtonRef"
          class="mm-site-header__menu-button mm-site-header__menu-button--close"
          type="button"
          aria-label="사이트 메뉴 닫기"
          @click="closeMenu(true)"
        >
          <span aria-hidden="true">닫기</span>
        </button>
      </div>

      <div class="mm-mobile-menu-surface__scroll">
        <SiteNavList
          label="주요 메뉴"
          @navigate="closeMenu(false)"
        />

        <section
          class="mm-mobile-menu-surface__context"
          :hidden="!hasWorksContext"
          :aria-labelledby="
            hasWorksContext
              ? 'mm-mobile-menu-context-title'
              : undefined
          "
        >
          <h3
            v-if="hasWorksContext"
            id="mm-mobile-menu-context-title"
            class="mm-section-title mm-mobile-menu-surface__context-title"
          >
            작업 필터
          </h3>

          <div
            id="mm-mobile-menu-context-slot"
            data-mm-mobile-menu-context-slot
          />
        </section>
      </div>
    </div>
  </header>
</template>
