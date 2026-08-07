import type { ContactPayload } from '~/contact/contact-form-schema'

export type ContactSubmissionResult =
  | {
      readonly ok: true
    }
  | {
      readonly ok: false
      readonly kind: 'validation' | 'rate-limit' | 'network' | 'provider'
    }

export async function submitContactToFormspree(
  endpoint: string,
  payload: ContactPayload,
): Promise<ContactSubmissionResult> {
  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch {
    return Object.freeze({ ok: false, kind: 'network' })
  }

  if (response.ok) {
    return Object.freeze({ ok: true })
  }
  if (response.status === 400 || response.status === 422) {
    return Object.freeze({ ok: false, kind: 'validation' })
  }
  if (response.status === 429) {
    return Object.freeze({ ok: false, kind: 'rate-limit' })
  }
  return Object.freeze({ ok: false, kind: 'provider' })
}
