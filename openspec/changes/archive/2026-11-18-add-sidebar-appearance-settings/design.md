## Sidebar composition

Place the Settings trigger last in SidebarFooter, using the same sidebar button geometry as navigation. Only the Local workspace caption hides when collapsed; Settings retains its icon, accessible name and tooltip. The popover opens above the trigger and uses the installed positioning and focus behavior. Its Theme field contains one single-selection, outlined ToggleGroup with labeled Sun, Moon and Monitor icons for Light, Dark and System.

## Appearance state

An application ThemeProvider wraps the root route content, including fixture routes. next-themes owns the root light/dark class, native color scheme, pre-hydration initialization and preference persistence under `job-board:theme:v1`. System is the default. Explicit Light/Dark choices ignore subsequent OS changes; selecting System resumes them. Re-selecting the active toggle keeps it selected. Theme changes suppress color transitions. Root HTML suppresses the expected theme attribute hydration difference.

## Preset colors

Reuse preset b1D0dv72's existing base-mira neutral tokens without changing either theme block. The popup uses popover/foreground; toggles use the installed muted selected/hover surface; the sidebar trigger uses sidebar/foreground and sidebar accent/foreground. No literal grays or new semantic colors are added.

No actionable color findings in the inspected text pairs. Measured from the declared zero-chroma OKLCH tokens:

| Pair | Light contrast | Dark contrast |
| --- | --- | --- |
| Settings title and unselected choices | 19.79:1 | 17.16:1 |
| Selected and hovered theme choices | 18.15:1 | 14.48:1 |
| Sidebar Settings | 18.96:1 | 17.16:1 |
| Hovered sidebar Settings | 16.42:1 | 14.48:1 |
| Existing Local workspace caption | 4.53:1 | 6.91:1 |

All declared text pairs exceed WCAG AA's 4.5:1 threshold. The existing preset and primitives remain unchanged. Not verified: browser-computed colors, rendered focus/hover, mobile positioning or theme flash on first paint. No browser or daily-driver preview was used.

Approve for the inspected token declarations and measured text contrast.
