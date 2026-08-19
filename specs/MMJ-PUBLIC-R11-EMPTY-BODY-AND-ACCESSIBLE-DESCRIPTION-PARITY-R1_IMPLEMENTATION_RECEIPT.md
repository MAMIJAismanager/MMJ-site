# MMJ-PUBLIC-R11-EMPTY-BODY-AND-ACCESSIBLE-DESCRIPTION-PARITY-R1 Implementation Receipt

## Parent SSOT

`MMJ-PUBLIC-DISPATCH-GENERATION-RECEIPT-PROVENANCE-AUTHORITY-R1`

## Implementation

The accessible-description resolver now treats exhausted optional description sources as canonical absence:

```text
explicit alt -> caption -> project body -> summary -> null
```

`resolveWorkDetailImageAccessibility()` maps that null result to `{ mode: 'decorative' }` instead of throwing. `admitPortfolioAccessibleDescriptions()` records a decorative receipt with null provenance/source metadata while preserving the original media context.

Malformed explicit alt handling is unchanged and continues to throw `invalid-explicit-image-alt`, which the public contract maps to `E_MMJ_PUBLIC_EXPLICIT_IMAGE_ALT_TEXT_INVALID`.

The historical public error taxonomy for an unresolvable wrapped admission remains present in the public contract for compatibility, but canonical pure absence no longer reaches it because the shared authority returns `null` rather than raising `accessible-description-unresolvable`.

## Changed behavioral authority

- `shared/resolver/accessible-description-resolution.ts`
  - removed the pure-absence `accessible-description-unresolvable` throw path
  - informative-intent + source absence now returns null
  - final image accessibility becomes decorative on null
  - admission receipt becomes decorative on null

- `scripts/mmj-public-informative-image-accessible-description-resolution-r2-test.mjs`
  - retired the obsolete expectation that all-source absence must fail
  - added regression that source absence becomes decorative
  - added public-contract admission regression for canonical empty body

- `scripts/mmj-public-r11-empty-body-accessible-description-parity-r1-test.mjs`
  - 12 dedicated fixtures covering precedence, absence, invalid explicit alt, no hidden fallbacks, public admission, and snapshot immutability

- `scripts/mmj-public-r11-empty-body-accessible-description-parity-r1-gate.mjs`
  - seals R11 empty-body validation, absence-to-decorative authority, forbidden hidden fallbacks, package marker, and gate ordering

- `package.json`
  - adds the dedicated R1 gate and release marker
  - runs the parity gate after the base R2 gate and before presentation-planner admission

## Explicit non-changes

- no alt-text authoring requirement
- no CMS mutation
- no historical snapshot rewrite
- no project title fallback
- no asset label fallback
- no filename fallback
- no generated description
- no media/digest/rendition relaxation
- no R12 nullable-cover change
- no dispatch-provenance change

## Verification target

The incident shape that previously failed:

```text
primary-image
altText = null
caption = null
project.description = ""
project.summary = ""
```

must produce decorative accessibility and complete accessible-description admission without snapshot mutation.
