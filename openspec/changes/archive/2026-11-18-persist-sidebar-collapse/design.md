## Context

The installed SidebarProvider already writes a seven-day `sidebar_state` cookie when desktop state changes. The root layout did not read it and the shell always used the expanded default. See proposal.md for the user-visible problem.

## Decisions

- Read the cookie using the pinned Next.js async `cookies()` API in the root Server Component. Pass the initial boolean through WorkspaceProviders to the existing SidebarProvider. This preserves the installed primitive and avoids a client effect that visibly changes width after hydration.
- Interpret only `false` as collapsed; true, missing and malformed values use the expanded default. Keep the primitive's independent narrow-screen state and seven-day cookie lifetime.
- Accept request rendering for shell routes because initial HTML depends on the request cookie. Client navigation continues to preserve the mounted shell. No application database or provider request is needed to restore the layout.

## Verification

Exercise cookie writes through the actual shell toggle and render the real root/provider/shell tree on fresh server renders for collapsed, expanded, missing and invalid preferences. Validate types and route/build output in an isolated copy. Browser appearance is not exercised.
