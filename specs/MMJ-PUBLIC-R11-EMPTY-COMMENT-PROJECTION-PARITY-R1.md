# MMJ-PUBLIC-R11-EMPTY-COMMENT-PROJECTION-PARITY-R1

## 0. Revision status

| Item | Authority |
|---|---|
| Patch ID | `MMJ-PUBLIC-R11-EMPTY-COMMENT-PROJECTION-PARITY-R1` |
| Target | `MAMIJAismanager/MMJ-site` |
| Layer | public portfolio snapshot consumer |
| Parent public contract | `MMJ-UI29-A` |
| Upstream semantic authority | `MMJ-PORTFOLIO-PROJECTION-CONTRACT-PARITY-AND-FAILURE-ATTRIBUTION-R11` |
| Producer admission | R14B / R14C authority preserved |
| Empty `summary` | admitted |
| Empty `description` | admitted |
| Empty `post.comment` | admitted |
| Empty `seo.description` | admitted |
| `null` / missing / wrong type | rejected |
| `title` / `seo.title` | non-empty preserved |
| Media / category / digest gates | unchanged |

## 1. Problem

The CMS R11-compatible projection may intentionally serialize an absent project comment as canonical empty strings:

```text
summary = ""
description = ""
post.comment = ""
seo.description = ""
```

The public consumer previously required all four fields to be non-empty strings. A valid current-head snapshot could therefore fail at the first empty field with:

```text
E_MMJ_UI29_SNAPSHOT_INVALID
Expected non-empty string at $snapshot.projects[N].summary
```

The first failure does not define the whole mismatch. `summary`, `description`, `post.comment`, and `seo.description` share the same obsolete non-empty constraint and must be realigned together.

## 2. Core SSOT

```text
empty string != missing field
empty string != null
empty string != wrong type
```

An explicit `""` is admissible canonical data. The field itself remains mandatory and string-typed.

## 3. Canonical admission

The public validator SHALL admit:

```json
{
  "summary": "",
  "description": "",
  "post": { "comment": "" },
  "seo": { "description": "" }
}
```

The public validator SHALL still reject:

```text
null
missing property
number
boolean
array
object
value exceeding the existing max length
```

## 4. Exact validator changes

`summary`:

```js
string(value.summary, `${pointer}.summary`, code, { max: 2000 })
```

`description`:

```js
string(value.description, `${pointer}.description`, code, { max: 12000 })
```

`post.comment`:

```js
string(value.post.comment, `${pointer}.post.comment`, code, { max: 12000 })
```

`seo.description`:

```js
string(value.seo.description, `${pointer}.seo.description`, code, { max: 600 })
```

`nullableString()` MUST NOT replace these validators.

## 5. Non-empty authority preserved

The following remain non-empty:

```text
project.title
project.seo.title
```

This revision does not turn editorial identity fields into optional fields.

## 6. No source substitution

Forbidden:

```text
summary = summary || title
summary = description || title
description = description || title
post.comment = post.comment || title
seo.description = seo.description || title
```

Also forbidden:

```text
"No description"
"N/A"
"설명 없음"
"-"
whitespace / zero-width placeholders inserted only to satisfy validation
```

The public consumer validates upstream projection; it does not repair editorial content.

## 7. Exact-key authority preserved

The following keys remain structurally required:

```text
summary
description
post.comment
seo.description
```

`exactKeys()` semantics are unchanged. Empty-string admission does not mean optional-key admission.

## 8. Historical active publication rebuildability

An already active publication whose canonical source comment is empty MUST be rebuildable without:

```text
CMS re-save
new publication version
workbook repair
placeholder generation
latest-content substitution
```

Current-head and dispatch-generation paths SHALL use identical `validateSnapshot()` semantics.

## 9. CMS R11 projection parity

```text
CMS R11 canonical empty projection
        ↓
exact snapshot bytes / digest
        ↓
public fetch
        ↓
string type + max-length validation
        ↓
empty string admitted unchanged
```

