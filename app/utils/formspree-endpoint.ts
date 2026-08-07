export type FormspreeEndpointState =
  | {
      readonly status: 'ready'
      readonly endpoint: string
    }
  | {
      readonly status: 'unconfigured'
    }
  | {
      readonly status: 'invalid'
      readonly reason: string
    }

export function resolveFormspreeEndpoint(
  rawValue: string,
): FormspreeEndpointState {
  const value = rawValue.trim()
  if (value.length === 0) {
    return Object.freeze({ status: 'unconfigured' })
  }

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return Object.freeze({
      status: 'invalid',
      reason: 'invalid-url',
    })
  }

  if (url.protocol !== 'https:') {
    return Object.freeze({
      status: 'invalid',
      reason: 'https-required',
    })
  }

  if (url.hostname !== 'formspree.io') {
    return Object.freeze({
      status: 'invalid',
      reason: 'unexpected-host',
    })
  }

  if (!/^\/f\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)) {
    return Object.freeze({
      status: 'invalid',
      reason: 'unexpected-path',
    })
  }

  if (url.search.length > 0 || url.hash.length > 0) {
    return Object.freeze({
      status: 'invalid',
      reason: 'query-or-fragment-forbidden',
    })
  }

  return Object.freeze({
    status: 'ready',
    endpoint: `${url.origin}${url.pathname.replace(/\/$/, '')}`,
  })
}
