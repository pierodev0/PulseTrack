export type PipStyle = 'transparent' | 'dark' | 'light' | 'green' | 'blue' | 'amber' | 'custom'

export interface PipStyleConfig {
  bg: string
  text: string
  border: string
  previewBg: string
  previewText: string
  label: string
}

export interface CustomColors {
  bg: string
  text: string
  border: string
}

export const PIP_STYLES: Record<Exclude<PipStyle, 'custom'>, PipStyleConfig> = {
  transparent: {
    bg: 'bg-transparent',
    text: 'text-white',
    border: 'border-transparent',
    previewBg: 'bg-zinc-800',
    previewText: 'text-white',
    label: 'Transparente'
  },
  dark: {
    bg: 'bg-zinc-900/90',
    text: 'text-white',
    border: 'border-zinc-700/50',
    previewBg: 'bg-zinc-900',
    previewText: 'text-white',
    label: 'Oscuro'
  },
  light: {
    bg: 'bg-white/90 backdrop-blur-sm',
    text: 'text-zinc-900',
    border: 'border-zinc-200/50',
    previewBg: 'bg-white',
    previewText: 'text-zinc-900',
    label: 'Claro'
  },
  green: {
    bg: 'bg-emerald-900/85',
    text: 'text-white',
    border: 'border-emerald-700/50',
    previewBg: 'bg-emerald-900',
    previewText: 'text-white',
    label: 'Verde'
  },
  blue: {
    bg: 'bg-blue-900/85',
    text: 'text-white',
    border: 'border-blue-700/50',
    previewBg: 'bg-blue-900',
    previewText: 'text-white',
    label: 'Azul'
  },
  amber: {
    bg: 'bg-amber-900/85',
    text: 'text-white',
    border: 'border-amber-700/50',
    previewBg: 'bg-amber-900',
    previewText: 'text-white',
    label: 'Ámbar'
  }
}

export const PIP_STYLE_LIST: PipStyle[] = [
  'transparent', 'dark', 'light', 'green', 'blue', 'amber', 'custom'
]

export interface TimerStore {
  elapsed: number
  running: boolean
  selectedApp: string
  history: unknown[]
  stats: unknown[]
  pipActive: boolean
  pipStyle: PipStyle
  customColors: CustomColors
}

let state = $state<TimerStore>({
  elapsed: 0,
  running: false,
  selectedApp: '',
  history: [],
  stats: [],
  pipActive: false,
  pipStyle: 'transparent',
  customColors: { bg: '#1e1e2e', text: '#ffffff', border: '#334155' }
})

export function getState(): TimerStore {
  return state
}

export function setElapsed(elapsed: number): void {
  state.elapsed = elapsed
}

export function setRunning(running: boolean): void {
  state.running = running
}

export function setSelectedApp(app: string): void {
  state.selectedApp = app
}

export function setHistory(history: unknown[]): void {
  state.history = history
}

export function setStats(stats: unknown[]): void {
  state.stats = stats
}

export function setPipActive(active: boolean): void {
  state.pipActive = active
}

export function setPipStyle(style: PipStyle): void {
  state.pipStyle = style
}

export function setCustomColors(colors: CustomColors): void {
  state.customColors = colors
}

export function resetTimer(): void {
  state.elapsed = 0
  state.running = false
  state.selectedApp = ''
}

export function getEffectivePipBg(): string {
  if (state.pipStyle === 'custom') return state.customColors.bg
  return '' // resolved via Tailwind classes
}

export function getEffectivePipText(): string {
  if (state.pipStyle === 'custom') return state.customColors.text
  return ''
}

export function getEffectivePipBorder(): string {
  if (state.pipStyle === 'custom') return state.customColors.border
  return ''
}
