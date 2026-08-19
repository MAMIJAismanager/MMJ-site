# MMJ-PUBLIC-DISPATCH-GENERATION-RECEIPT-PROVENANCE-AUTHORITY-R1 Implementation Receipt

## Implemented scope

- `createBuildInputLock()` now always admits `receipt.producerRelease`.
- Head producer admission and exact head/receipt producer comparison now execute only in current-head mode (`!input.generation`).
- `BuildInputLock.producerRelease` remains exact `input.receipt.producerRelease` for V1 and V2.
- Dispatch-generation synthetic head remains producer-free.
- Generation-bound dispatch regression fixture now models the real production topology by omitting synthetic `head.producerRelease`.
- Dedicated dynamic and static R1 gates were added.

## Preserved authorities

- R14B and R14C explicit producer allowlist.
- Unknown future producer rejection.
- Current-head Head/Receipt exact producer parity.
- No live head fetch in dispatch-generation.
- Exact generation / receipt / snapshot binding.
- Historical producer provenance in BuildInputLock V2.

## Non-goals

This patch does not weaken or bypass `E_MMJ_PUBLIC_INFORMATIVE_IMAGE_DESCRIPTION_UNRESOLVABLE`. The accessible-description failure observed on project `prj_d100e36201bd75387291` is an independent content/admission issue and remains unchanged.

## Expected incident closure

The production failure:

```text
Build input head and receipt producer releases differ.
headProducerRelease: undefined
receiptProducerRelease: 0.7.20-mmj-portfolio-legacy-optional-year-r14b
```

must no longer occur for a valid dispatch-generation consuming that exact R14B receipt.

## Verification evidence

Validated in the bake workspace with Node 22.16 using `--experimental-strip-types` where the repository imports shared TypeScript modules. GitHub Actions uses Node 22.18.0, where the project already executes the same TypeScript-stripping path.

Observed PASS gates:

```text
PASS_MMJ_PUBLIC_DISPATCH_GENERATION_RECEIPT_PROVENANCE_AUTHORITY_R1_TESTS
PASS_MMJ_PUBLIC_DISPATCH_GENERATION_RECEIPT_PROVENANCE_AUTHORITY_R1_STATIC_GATE
PASS_MMJ_UI29_A_CONTRACT_TESTS (50)
PASS_BUILD_INPUT_GENERATION_SEAL
PASS_MMJ_PUBLIC_HISTORICAL_PRODUCER_ADMISSION_AND_EXACT_INPUT_PROVENANCE_R1_STATIC_GATE
PASS_MMJ_PUBLIC_R11_EMPTY_COMMENT_PROJECTION_PARITY_R1_STATIC_GATE
PASS_MMJ_PUBLIC_R12_OPTIONAL_AUDIO_ARTWORK_AND_NULLABLE_COVER_PARITY_R1_TEST (22)
PASS_MMJ_PUBLIC_R12_OPTIONAL_AUDIO_ARTWORK_AND_NULLABLE_COVER_PARITY_R1_STATIC_GATE
PASS_MMJ_UI29_A_STATIC_GATE
```

The accessibility-content failure from the live CI log was intentionally not altered by this revision.
