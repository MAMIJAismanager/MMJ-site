# MMJ-PUBLIC-R12-OPTIONAL-AUDIO-ARTWORK-AND-NULLABLE-COVER-PARITY-R1

## Seal

```text
Optional Audio Artwork Admission /

Nullable Audio artworkAssetId /
Nullable Project coverAssetId /
Nullable SEO ogAssetId /

Audio Primary Without Artwork PASS /
Audio Primary With Artwork Exact Image Binding /

No Synthetic Cover /
No Primary-Audio-as-Cover /
No Gallery-as-Cover Fallback /
No Site Placeholder Asset Authority /

Nullable Reachable-Graph Root Elision /
No Null Asset Identity Visit /

Project Type Nullable Cover Parity /
Resolver Nullable Cover Projection /
Card · Showcase · Related Nullable Cover View /

Presentation-Only Unbound Media State /
No Snapshot Mutation /

Image Self-Cover Invariant Preservation /
Video Poster Required Invariant Preservation /

Cover · SEO-OG Companion Parity /
Explicit Artwork Kind Validation /
Broken Explicit Artwork Still FAIL /

Current Head Adoption Parity /
Historical Dispatch Generation Parity /

Media · Digest · Rendition Authority Preservation
```

## 1. Upstream authority

This public revision adopts the CMS R12 portfolio projection contract without rewriting it.

The canonical primary-media companion mapping is:

```text
image primary -> coverAssetId = primary image id
video primary -> coverAssetId = posterAssetId
audio primary with artwork -> coverAssetId = artworkAssetId
audio primary without artwork -> coverAssetId = null
seo.ogAssetId -> exact coverAssetId
```

The CMS public-site parity contract already defines:

```text
audio.artworkAssetId: string | null
project.assets.coverAssetId: string | null
project.seo.ogAssetId: string | null
```

The public consumer must therefore distinguish canonical null absence from a broken explicit asset reference.

## 2. Shape authority

The following fields remain mandatory keys:

```text
asset.artworkAssetId
project.assets.coverAssetId
project.seo.ogAssetId
```

Their values may be `null` where R12 permits it.

`null` is the only canonical absence value. Missing keys, `undefined`, empty strings, wrong types, and malformed asset ids remain invalid.

## 3. Audio artwork admission

Audio assets admit:

```text
artworkAssetId = null
```

without failure.

When `artworkAssetId` is non-null, it remains an exact asset identity and must resolve to an image asset. A missing or wrong-kind explicit artwork reference is still invalid.

## 4. Project visual companion authority

After structural project and asset validation, the public consumer resolves the project's primary asset and derives one expected visual companion id:

```text
image -> primary.id
video -> primary.posterAssetId
audio -> primary.artworkAssetId
```

The project must satisfy:

```text
project.assets.coverAssetId === expected companion
project.seo.ogAssetId === expected companion
```

This establishes a single kind-aware companion SSOT and prevents partial states.

## 5. Valid audio states

### 5.1 No artwork

```text
primary.kind = audio
primary.artworkAssetId = null
project.assets.coverAssetId = null
project.seo.ogAssetId = null
```

Result: PASS.

### 5.2 Explicit artwork

```text
primary.kind = audio
primary.artworkAssetId = image A
project.assets.coverAssetId = image A
project.seo.ogAssetId = image A
```

Result: PASS only when image A exists and satisfies existing image rendition authority.

## 6. Forbidden fallback authority

The public consumer must not construct a visual companion when CMS emitted none.

Forbidden:

```text
primary audio used as cover
first gallery image used as cover
site placeholder inserted as project asset
synthetic/generated cover asset
cover inferred from filename or asset ordering
SEO OG silently substituted from another field
```

Presentation may show an unbound visual frame, but no presentation placeholder becomes portfolio domain data.

## 7. Image invariant

For image primary projects:

```text
coverAssetId = primaryAssetId
seo.ogAssetId = primaryAssetId
```

A null or different cover remains invalid.

## 8. Video invariant

Video poster remains required by the existing public contract.

For video primary projects:

```text
coverAssetId = primary.posterAssetId
seo.ogAssetId = primary.posterAssetId
```

A null project cover, missing poster, broken poster reference, or wrong-kind poster remains invalid.

## 9. Reachability graph

Null visual companions are not asset identities.

The graph traversal must not call `visit(null, ...)` for:

```text
audio.artworkAssetId
project.assets.coverAssetId
project.seo.ogAssetId
```

Non-null references continue through the existing exact asset, kind, and primary-rendition checks.

The primary project asset is visited before redundant companion roots so established primary media failure attribution remains stable.

## 10. Snapshot immutability

Admission never mutates snapshot content.

Forbidden:

```text
null -> placeholder id
null -> primary id
null -> gallery id
null -> undefined
```

Canonical `null` participates in the already-sealed snapshot identity and remains unchanged through validation.

## 11. Type parity

The public TypeScript contract must expose:

```ts
ProjectAssetReferences.coverAssetId: AssetId | null
ProjectAssetCollectionView.cover: ResolvedImageAssetReference | null
ProjectCardView.cover: ResolvedImageAssetReference | null
ShowcaseProjectView.cover: ResolvedImageAssetReference | null
RelatedProjectView.cover: ResolvedImageAssetReference | null
```

Runtime nullable admission and TypeScript state ownership must agree.

## 12. Resolver parity

The project view resolver must branch before resolving the cover:

```text
coverAssetId = null -> resolved cover = null
coverAssetId = id   -> existing exact image resolver
```

It must not widen the core asset resolver itself into a nullable/fallback resolver and must not fabricate `ResolvedImageAssetReference` values.

Audio asset resolution already preserves `artwork: null` when no artwork is bound; this behavior is retained.

## 13. Presentation parity

Card, showcase, related-project, and detail projections must remain structurally renderable when cover is null.

The presentation layer may produce a `MediaFrame` with `imagePlan = null`, which is an existing unbound presentation state.

No project is filtered, hidden, or deprived of its route solely because it has no visual companion.

## 14. Existing authority preserved

This revision does not relax:

```text
project title authority
project/category authority
primary media requirement
post media slot parity
gallery identity parity
video poster requirement
explicit artwork image-kind requirement
exact primary rendition requirement
object-key authority
snapshot digest authority
receipt/head identity authority
R14B/R14C producer admission
R11 canonical empty-comment admission
```

## 15. Required regression matrix

Required PASS cases:

```text
audio primary + no artwork + cover null + OG null
audio primary + explicit artwork + exact cover + exact OG
image primary + self-cover
video primary + required poster + exact cover
R11 empty comment combined with R12 null visual companion
resolver card/showcase/related/detail null-cover projection
```

Required FAIL cases:

```text
audio no-artwork borrowing gallery cover
audio primary used as cover
audio artwork present but cover null
audio artwork present but SEO OG null
audio artwork/cover/SEO OG identity divergence
explicit artwork wrong kind
explicit artwork missing
image primary null cover
video primary null cover
missing nullable keys
empty-string pseudo-null ids
```

## 16. Adoption parity

The same snapshot semantics apply to both:

```text
currentHeadTransaction()
dispatchGenerationTransaction()
```

R12 compatibility is independent of current-head versus historical generation adoption.

## 17. Completion seal

```text
No artwork means no artwork.
No cover means no cover.
Null is not an asset id.

If a visual companion exists, its identity must remain exact from
primary media -> companion -> project cover -> SEO OG.

If it does not exist, the public site renders an unbound visual state
without inventing domain data.
```
