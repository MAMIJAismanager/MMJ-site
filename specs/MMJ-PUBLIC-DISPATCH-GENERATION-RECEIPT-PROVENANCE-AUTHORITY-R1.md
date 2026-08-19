# MMJ-PUBLIC-DISPATCH-GENERATION-RECEIPT-PROVENANCE-AUTHORITY-R1

## Contract

```text
Dispatch Generation Receipt Producer Authority /
No Synthetic Head Producer Requirement /
Current Head · Receipt Exact Producer Parity Preservation /
Historical R14B Build Input Lock PASS /
R14C Build Input Lock PASS /
No Live Head Fetch /
No Fake Head Provenance /
Exact Receipt Producer Preservation
```

## 1. Problem

`createBuildInputLock()` previously required `input.head.producerRelease === input.receipt.producerRelease` for every adoption mode. That is valid for current-head adoption because the head and receipt are independently observed. It is invalid for dispatch-generation adoption because that path deliberately does not fetch the live head. Its `head` object is only a build identity projection derived from the exact receipt and owns no independent producer provenance.

The observed production failure was therefore structurally valid evidence of a contract bug:

```text
headProducerRelease = undefined
receiptProducerRelease = 0.7.20-mmj-portfolio-legacy-optional-year-r14b
```

The historical receipt was admitted, but the generated-stage lock incorrectly required provenance from a head that had never been observed.

## 2. Authority split

### Current-head adoption

Authority chain:

```text
observed current head
  -> exact receipt
  -> exact head/receipt producer parity
  -> build input lock
```

Rules:

- `head.producerRelease` is required and must be explicitly admitted.
- `receipt.producerRelease` is required and must be explicitly admitted.
- The two producer releases must be exactly equal.
- Cross-producer current-head pairs remain deterministic failures.

### Dispatch-generation adoption

Authority chain:

```text
repository dispatch payload
  -> exact dispatch generation
  -> exact receipt
  -> exact snapshot
  -> build input lock
```

Rules:

- No live portfolio head is fetched.
- The synthetic build `head` does not own `producerRelease`.
- `receipt.producerRelease` is the producer-provenance SSOT.
- The receipt producer must still pass the explicit R14B/R14C allowlist.
- Unknown future producers remain fail-closed.

## 3. BuildInputLock producer meaning

For both lock versions:

```text
BuildInputLock.producerRelease
=
producer release recorded by the exact receipt consumed by this build
```

It MUST NOT mean:

- current CMS producer release,
- latest admitted producer release,
- public consumer release,
- synthetic head producer release.

Historical provenance is not normalized forward.

## 4. Required implementation

`createBuildInputLock()` MUST admit the receipt producer in all modes, but MUST perform head admission and exact head/receipt parity only when `input.generation` is absent.

Canonical structure:

```js
admitProducerRelease(input.receipt.producerRelease, ..., 'Receipt')

if (!input.generation) {
  admitProducerRelease(input.head.producerRelease, ..., 'Head')
  if (input.head.producerRelease !== input.receipt.producerRelease) {
    fail(...)
  }
}

producerRelease: input.receipt.producerRelease
```

## 5. Forbidden implementation

The following are prohibited:

```text
producerRelease: PRODUCER_RELEASE
```

```text
syntheticHead.producerRelease = receipt.producerRelease
```

```text
dispatch-generation -> fetch current /portfolio-snapshot/head
```

```text
missing head.producerRelease -> infer dispatch mode
```

Adoption mode is determined by the explicit generation context, not by missing fields.

## 6. Historical R14B closure

For an exact historical receipt:

```text
producerRelease = 0.7.20-mmj-portfolio-legacy-optional-year-r14b
```

and valid generation context:

```text
head.producerRelease absent
```

MUST PASS and produce:

```text
schemaVersion = 2
adoptionMode = dispatch-generation
producerRelease = 0.7.20-mmj-portfolio-legacy-optional-year-r14b
```

## 7. R14C closure

An exact R14C receipt MUST likewise produce an R14C BuildInputLock without synthetic head provenance.

## 8. Current-head parity preservation

The following MUST continue to fail:

```text
current head R14B + receipt R14C
current head R14C + receipt R14B
current head missing producerRelease
```

This revision removes only the invalid dispatch-generation head requirement. It does not weaken current-head provenance.

## 9. No live-head contamination

Dispatch-generation MUST NOT query the current live head merely to obtain producer identity. Historical replay must not mix exact historical generation state with current CMS state.

## 10. Determinism

For the same exact generation and receipt, repeated `createBuildInputLock()` calls MUST produce structurally identical V2 locks and preserve the same receipt producer release.

## 11. Regression boundaries

This revision MUST NOT change:

- R11 empty-comment projection admission,
- R12 optional audio-artwork / nullable-cover admission,
- snapshot digest validation,
- asset/media validation,
- accessibility description admission,
- receipt-generation exact identity checks,
- generation stability checks,
- explicit producer allowlist semantics.

## 12. Mandatory tests

```text
01 current R14B head + R14B receipt PASS
02 current R14C head + R14C receipt PASS
03 current R14B head + R14C receipt FAIL
04 current R14C head + R14B receipt FAIL
05 current head missing producer FAIL
06 dispatch R14B receipt + no head producer PASS
07 dispatch R14C receipt + no head producer PASS
08 dispatch lock preserves exact R14B producer
09 dispatch lock preserves exact R14C producer
10 dispatch synthetic head producer is not authority
11 dispatch unknown future receipt producer FAIL
12 dispatch V2 lock deterministic
13 dispatch live-head fetch absent
14 synthetic dispatch head producer field absent
```

## 13. Promotion conditions

```text
DISPATCH_RECEIPT_PRODUCER_AUTHORITY_PASS = true
NO_SYNTHETIC_HEAD_PRODUCER_REQUIREMENT_PASS = true
CURRENT_HEAD_RECEIPT_PARITY_PASS = true
CURRENT_HEAD_CROSS_PRODUCER_REJECTION_PASS = true
HISTORICAL_R14B_BUILD_INPUT_LOCK_PASS = true
R14C_BUILD_INPUT_LOCK_PASS = true
EXACT_RECEIPT_PRODUCER_PRESERVATION_PASS = true
NO_LIVE_HEAD_FETCH_PASS = true
NO_FAKE_HEAD_PROVENANCE_PASS = true
UNKNOWN_FUTURE_PRODUCER_REJECTION_PASS = true
BUILD_INPUT_LOCK_V2_DETERMINISM_PASS = true
```

## Final authority statement

> Current-head mode compares the producer identity of two independently observed authorities. Dispatch-generation mode has no independently observed head producer, so the exact receipt owns producer provenance. BuildInputLock records the producer that actually created the receipt consumed by the build, without inventing a head observation or rewriting historical provenance.
