# MMJ-PUBLIC-R11-EMPTY-BODY-AND-ACCESSIBLE-DESCRIPTION-PARITY-R1

## Status

- Target: `MAMIJAismanager/MMJ-site`
- Parent: `MMJ-PUBLIC-DISPATCH-GENERATION-RECEIPT-PROVENANCE-AUTHORITY-R1`
- Compatibility authority: `MMJ-PUBLIC-R11-EMPTY-COMMENT-PROJECTION-PARITY-R1`
- Accessible-description base: `MMJ-PUBLIC-INFORMATIVE-IMAGE-ACCESSIBLE-DESCRIPTION-RESOLUTION-R2`

## Problem

R11 admits canonical projects whose `summary`, `description`, and `post.comment` are empty strings. Accessible Description R2 already makes explicit image alt text optional and resolves accessible text in this order:

1. explicit image alt
2. media caption
3. project description/body
4. project summary

The remaining contradiction is the all-absent case. Before this revision, a primary or gallery image in an informative-intent context hard-failed when every optional description source was absent. That made a canonical R11 empty-body historical publication impossible to rebuild even though the snapshot itself was valid.

## SSOT

Description absence and malformed explicit description are distinct states.

```text
usable description exists
-> informative

no usable description source exists
-> decorative

explicit alt exists but is malformed
-> FAIL
```

No content is synthesized to bridge absence.

## Description precedence

The existing resolution order is preserved exactly:

```text
explicit alt
> media caption
> project description/body
> project summary
> canonical absence
```

Project body remains the main derived accessible-description authority. No explicit-alt authoring requirement is introduced.

## Canonical empty body

The following remains valid R11 public data:

```json
{
  "summary": "",
  "description": "",
  "post": { "comment": "" }
}
```

If the associated image also has no explicit alt and no usable caption, accessible-description resolution returns absence rather than throwing.

## Runtime accessibility

For an informative-intent image context:

```text
resolved description != null
-> { mode: "informative", altText: resolved.text }

resolved description == null
-> { mode: "decorative" }
```

The media context identity remains unchanged. A `primary-image` is not reclassified as another media kind. Only its final accessibility presentation becomes decorative when no description source exists.

## Admission receipt

Canonical source absence produces a receipt with:

```text
context = original context
accessibilityMode = decorative
provenance = null
derived = false
sourcePath = null
candidateIndex = null
```

No snapshot field is added or changed.

## Explicit alt validity

Explicit alt remains an override and remains strict.

The following continue to fail instead of falling through to body/caption:

- wrong type
- empty explicit string under the explicit-alt contract
- whitespace-only explicit string
- untrimmed explicit string
- control characters

A malformed explicit alt is never silently replaced with a valid body fallback.

## Forbidden fallbacks

The public resolver must not use or generate any of the following as accessible descriptions:

- `project.title`
- `asset.label`
- filenames or `objectKey` parsing
- route slugs
- categories
- generic `image` / `photo` / `picture` labels
- site identity text
- generated or AI-authored description

CMS preview conveniences do not become public accessibility provenance.

## Generic derived text

The existing generic-description rejection remains in force. If caption/body/summary only resolve to generic terms such as `이미지`, `사진`, `그림`, `image`, `photo`, or `picture`, the result is canonical source absence and therefore decorative presentation.

## Historical rebuildability

Historical immutable snapshots are not rewritten. An exact historical generation with:

```text
altText = null
caption = null
project.description = ""
project.summary = ""
```

must rebuild using the same bytes and digest. The public consumer adapts its presentation semantics; the historical snapshot remains immutable.

## Current-head / dispatch-generation parity

The same accessible-description authority is executed by generated-artifact verification for both current-head and dispatch-generation adoption. There is no mode-specific accessibility policy.

## Preserved authorities

This revision does not weaken:

- explicit invalid-alt rejection
- R11 empty-comment projection
- R12 nullable audio artwork / cover semantics
- media rendition and digest validation
- snapshot digest authority
- historical producer admission
- dispatch-generation receipt provenance authority
- generated artifact atomic commit

## Required tests

Positive:

1. explicit alt -> informative / `explicit-alt`
2. caption -> informative / `media-caption`
3. body -> informative / `project-description`
4. summary -> informative / `project-summary`
5. all sources absent -> decorative PASS
6. generic-only derived sources -> decorative PASS
7. public admission of R11 empty-body snapshot -> PASS
8. snapshot bytes/object unchanged by admission

Negative:

1. malformed explicit alt + valid body -> FAIL
2. project title must not become description
3. asset label must not become description
4. filename/object key must not become description

## Promotion gates

```text
BODY_AS_ACCESSIBLE_DESCRIPTION_PASS = true
NO_EXPLICIT_ALT_REQUIREMENT_PASS = true
EXPLICIT_ALT_OVERRIDE_PASS = true
MEDIA_CAPTION_FALLBACK_PASS = true
PROJECT_BODY_FALLBACK_PASS = true
PROJECT_SUMMARY_FALLBACK_PASS = true
CANONICAL_EMPTY_BODY_PASS = true
ABSENCE_DECORATIVE_ADMISSION_PASS = true
INVALID_EXPLICIT_ALT_REJECTION_PASS = true
NO_PROJECT_TITLE_FALLBACK_PASS = true
NO_ASSET_LABEL_FALLBACK_PASS = true
NO_FILENAME_FALLBACK_PASS = true
NO_GENERATED_DESCRIPTION_PASS = true
R11_EMPTY_COMMENT_COMPATIBILITY_PASS = true
HISTORICAL_EMPTY_BODY_REBUILD_PASS = true
SNAPSHOT_MUTATION_ZERO_PASS = true
CURRENT_HEAD_PARITY_PASS = true
DISPATCH_GENERATION_PARITY_PASS = true
```

## Authority statement

> 본문이 있으면 본문이 설명한다. 별도 대체텍스트가 있으면 그것이 우선한다. 둘 다 없으면 없는 말을 지어내지 않는다. 없음은 decorative로 봉인하고, 잘못 쓴 explicit alt만 실패시킨다.
