# Inglés With Me

A monorepo managed with [pnpm workspaces](https://pnpm.io/workspaces).

## Layout

| Path | What it is |
| --- | --- |
| `apps/web` | The web app ([TanStack Start](https://tanstack.com/start), React, Tailwind) |

New services go in `apps/<name>`; they're picked up by the workspace automatically.

## Getting started

```bash
pnpm install
pnpm dev        # runs the web app on http://localhost:3000
```

Other root scripts:

- `pnpm build`: build the web app
- `pnpm check`: run lint/format checks in every package

To run a command in one package: `pnpm --filter web <script>`.
