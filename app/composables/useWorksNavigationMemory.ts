import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  readonly,
  ref,
  toRaw,
  watch,
} from 'vue'

import {
  useRoute,
  useRouter,
} from '#imports'

import {
  useClientNavigationMemoryStore,
} from '~/composables/useClientNavigationMemoryStore'

import {
  createCurrentNavigationRouteKey,
  createNavigationRestorationPlan,
  entryMatches,
  resolveNavigationOriginPath,
  runWorksNavigationRestoration,
} from '~/utils/navigation-restoration'

import {
  executeWorksActivationTransaction,
  prepareAndClaimWorksActivationTransaction,
} from '~/utils/works-activation-transaction'

import type {
  NavigationRestorationPlan,
  NavigationRestorationResult,
  ProjectDetailActivationPayload,
} from '~/types/navigation-restoration'

import type {
  ComputedRef,
  Ref,
} from 'vue'

import type {
  WorksQueryState,
} from '~~/shared/query/works-query-state'

import type {
  NavigationMemoryEntry,
  NavigationRouteKey,
} from '~~/shared/types/navigation-memory'

import type {
  ProjectCardView,
} from '~~/shared/view/portfolio-project-view'

import type { ProjectId } from '~~/shared/types/domain-identifiers'

interface UseWorksNavigationMemoryOptions {
  readonly queryReady: Readonly<Ref<boolean>>
  readonly projects: ComputedRef<readonly ProjectCardView[]>
  readonly activeProject: ComputedRef<ProjectCardView | null>
  readonly replaceQuery: (
    patch: Partial<WorksQueryState>,
  ) => Promise<void>
}

export function useWorksNavigationMemory(
  options: UseWorksNavigationMemoryOptions,
) {
  const route = useRoute()
  const router = useRouter()
  const navigationMemoryStore = useClientNavigationMemoryStore()
  const restorationResult = ref<NavigationRestorationResult | null>(null)

  let mounted = false
  let restorationDisposed = false
  let activeTransactionId = 0
  let restoreGeneration = 0
  let restoreAttempted = false

  function readDocumentScrollTop(): number {
    const scrollingElement = document.scrollingElement
    return scrollingElement === null
      ? window.scrollY
      : scrollingElement.scrollTop
  }

  function createRouteKeyIfSupported(
    path: string,
    query: Readonly<Record<string, unknown>>,
  ): NavigationRouteKey | null {
    const canonicalPath = resolveNavigationOriginPath(path)
    if (canonicalPath === null) return null

    try {
      return createCurrentNavigationRouteKey(
        canonicalPath,
        query,
      )
    } catch {
      return null
    }
  }

  function readRouterRouteKey(): NavigationRouteKey | null {
    const current = router.currentRoute.value
    return createRouteKeyIfSupported(
      current.path,
      current.query,
    )
  }

  function currentRouteKey(): NavigationRouteKey | null {
    return createRouteKeyIfSupported(
      route.path,
      route.query,
    )
  }

  function findProjectLink(
    projectId: ProjectId,
  ): HTMLAnchorElement | null {
    const links = document.querySelectorAll<HTMLAnchorElement>(
      '[data-mm-project-card-link]',
    )
    for (const link of links) {
      if (link.dataset.mmProjectId === projectId) return link
    }
    return null
  }

  function handleDetailActivation(
    payload: ProjectDetailActivationPayload,
  ): void {
    const store = toRaw(navigationMemoryStore).value
    if (store === null) return

    const originRouteKey = readRouterRouteKey()
    if (originRouteKey === null) return

    let replacementRouteKey: NavigationRouteKey
    try {
      replacementRouteKey = createCurrentNavigationRouteKey(
        '/works',
        {
          ...router.currentRoute.value.query,
          project: payload.projectId,
        },
      )
    } catch {
      return
    }

    const transactionId = activeTransactionId + 1
    const transaction = prepareAndClaimWorksActivationTransaction({
      payload,
      transactionId,
      storeReady: true,
      originRouteKey,
      replacementRouteKey,
      documentScrollTop: readDocumentScrollTop(),
    })
    if (transaction === null) return

    activeTransactionId = transactionId

    void executeWorksActivationTransaction(transaction, {
      isLatest: candidate => candidate === activeTransactionId,
      readCurrentRouteKey: readRouterRouteKey,
      readCurrentFullPath: () => router.currentRoute.value.fullPath,
      replaceOrigin: async routeKey => {
        await router.replace(routeKey)
      },
      capture: entry => store.capture(entry),
      readEntry: () => store.entry,
      clearIfExact: entry => {
        if (!entryMatches(store.entry, entry)) return false
        return store.clear()
      },
      pushDetail: async href => {
        await router.push(href)
      },
      rollbackOrigin: async routeKey => {
        await router.replace(routeKey)
      },
    })
  }

  function requestFrame(): Promise<void> {
    return new Promise(resolve => {
      requestAnimationFrame(() => resolve())
    })
  }

  async function attemptRestoration(): Promise<void> {
    if (
      !mounted
      || restoreAttempted
      || !options.queryReady.value
      || navigationMemoryStore.value === null
    ) {
      return
    }

    restoreAttempted = true
    const store = toRaw(navigationMemoryStore).value
    if (store === null) return
    const hadEntry = store.entry !== null
    const routeKey = currentRouteKey()

    if (routeKey === null) {
      if (hadEntry) store.clear()
      restorationResult.value = Object.freeze({
        status: 'route-mismatch',
      })
      return
    }

    let entry: NavigationMemoryEntry | null
    try {
      entry = store.consumeForRoute(routeKey)
    } catch {
      store.clear()
      restorationResult.value = Object.freeze({
        status: 'route-mismatch',
      })
      return
    }

    if (entry === null) {
      restorationResult.value = Object.freeze({
        status: hadEntry ? 'route-mismatch' : 'no-entry',
      })
      return
    }

    let plan: NavigationRestorationPlan
    try {
      plan = createNavigationRestorationPlan(entry)
    } catch {
      restorationResult.value = Object.freeze({
        status: 'route-mismatch',
      })
      return
    }
    if (plan.origin !== 'works') {
      restorationResult.value = Object.freeze({
        status: 'route-mismatch',
      })
      return
    }

    const generation = ++restoreGeneration
    restorationResult.value = await runWorksNavigationRestoration(
      plan,
      {
        isCurrent: () => (
          !restorationDisposed
          && generation === restoreGeneration
        ),
        nextTick: async () => {
          await nextTick()
        },
        requestFrame,
        hasProject: projectId => (
          options.projects.value.some(
            project => project.id === projectId,
          )
          && options.activeProject.value?.id === projectId
        ),
        hasFocusTarget: projectId => (
          findProjectLink(projectId) !== null
        ),
        scrollDocument: top => {
          window.scrollTo({
            top,
            left: 0,
            behavior: 'auto',
          })
        },
        focusProject: projectId => {
          findProjectLink(projectId)?.focus({
            preventScroll: true,
          })
        },
      },
    )
  }

  onMounted(() => {
    mounted = true
    void attemptRestoration()
  })

  watch(
    () => options.queryReady.value,
    ready => {
      if (ready) void attemptRestoration()
    },
  )

  watch(
    () => navigationMemoryStore.value,
    store => {
      if (store !== null) void attemptRestoration()
    },
  )

  watch(
    () => route.fullPath,
    () => {
      restoreGeneration += 1
    },
    { flush: 'sync' },
  )

  onBeforeUnmount(() => {
    restorationDisposed = true
    restoreGeneration += 1
  })

  return {
    restorationResult: readonly(restorationResult),
    handleDetailActivation,
  }
}
