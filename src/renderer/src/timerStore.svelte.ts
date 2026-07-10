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

export interface PipFontSize {
  time: number
  label: number
  appName: number
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
  'transparent',
  'dark',
  'light',
  'green',
  'blue',
  'amber',
  'custom'
]

export interface ActiveSession {
  appName: string
  sessionId: number
  sessionDuration: number
  blockId: number
  blockLabel: string
  blockSource: 'auto' | 'manual'
  blockDuration: number
}

export interface SessionListItem {
  app_name: string
  id: number
  start_time: string
  end_time: string | null
  duration_seconds: number
  status: string
  blocks: Array<{
    id: number
    label: string
    source: 'auto' | 'manual'
    duration_seconds: number
    start_time: string
    end_time: string | null
  }>
}

export interface SessionState {
  active: ActiveSession | null
  recentSessions: SessionListItem[]
  loading: boolean
}

export interface HeartbeatState {
  active: boolean
  currentApp: string | null
  currentTitle: string | null
  lastTimestamp: string | null
  appChanged: boolean
  titleChanged: boolean
}

export interface LapInfo {
  number: number
  label: string
  duration: number
  startedAt: string
}

export interface TimerStore {
  elapsed: number
  running: boolean
  selectedApp: string
  history: unknown[]
  stats: unknown[]
  pipActive: boolean
  pipStyle: PipStyle
  customColors: CustomColors
  pipFontSize: PipFontSize
  heartbeat: HeartbeatState
  session: SessionState
  lapCount: number
  laps: LapInfo[]
}

let state = $state<TimerStore>({
  elapsed: 0,
  running: false,
  selectedApp: '',
  history: [],
  stats: [],
  pipActive: false,
  pipStyle: 'transparent',
  customColors: { bg: '#1e1e2e', text: '#ffffff', border: '#334155' },
  pipFontSize: { time: 24, label: 11, appName: 9 },
  heartbeat: {
    active: false,
    currentApp: null,
    currentTitle: null,
    lastTimestamp: null,
    appChanged: false,
    titleChanged: false
  },
  session: {
    active: null,
    recentSessions: [],
    loading: false
  },
  lapCount: 0,
  laps: []
})

export function setHeartbeatActive(active: boolean): void {
  state.heartbeat.active = active
}

export function setHeartbeatTick(data: {
  app_name: string
  window_title: string | null
  timestamp: string
  app_changed: boolean
  title_changed: boolean
}): void {
  state.heartbeat.currentApp = data.app_name
  state.heartbeat.currentTitle = data.window_title
  state.heartbeat.lastTimestamp = data.timestamp
  state.heartbeat.appChanged = data.app_changed
  state.heartbeat.titleChanged = data.title_changed
}

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

export function setPipFontSize(size: PipFontSize): void {
  state.pipFontSize = size
}

export function setLapCount(n: number): void {
  state.lapCount = n
}

export function setLaps(laps: LapInfo[]): void {
  state.laps = laps
}

export function setTimerTick(data: {
  elapsed: number
  running: boolean
  lapCount: number
  laps: LapInfo[]
}): void {
  state.elapsed = data.elapsed
  state.running = data.running
  state.lapCount = data.lapCount
  state.laps = data.laps
}

export function setSessionTick(data: ActiveSession): void {
  state.session.active = { ...data }
}

export function setRecentSessions(sessions: SessionListItem[]): void {
  state.session.recentSessions = sessions
}

export function setSessionLoading(loading: boolean): void {
  state.session.loading = loading
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
