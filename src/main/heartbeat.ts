import { getActiveApp } from './window-detector'
import { saveHeartbeat } from './database'

export interface HeartbeatTick {
  app_name: string
  window_title: string | null
  timestamp: string
  duration_ms: number
  app_changed: boolean
  title_changed: boolean
}

type HeartbeatCallback = (data: HeartbeatTick) => void

const DEFAULT_POLL_MS = 5000

let pollInterval = DEFAULT_POLL_MS
let running = false
let intervalId: ReturnType<typeof setInterval> | null = null
let lastApp: string | null = null
let lastTitle: string | null = null
let hasData = false
let callbacks: HeartbeatCallback[] = []

async function tick(): Promise<void> {
  const active = await getActiveApp()
  if (!active) return

  const appChanged = hasData && active.app !== lastApp
  const titleChanged = hasData && active.title !== lastTitle

  const hb = saveHeartbeat(active.app, active.title, pollInterval)

  lastApp = active.app
  lastTitle = active.title
  hasData = true

  const tickData: HeartbeatTick = {
    app_name: hb.app_name,
    window_title: hb.window_title,
    timestamp: hb.timestamp,
    duration_ms: hb.duration_ms,
    app_changed: appChanged,
    title_changed: titleChanged
  }

  for (const cb of callbacks) {
    cb(tickData)
  }
}

export function startHeartbeatWatcher(intervalMs?: number): void {
  if (running) return
  pollInterval = intervalMs ?? DEFAULT_POLL_MS
  running = true
  intervalId = setInterval(tick, pollInterval)
  tick()
}

export function stopHeartbeatWatcher(): void {
  running = false
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

export function isHeartbeatRunning(): boolean {
  return running
}

export function onHeartbeat(callback: HeartbeatCallback): () => void {
  callbacks.push(callback)
  return () => {
    callbacks = callbacks.filter((cb) => cb !== callback)
  }
}

export function getLastWindow(): { app: string | null; title: string | null } {
  return { app: lastApp, title: lastTitle }
}

export function resetHeartbeatWatcher(): void {
  lastApp = null
  lastTitle = null
  hasData = false
  callbacks = []
}
