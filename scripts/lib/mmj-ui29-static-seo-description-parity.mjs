export function matchesStaticSeoDescription(actualDescription, expectedDescription) {
  if (typeof expectedDescription !== 'string') {
    throw new TypeError('Expected SEO description must be a string.')
  }
  if (actualDescription !== null && typeof actualDescription !== 'string') {
    throw new TypeError('Actual prerender SEO description must be a string or null.')
  }

  return expectedDescription === ''
    ? actualDescription === null || actualDescription === ''
    : actualDescription === expectedDescription
}
