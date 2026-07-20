import type {
  PortfolioGatewayCategoryId,
} from '../types/portfolio-gateway-category'

import type {
  ProjectId,
} from '../types/domain-identifiers'

export const WORKS_QUERY_KEYS = [
  'q',
  'category',
  'tag',
  'year',
  'sort',
  'project',
] as const

export const DEPRECATED_WORKS_QUERY_KEYS = [
  'role',
] as const

export type WorksQueryKey =
  typeof WORKS_QUERY_KEYS[number]

export type DeprecatedWorksQueryKey =
  typeof DEPRECATED_WORKS_QUERY_KEYS[number]

export const WORKS_SORT_VALUES = [
  'order',
  'newest',
  'oldest',
  'title',
] as const

export type WorksSort =
  typeof WORKS_SORT_VALUES[number]

export interface WorksQueryState {
  readonly q: string | null
  readonly category: PortfolioGatewayCategoryId | null
  readonly tag: string | null
  readonly year: number | null
  readonly sort: WorksSort
  readonly project: ProjectId | null
}

export const DEFAULT_WORKS_QUERY_STATE:
Readonly<WorksQueryState> = Object.freeze({
  q: null,
  category: null,
  tag: null,
  year: null,
  sort: 'order',
  project: null,
})

export type WorksRawQueryScalar =
  string | null | undefined

export type WorksRawQueryValue =
  | WorksRawQueryScalar
  | readonly WorksRawQueryScalar[]

export type WorksRawQuery =
  Readonly<Record<string, WorksRawQueryValue>>

export type WorksQueryIssueCode =
  | 'multiple-values'
  | 'empty-value'
  | 'unknown-category'
  | 'unknown-tag'
  | 'invalid-year'
  | 'unknown-sort'
  | 'invalid-project-id'
  | 'project-not-in-result'

export interface WorksQueryIssue {
  readonly key: WorksQueryKey
  readonly code: WorksQueryIssueCode
  readonly value: unknown
}

export function normalizeWorksQueryInput(
  value: string,
): string | null {
  const normalized = value
    .replace(/\s+/gu, ' ')
    .trim()

  return normalized.length > 0
    ? normalized
    : null
}

export function isWorksSort(
  value: unknown,
): value is WorksSort {
  return (
    typeof value === 'string'
    && (WORKS_SORT_VALUES as readonly string[])
      .includes(value)
  )
}