The public side MUST NOT normalize `""` to `null`, `undefined`, a title, or generated prose.

## 10. Producer authority preserved

This revision inherits:

```text
0.7.20-mmj-portfolio-legacy-optional-year-r14b
0.7.21-mmj-immediate-publication-fast-lane-r14c
```

from `MMJ-PUBLIC-HISTORICAL-PRODUCER-ADMISSION-AND-EXACT-INPUT-PROVENANCE-R1`.

Producer admission and project text admission remain separate gates.

## 11. Unrelated validation MUST remain unchanged

This revision SHALL NOT relax:

```text
project / snapshot schemaVersion
project id / slug
category / gateway category
roles / tags parity
media item count and ordering
cover / primary / gallery relationships
asset reachability
featured / order
timing / client
seo.title / seo.ogAssetId / seo.indexable
source digest
snapshot raw-byte digest
collection / receipt identity
route count / route digest
producer provenance
```

## 12. Snapshot mutation prohibition

Validation MUST be read-only with respect to canonical project content.

For an admitted snapshot:

```text
before.summary == ""
after.summary  == ""
```

and the same applies to `description`, `post.comment`, and `seo.description`.

The semantic digest of the in-memory snapshot MUST be unchanged by validation.

## 13. Mandatory contract fixtures

Positive:

```text
all four canonical empty fields admitted
empty summary admitted independently
empty description admitted independently
empty post.comment admitted independently
empty seo.description admitted independently
```

Negative:

```text
null summary rejected
null description rejected
null post.comment rejected
null seo.description rejected

missing summary rejected
missing description rejected
missing post.comment rejected
missing seo.description rejected

wrong-type summary rejected
wrong-type description rejected
wrong-type post.comment rejected
wrong-type seo.description rejected

empty title rejected
empty seo.title rejected
```

Mutation:

```text
canonical empty snapshot digest before validation
==
canonical empty snapshot digest after validation
```

## 14. Static gate

The static gate SHALL prove:

```text
summary validator has no nonEmpty
 description validator has no nonEmpty
post.comment validator has no nonEmpty
seo.description validator has no nonEmpty

title validator still has nonEmpty
seo.title validator still has nonEmpty

known title/content fallback expressions are absent
known generated placeholders are absent from the public contract validator
```

## 15. Promotion conditions

```text
EMPTY_SUMMARY_ADMISSION_PASS = true
EMPTY_DESCRIPTION_ADMISSION_PASS = true
EMPTY_POST_COMMENT_ADMISSION_PASS = true
EMPTY_SEO_DESCRIPTION_ADMISSION_PASS = true

STRING_TYPE_AUTHORITY_PASS = true
NULL_REJECTION_PASS = true
MISSING_FIELD_REJECTION_PASS = true
WRONG_TYPE_REJECTION_PASS = true

NON_EMPTY_TITLE_AUTHORITY_PASS = true
NON_EMPTY_SEO_TITLE_AUTHORITY_PASS = true

NO_FALLBACK_MUTATION_PASS = true
NO_GENERATED_PLACEHOLDER_PASS = true
CMS_R11_PROJECTION_PARITY_PASS = true

EXISTING_PRODUCER_GATES_PASS = true
EXISTING_GENERATION_BOUND_GATES_PASS = true
EXISTING_MEDIA_CATEGORY_DIGEST_AUTHORITY_PRESERVED = true
```

## 16. Final authority declaration

Before R1:

```text
The public consumer treated four R11-compatible project text fields as mandatory non-empty editorial content and could reject canonical snapshots containing intentional empty strings.
```

After R1:

```text
Summary, description, post.comment, and seo.description remain mandatory bounded string fields, while zero-length strings are admitted as canonical R11 projection values.

Nulls, missing keys, wrong types, over-length values, empty titles, and unrelated structural violations remain invalid.

The public consumer does not invent substitute content and does not rewrite the snapshot it validates.
```

> Empty is not missing. If the CMS seals `""`, the public consumer reads `""`; if the key or type disappears, validation still fails.
