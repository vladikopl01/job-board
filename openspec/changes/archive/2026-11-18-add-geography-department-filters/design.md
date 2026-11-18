## Context

Postings retain multiple original locations with optional source country/address data, plus nullable department and team labels. Collections already share validated URL-backed text/select conditions and SQL filtering before pagination. The user requests implementation, including department narrowing, after closing the UI documentation.

## Goals / Non-Goals

**Goals:** Ordinary Country, Region and Department conditions across all job collections; conservative deterministic matching; immediate support for existing and historical records; unchanged source data and eligibility text.

**Non-Goals:** City geocoding, inferring citizenship/work authorization, title-based or AI classification, excluding postings at ingestion, application tracking, compensation filters, or provider requests during filtering.

## Decisions

- Keep a browser-safe country catalog based on [UN M49](https://unstats.un.org/unsd/methodology/m49/overview/) and English names/territory supplements from [Unicode CLDR](https://github.com/unicode-org/cldr-json/tree/main/cldr-json). Store a fixed snapshot so labels do not vary with browser ICU versions. Broad groups cover continents, Americas, UN Latin America/Caribbean and explicit source groups such as EMEA/APAC/Worldwide. North America includes Central America and the Caribbean. APAC/EMEA match explicit labels only; no country expansion is implied. Snapshot attribution and group definitions are retained in `packages/job-boards/NOTICE.md`.
- Trust recognized structured source countries first. Otherwise match complete explicit country/location segments conservatively; do not geocode cities, interpret ambiguous two-letter location abbreviations or treat negative eligibility phrases as positive locations. EU/Europe contributes Europe without inventing countries. Compound source regions do not expand into countries. Original locations and addresses remain unchanged.
- Normalize explicit provider department labels, falling back to the provider team only when department is missing. Support broad source-backed groups including Engineering and Marketing, with Other for unrecognized supplied labels and Unknown for missing labels. Combined explicit labels can match multiple groups. Do not inspect titles/descriptions.
- Register deterministic SQLite projection functions on each connection and use parameterized JSON membership predicates in the existing Drizzle query. This avoids migrations, provider refreshes and full-result client filtering, while applying conditions before count/page calculations to retained history too.
- Add hidden-by-default Country, Region and Department columns to provide the same field metadata and searchable value options in every layout. Add retained department/team to the list contract. Reuse existing cache/query keys, selection resets and URL state.
- Empty/Unknown means no recognized values for that dimension. Not-equal excludes any selected membership. Keep existing AND/OR, paused rules, read/availability/board scope and stable sort semantics.

## Risks / Trade-offs

Conservative normalization intentionally leaves city-only or ambiguous source labels Unknown. Broad geographical matching is a browsing aid, not proof of eligibility; the original restrictions remain authoritative. Fixed department aliases do not replace a future taxonomy/classifier. SQLite projections scan candidate source values, as existing contains searches do; materialize/index only if measured workloads require it.

Verification will cover country/region ambiguity and exclusions, department aliases/fallback/Unknown, unchanged source/read identities, SQL totals/pagination/history/joins, URL restoration and real filter interactions. Full checks and builds must use temporary data and isolated build output. Browser appearance and cross-platform execution will remain unverified unless separately exercised.
