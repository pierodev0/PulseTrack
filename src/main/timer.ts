import { getActiveApp } from './window-detector'

export interface TimerState {
  running: boolean
  selectedApp: string
  elapsed: number
}

type TickCallback = (elapsed: number, running: boolean) => void

const POLL_INTERVAL = 500

let selectedAppName: string | null = null
let elapsed = 0
let running = false
let intervalId: ReturnType<typeof setInterval> | null = null
let tickCallbacks: TickCallback[] = []

function emitTick(): void {
  for (const cb of tickCallbacks) {
    cb(elapsed, running)
  }
}

async function tick(): Promise<void> {
  if (!running || !selectedAppName) return

  const active = await getActiveApp()
  if (active && active.app === selectedAppName) {
    elapsed += POLL_INTERVAL / 1000
    emitTick()
  }
}

export function startTimer(appName: string): void {
  selectedAppName = appName
  elapsed = 0
  running = true
  if (intervalId) clearInterval(intervalId)
  intervalId = setInterval(tick, POLL_INTERVAL)
  emitTick()
}

export function stopTimer(): number {
  running = false
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  const duration = elapsed
  selectedAppName = null
  elapsed = 0
  emitTick()
  return duration
}

export function getTimerState(): TimerState {
  return {
    running,
    selectedApp: selectedAppName ?? '',
    elapsed
  }
}

export function pauseTimer(): void {
  running = false
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  emitTick()
}

export function resumeTimer(): void {
  if (!selectedAppName) return
  running = true
  if (intervalId) clearInterval(intervalId)
  intervalId = setInterval(tick, POLL_INTERVAL)
  emitTick()
}

export function onTick(callback: TickCallback): () => void {
  tickCallbacks.push(callback)
  return () => {
    tickCallbacks = tickCallbacks.filter((cb) => cb !== callback)
  }
}
