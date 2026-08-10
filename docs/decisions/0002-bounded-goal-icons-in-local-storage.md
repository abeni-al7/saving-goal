# ADR 0002: Bounded Goal Icons In Local Storage

- Status: Accepted
- Date: 2026-08-10
- Owners: Saving Goals maintainers

## Context

Users need optional visual artwork for identifying goals while the application
remains static, private, and usable without an account or network service. Raw
camera and downloaded images can be large, inconsistently encoded, and capable
of exhausting the browser's small origin storage quota. The version-two storage
contract therefore needs a predictable, validated representation that remains
compatible with the existing localStorage envelope and recovery behavior.

## Decision

Accept decoded PNG, JPEG, and WebP source files no larger than 2 MB at a
browser-only boundary. Decode the source locally, preserve its aspect ratio and
transparency, never crop or upscale it, and fit its longest side within 128px.
Render the result to a transparent canvas, encode it as PNG, and persist only a
`data:image/png;base64,` URL whose encoded payload is no larger than 100 KB.

Abort superseded or canceled processing and release decoded image resources in
every post-decode outcome. Validate the normalized data URL again at the domain
and strict version-two storage boundaries. Keep existing recovery semantics: an
invalid save or quota failure must not overwrite the prior raw stored value.

## Alternatives Considered

- **Store raw source files:** Rejected because source dimensions and encoding
  sizes are unbounded relative to the compact UI and localStorage quota.
- **Upload images to network storage:** Rejected because it conflicts with the
  local-only privacy model and would require identity, authorization, retention,
  deletion, availability, and operational policies.
- **Use remote image URLs:** Rejected because they leak requests to third
  parties, can stop resolving, and make offline rendering unreliable.
- **Store image blobs in IndexedDB now:** Rejected because one bounded icon per
  goal fits the current simple envelope and does not yet justify a second
  persistence system, migration path, or transactional coordination layer.
- **Use SVG or preserve each source format:** Rejected because SVG introduces an
  active-content sanitization surface and multiple persisted formats complicate
  strict validation and rendering guarantees.

## Consequences

Artwork remains on the device and requires no runtime network dependency. The
stored representation is deterministic, large enough to render at its full
128px normalized size inside the prominent goal-artwork stage, and strictly
validated. PNG preserves transparency but can encode photographic sources less
efficiently than JPEG or WebP, so some detailed images may be rejected after
normalization even when the source is below 2 MB.

Base64 data URLs add storage overhead, and localStorage quotas vary by browser,
profile, and device. Saving many illustrated goals can therefore exhaust quota.
The application surfaces that failure and retains the in-memory session state,
but it cannot guarantee persistence or recover data after site-data removal.

## Reconsideration Threshold

Reconsider IndexedDB when product scope requires more than one image per goal,
images larger than the current 128px or 100 KB bounds, dozens of illustrated
goals approaching common localStorage quotas, binary import or export, image
querying, or atomic updates spanning large binary and structured records. Any
move must include migration, quota, failure-recovery, and cross-store
consistency tests before replacing the version-two contract.

## Validation

Unit tests cover source type and size validation, decode and encoding failures,
dimension fitting, stale selections, payload limits, and resource cleanup.
Component tests cover accessible errors, processing state, previews, create and
edit semantics, cancellation, and stable presentation. Playwright covers
in-memory generated source files, normalized PNG dimensions, reload persistence,
replacement, removal, invalid-file preservation, keyboard workflows, and
desktop, mobile, and reduced-motion rendering.
