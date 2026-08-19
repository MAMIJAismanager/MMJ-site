# MMJ-PUBLIC-R12-OPTIONAL-AUDIO-ARTWORK-AND-NULLABLE-COVER-PARITY-R1 Implementation Receipt

## Result

`IMPLEMENTED / LOCAL CONTRACT VERIFIED`

Live CMS integration verification was attempted from the bake environment but could not reach `cms.mamajing.work` because DNS resolution returned `EAI_AGAIN`. No live PASS is claimed by this receipt.

## Parent SSOT

`MMJ-site-main_MMJ-PUBLIC-R11-EMPTY-COMMENT-PROJECTION-PARITY-R1_baked.zip`

## Upstream evidence used

CMS R12 source in the supplied R14C package establishes:

- `portfolio-project-projection.ts::deriveCover()` returns primary image id for image, video poster id for video, audio artwork id for audio, and `null` for audio without artwork.
- project projection assigns `seo.ogAssetId` from the derived cover id.
- `portfolio-asset-graph.ts` treats audio artwork as optional but validates explicit artwork existence and image kind.
- `portfolio-public-site-type-parity.ts` declares `coverAssetId` and `ogAssetId` nullable.

## Changed runtime authority

### Public contract

- audio `artworkAssetId` uses nullable string validation.
- project `coverAssetId` uses nullable string validation.
- project `seo.ogAssetId` uses nullable string validation.
- added kind-aware `validateProjectVisualCompanion()`.
- image primary derives self-cover.
- video primary derives poster cover.
- audio primary derives artwork or null.
- cover and SEO OG must equal the exact derived companion.
- audio null artwork is not traversed.
- null cover and null SEO OG roots are not traversed.
- primary media root is traversed before redundant cover roots to preserve established media-renderability failure attribution.

### Shared types and resolver

- `ProjectAssetReferences.coverAssetId` is `AssetId | null`.
- project asset/view/card/showcase/related cover types are nullable.
- resolver preserves `cover = null` without fabricating an asset.

### Presentation

- project cards accept null cover and emit `imagePlan = null`.
- related projects accept null cover and emit `imagePlan = null`.
- showcase already had a null-aware `backdrop ?? cover` and unbound image-plan branch, retained unchanged.
- existing `MediaFrame` unbound state remains presentation-only.

### Regression fixture repair

`mmj-public-work-detail-media-renderability-admission-closure-r1-test.mjs` fixtures were aligned with R12 companion semantics:

- image primary uses self-cover.
- video primary uses its poster as cover.
- audio primary uses its artwork as cover.

The test still preserves the established `E_MMJ_PUBLIC_WORK_MEDIA_PRIMARY_SOURCE_MISSING` classifications for primary, video-poster, and audio-artwork rendition failures.

## Added verification

### R12 runtime test

`PASS_MMJ_PUBLIC_R12_OPTIONAL_AUDIO_ARTWORK_AND_NULLABLE_COVER_PARITY_R1_TEST`

`testCount = 22`

Covers:

- audio without artwork PASS
- audio with artwork exact binding PASS
- no gallery cover fallback
- no primary-audio cover fallback
- cover/SEO/artwork parity
- wrong-kind explicit artwork FAIL
- missing explicit artwork FAIL
- image self-cover invariant
- video poster/cover invariant
- mandatory nullable keys
- empty string is not null
- snapshot no-mutation
- resolver nullable card/showcase/related/detail projection

### Static gate

`PASS_MMJ_PUBLIC_R12_OPTIONAL_AUDIO_ARTWORK_AND_NULLABLE_COVER_PARITY_R1_STATIC_GATE`

Verified:

```text
optionalAudioArtwork = true
nullableProjectCover = true
nullableSeoOg = true
exactCompanionParity = true
nullGraphRootElision = true
nullableViewPropagation = true
syntheticCoverFallback = false
```

### Existing contract suite

`PASS_MMJ_UI29_A_CONTRACT_TESTS`

`testCount = 50`

### Media renderability regression

`PASS_MMJ_PUBLIC_WORK_DETAIL_MEDIA_RENDERABILITY_ADMISSION_CLOSURE_R1`

and static gate PASS.

### Global audio artwork regression

`PASS_MMJ_UI29_GLOBAL_AUDIO_ARTWORK_R2_MULTI_RENDITION_PLAYBACK_R1_TESTS`

`tests = 18`

and static gate PASS.

### Shared TypeScript compile

Targeted strict compile passed:

```text
tsc --noEmit --target ES2022 --module ESNext --moduleResolution bundler --strict --skipLibCheck \
  shared/types/project.ts \
  shared/view/portfolio-project-view.ts \
  shared/resolver/portfolio-project-view-resolver.ts \
  shared/query/portfolio-snapshot-query.ts
```

## Known pre-existing gate state

`mmj-public-informative-image-accessible-description-resolution-r2-gate.mjs` fails because it expects a Work Detail gallery-forwarding source signature that is already absent in the parent R11 bake.

The exact same gate was run against the unmodified parent ZIP and failed with the same message:

```text
Work Detail page does not forward project to gallery
```

Therefore this failure is not attributed to the R12 patch and was not silently modified as part of this revision.

## Live integration status

Attempted command equivalent to test-mode `sync:public-content`.

Observed environment failure:

```text
stage = head
code = E_MMJ_UI29_HANDOFF_TIMEOUT
originalCauseCode = EAI_AGAIN
```

This is a network/DNS limitation of the bake environment, so actual current CMS head adoption remains to be verified by GitHub Actions after push.

## Completion

R12 nullable visual-companion semantics are now carried across:

```text
public validation
-> asset graph
-> shared domain type
-> project view resolver
-> card/showcase/related/detail view
-> existing unbound media presentation
```

No synthetic cover, primary-audio cover substitution, gallery fallback, placeholder asset authority, or snapshot mutation was introduced.
