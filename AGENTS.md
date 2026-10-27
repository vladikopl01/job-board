# UI components

- Install and reinstall shadcn/ui primitives through the shadcn CLI, using the existing `apps/web/components.json` Base UI / `base-nova` configuration.
- Run `pnpm dlx shadcn@latest add <component> -c apps/web` from the repository root. Do not write replacement shadcn primitives by hand or copy their source from documentation or GitHub.
- Before updating existing components, review the CLI's `--dry-run` and `--diff` output. Review generated files, dependencies, and stylesheet changes afterward, then apply the repository formatter.
- Keep the official installation's stylesheet imports and theme tokens in sync with the generated components. Include the animation utilities and shadcn's shared Tailwind styles.
- Application-specific components should compose the installed primitives. Keep product behavior outside `src/components/ui` where possible.
