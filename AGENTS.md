# Reloj — Electron + Svelte 5 activity timer

## Stack

- **Electron** ^39 (main + preload + renderer processes)
- **Svelte** 5 (runes, snippets, `$state`, `$derived`)
- **Vite** via `electron-vite` (one bundle per process)
- **TypeScript** strict (separate tsconfigs for node/web)
- **Tailwind CSS** 4
- **pnpm** (package manager)
- **better-sqlite3** (persistence, main process only)
- **get-windows** (active window detection)
- **Vitest** (unit tests)
- **ESLint** + **Prettier** (flat config, `@electron-toolkit` presets)

## Setup & dev

```sh
pnpm install
pnpm dev            # dev server with hot reload
pnpm build          # typecheck + production build
pnpm build:win      # build + package for Windows
pnpm build:mac      # build + package for macOS
pnpm build:linux    # build + package for Linux
pnpm build:unpack   # build + unpacked dir (debug)
```

## Quality gates

```sh
pnpm lint           # ESLint (all files including .svelte)
pnpm typecheck      # tsc (node) + svelte-check (renderer)
pnpm test           # vitest run
pnpm format         # prettier --write
```

## Architecture rules

- **Main process only**: better-sqlite3, get-windows (native modules). Renderer never touches them directly.
- **IPC boundary**: All renderer-to-main calls go through `ipcRenderer.invoke` → `ipcMain.handle`. No `@electron/remote`, no `nodeIntegration`.
- **Preload**: `contextBridge.exposeInMainWorld('electronAPI', api)` — sandboxed preload, no `nodeIntegration`.
- **Sandbox**: `sandbox: true` on all BrowserWindows.
- **PiP**: Single window reuse (no second BrowserWindow). `frame: false`, resize + alwaysOnTop toggle via IPC `mode:changed`.
- **Security**: `Menu.setApplicationMenu(null)` before ready. No polyfills. No network requests at startup.

## Code conventions

- **TypeScript**: strict mode, prefer `interface` over `type` for objects
- **Svelte 5**: `$state`, `$derived`, `$props()` — no legacy `let:` or `export let`
- **Imports**: named imports, no default exports (except `mount` from svelte)
- **Formatting**: single quotes, no semicolons (Prettier)
- **File naming**: kebab-case for `.ts` files, PascalCase for `.svelte` components
- **CSS**: Tailwind utility classes, no custom CSS files

## Testing

- Vitest with `globals: true`, `environment: 'node'`
- `electron` module is mocked globally in `src/test-setup.ts` (app.getPath returns temp dir)
- Tests live in `__tests__/` next to the module they test
- Run full suite with `pnpm test` before every commit

## Commit & PR conventions

- Format: `type(scope): message` (conventional commits)
- Types: `feat`, `fix`, `perf`, `refactor`, `chore`, `docs`, `test`
- Keep changes focused: one logical change per commit
- Always run `pnpm lint && pnpm test` before committing
