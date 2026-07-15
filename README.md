# Reloj ⏱️

Aplicación de escritorio para Windows que mide cuánto tiempo pasás usando programas específicos. Elegís una app y Reloj cuenta el tiempo mientras esa ventana esté activa. Si cambiás de ventana o la minimizás, el contador se pausa solo.

---

## Cómo funciona

1. **Modo Temporizador**: elegís una app de la lista, apretás Iniciar y el tiempo corre solo mientras esté en primer plano. Podés marcar laps manuales con el botón **Lap**.
2. **Modo Heartbeat** (Auto): activás Auto y Reloj monitorea en segundo plano cada ~5s. Detecta cambios de app y título automáticamente, creando bloques por sesión.
3. **Dashboard**: ves todas las sesiones cerradas, podés expandir cada una para ver sus bloques (auto/manual), editar nombres directamente, y renombrar sesiones.
4. **Estadísticas**: gráfico de barras semanal con el tiempo por app (heartbeats), incluyendo la sesión activa en tiempo real.
5. **PiP**: ventana flotante siempre visible con el cronómetro. Configurable: 7 estilos visuales (incluyendo personalizado con selector de color), 3 tamaños de texto.
6. **Configuración**: estilo PiP, colores personalizados, tamaño de texto, y reglas de limpieza de títulos por app (regex).

---

## Requisitos

- **Windows** 10 u 11
- **Node.js** 20+
- **pnpm**

```bash
npm install -g pnpm
```

---

## Instalación

```bash
pnpm install
```

---

## Desarrollo

```bash
pnpm dev
```

Se abre la ventana de la app con hot reload. DevTools (F12) disponible.

---

## Compilar

```bash
pnpm build:win       # Instalador .exe
pnpm build:portable  # Ejecutable portable
pnpm build:unpack    # Versión sin empaquetar (debug)
pnpm build:mac       # macOS
pnpm build:linux     # Linux
```

El instalador queda en `dist/`.

---

## Calidad

```bash
pnpm lint           # ESLint
pnpm typecheck      # TypeScript + Svelte check
pnpm test           # Vitest (unit tests)
pnpm format         # Prettier
```

---

## Tecnologías

| Tecnología | Uso |
|---|---|
| [Electron](https://www.electronjs.org/) | Ventana de escritorio (sandboxed, sin nodeIntegration) |
| [Svelte 5](https://svelte.dev/) | UI reactiva con runes (`$state`, `$derived`) |
| [Tailwind CSS v4](https://tailwindcss.com/) | Estilos |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | Base de datos local (main process) |
| [get-windows](https://github.com/sindresorhus/get-windows) | Detección de ventana activa |
| [electron-vite](https://electron-vite.org/) | Build tooling |
| [Lucide](https://lucide.dev/) | Iconos (Svelte) |
| [Vitest](https://vitest.dev/) | Tests unitarios |

---

## Arquitectura

```
src/
├── main/                  # Proceso principal de Electron
│   ├── index.ts           # Punto de entrada, creación de ventana
│   ├── database.ts        # SQLite: sesiones, bloques, heartbeats
│   ├── timer.ts           # Lógica del contador manual
│   ├── session-manager.ts # Gestión de sesiones con bloques (auto/manual)
│   ├── heartbeat.ts       # Monitoreo continuo de ventana activa
│   ├── window-detector.ts # Detección de ventanas abiertas/activa
│   ├── title-cleaner.ts   # Limpieza de títulos por reglas regex
│   ├── settings.ts        # Configuración persistente (JSON)
│   ├── pip.ts             # Ventana Picture-in-Picture
│   ├── tray.ts            # Icono en bandeja del sistema
│   └── ipc.ts             # Manejadores IPC (puente main ↔ renderer)
├── preload/
│   └── index.ts           # contextBridge expuesto como window.electronAPI
└── renderer/src/          # UI (Svelte 5 con runes)
    ├── App.svelte         # Layout principal, tabs, modo PiP
    ├── AppList.svelte     # Lista de ventanas disponibles
    ├── TimerDisplay.svelte # Cronómetro
    ├── Dashboard.svelte   # Sesiones, bloques, edición inline
    ├── Analytics.svelte   # Gráfico semanal por app
    ├── Settings.svelte    # PiP style, colores, tamaño texto, reglas título
    ├── EditModal.svelte   # Modal de edición de historial
    ├── History.svelte     # Historial de sesiones
    ├── LapList.svelte     # Lista de laps manuales
    ├── timerStore.svelte.ts # Estado global ($state runes)
    └── main.ts            # Punto de entrada renderer
```

### IPC

Todo el cruce de procesos va por `ipcRenderer.invoke` / `ipcMain.handle`. Preload expone `window.electronAPI` con `contextBridge` — sin `nodeIntegration`, sin `@electron/remote`, sandbox activo.

---

## Convenciones

- TypeScript strict, interfaces sobre types para objetos
- Svelte 5 runes: `$state`, `$derived`, `$props()` — sin `export let`
- Nombres: kebab-case para `.ts`, PascalCase para `.svelte`
- Single quotes, sin semicolons (Prettier)
- Conventional commits: `tipo(scope): mensaje`
- Tests con Vitest en `__tests__/` junto al módulo
