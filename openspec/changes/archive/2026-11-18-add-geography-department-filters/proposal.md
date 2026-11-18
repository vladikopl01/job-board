## Why

Location text alone makes it difficult to narrow retained jobs by country or broad region. Users also need consistent department choices such as Engineering and Marketing across supported providers.

## What Changes

- Add Country, Region and Department as ordinary searchable property filters in Inbox, Jobs and board-scoped collections.
- Derive conservative geography from retained source countries and explicit location labels; preserve the original text, addresses and eligibility restrictions.
- Group explicit source department/team labels deterministically, with Other and Unknown states and no inference from job titles or descriptions.
- Apply these conditions before totals and pagination, including existing historical records, without provider refreshes, AI or a data migration.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-discovery`: Source-backed geography and department filtering and consistent URL/query behavior.

## Impact

Shared browser-safe normalization in `packages/job-boards`, deterministic SQLite functions in `packages/db`, Jobs query validation and SQL predicates, list contracts and column/filter metadata, focused fixtures and documentation. No external service or new runtime dependency is required.
