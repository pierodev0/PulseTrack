import { getActiveApp } from './window-detector'
import {
  createSession,
  createBlock,
  closeBlock,
  closeSession,
  renameBlock as dbRenameBlock
} from './database'

export interface TimerTick {
  elapsed: number
  running: boolean
  lapCount: number
  laps: Array<{ number: number; label: string; duration: number }>
}

export interface TimerState {
  running: boolean
  selectedApp: string
  elapsed: number
}

type TickCallback = (tick: TimerTick) => void

const POLL_INTERVAL = 500

let selectedAppName: string | null = null
let elapsed = 0
let running = false
let intervalId: ReturnType<typeof setInterval> | null = null
let tickCallbacks: TickCallback[] = []
let sessionId: number | null = null
let blockId: number | null = null
let lapCount = 0
let lastLapStart = 0
let laps: Array<{ blockId: number; label: string; duration: number }> = []

function getLapsInfo(): Array<{ number: number; label: string; duration: number }> {
  return laps.map((l, i) => ({
    number: i + 1,
    label: l.label,
    duration: l.duration
  }))
}

function emitTick(): void {
  const lapInfo = getLapsInfo()
  for (const cb of tickCallbacks) {
    cb({ elapsed, running, lapCount, laps: lapInfo })
  }
}

function updateLastLapDuration(): void {
  if (laps.length > 0) {
    const previousLapsSum = laps.slice(0, -1).reduce((sum, l) => sum + l.duration, 0)
    laps[laps.length - 1].duration = elapsed - previousLapsSum
  }
}

async function tick(): Promise<void> {
  if (!running || !selectedAppName) return

  const active = await getActiveApp()
  if (active && active.app === selectedAppName) {
    elapsed += POLL_INTERVAL / 1000
    updateLastLapDuration()
    emitTick()
  }
}

export function startTimer(appName: string): void {
  selectedAppName = appName
  elapsed = 0
  running = true
  lapCount = 0
  laps = []

  const now = new Date().toISOString()
  const session = createSession(appName, now)
  sessionId = session.id

  const block = createBlock(sessionId, appName, 'Lap 1', null, 'manual', now)
  blockId = block.id
  laps.push({ blockId: block.id, label: 'Lap 1', duration: 0 })
  lastLapStart = 0

  if (intervalId) clearInterval(intervalId)
  intervalId = setInterval(tick, POLL_INTERVAL)
  emitTick()
}

export function stopTimer(): number {
  const now = new Date().toISOString()

  if (running && sessionId && blockId) {
    updateLastLapDuration()
    closeBlock(blockId, now, elapsed - lastLapStart)
    closeSession(sessionId, now, elapsed)
  }

  running = false
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  const duration = elapsed
  selectedAppName = null
  elapsed = 0
  sessionId = null
  blockId = null
  lapCount = 0
  lastLapStart = 0
  laps = []
  emitTick()
  return duration
}

export function lapTimer(): void {
  if (!running || !sessionId || !blockId) return

  const now = new Date().toISOString()

  updateLastLapDuration()
  closeBlock(blockId, now, elapsed - lastLapStart)

  lapCount++

  const block = createBlock(sessionId, selectedAppName!, `Lap ${lapCount + 1}`, null, 'manual', now)
  blockId = block.id
  laps.push({ blockId: block.id, label: `Lap ${lapCount + 1}`, duration: 0 })
  lastLapStart = elapsed

  emitTick()
}

export function renameLap(lapIndex: number, newLabel: string): void {
  if (lapIndex >= 0 && lapIndex < laps.length) {
    const lap = laps[lapIndex]
    dbRenameBlock(lap.blockId, newLabel)
    lap.label = newLabel
    emitTick()
  }
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
