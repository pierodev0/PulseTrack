# Reloj ⏱️

**Reloj** es una aplicación de escritorio para Windows que mide cuánto tiempo pasas usando un programa específico.

Elegís un programa (ej: Photoshop, VS Code, Excel) y la app cuenta el tiempo mientras esa ventana esté activa. Si cambiás a otra ventana o la minimizás, el contador se pausa solo.

---

## Cómo funciona

1. Abrís Reloj y ves una lista de las ventanas abiertas en tu PC.
2. Elegís una app de la lista y apretás **Iniciar**.
3. El tiempo empieza a correr **solo mientras esa ventana esté en primer plano**.
4. Si te cambiás a otra cosa, el contador se pausa automáticamente.
5. Cuando apretás **Detener**, el tiempo se guarda automáticamente en un historial.
6. Podés editar o borrar cualquier registro del historial.
7. También podés activar el modo **PiP** (Picture-in-Picture) para tener una ventanita siempre visible con el tiempo.

---

## Requisitos

- **Windows** 10 u 11
- **Node.js** 20+
- **pnpm** (seguí estos pasos para instalarlo)

### Instalar pnpm

```bash
npm install -g pnpm
```

Si no tenés Node.js, descargalo desde [nodejs.org](https://nodejs.org/).

---

## Instalación

Abrí una terminal en la carpeta del proyecto y ejecutá:

```bash
pnpm install
```

Esto descarga todas las dependencias necesarias.

---

## Desarrollo (modo edición)

Para probar la app mientras la desarrollás:

```bash
pnpm dev
```

Se va a abrir una ventana de la app y cualquier cambio que hagas en el código se refleja automáticamente.

> También se abre el DevTools de Electron (F12) — útil para ver errores o probar cosas.

---

## Compilar (versión instalable)

Para generar el instalador `.exe`:

```bash
pnpm run build:win
```

El instalador va a quedar en la carpeta `dist/`.

---

## Tecnologías usadas

| Tecnología | Para qué |
|---|---|
| [Electron](https://www.electronjs.org/) | Crea la ventana de la app de escritorio |
| [Svelte 5](https://svelte.dev/) | Interfaz visual (botones, lista, temporizador) |
| [TailwindCSS v4](https://tailwindcss.com/) | Diseño y estilos |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | Base de datos local para guardar el historial |
| [get-windows](https://github.com/sindresorhus/get-windows) | Detecta qué ventana está activa y lista las abiertas |
| [electron-vite](https://electron-vite.org/) | Arma y compila todo junto |

---

## Estructura del proyecto

```
src/
├── main/              # Proceso principal de Electron
│   ├── index.ts       # Punto de entrada
│   ├── database.ts    # Guarda y lee el historial en SQLite
│   ├── timer.ts       # Lógica del contador
│   ├── window-detector.ts  # Detecta ventanas activas
│   ├── tray.ts        # Icono en la bandeja del sistema
│   ├── pip.ts         # Modo Picture-in-Picture
│   └── ipc.ts         # Conexión entre frontend y backend
├── preload/           # Puente entre la ventana y Electron
│   └── index.ts
└── renderer/          # Interfaz visual (lo que ves)
    └── src/
        ├── App.svelte
        ├── AppList.svelte
        ├── TimerDisplay.svelte
        ├── History.svelte
        ├── EditModal.svelte
        └── timerStore.svelte.ts
```

---

## Comandos útiles

```bash
pnpm dev              # Modo desarrollo
pnpm run build:win    # Compilar instalador para Windows
pnpm run build:mac    # Compilar para macOS
pnpm run typecheck    # Verificar errores de tipos
pnpm run lint         # Verificar estilo de código
```
