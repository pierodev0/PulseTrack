import { onHeartbeat, type HeartbeatTick } from './heartbeat'
import type { CleanTitleFn } from './title-cleaner'
import {
  createSession,
  closeSession,
  updateSessionDuration,
  reopenSession,
  createBlock,
  closeBlock,
  updateBlockDuration,
  getActiveSessions
} from './database'

// --- Public types ---

export interface AppSession {
  id: number
  app_name: string
  start_time: string
  end_time: string | null
  duration_seconds: number
  status: string
}

export interface TimeBlock {
  id: number
  session_id: number
  app_name: string
  label: string
  raw_title: string | null
  source: 'auto' | 'manual'
  start_time: string
  end_time: string | null
  duration_seconds: number
  status: string
}

export interface SessionTick {
  appName: string
  sessionId: number
  sessionDuration: number
  blockId: number
  blockLabel: string
  blockSource: 'auto' | 'manual'
  blockDuration: number
}

export type SessionTickCallback = (data: SessionTick) => void

// --- Internal state (module singleton, matching heartbeat.ts / timer.ts) ---

interface ActiveSessionState {
  session: AppSession
  currentBlock: TimeBlock
  blocks: TimeBlock[]
  lastTitle: string | null
  lastHeartbeatTime: number
  lastTitleChangeTime: number
  closedAt: number | null // set when session transitions to recently-closed
}

interface RecentlyClosedEntry {
  session: AppSession
  blockId: number
  blockStartTime: string
  closedAt: number
}

const IDLE_TIMEOUT_MS = 300_000 // 5 minutes
const MERGE_WINDOW_MS = 30_000 // 30 seconds
const DEBOUNCE_MS = 3_000 // 3 seconds for title changes
const FLUSH_INTERVAL_MS = 60_000 // 60 seconds

const activeSessions: Map<string, ActiveSessionState> = new Map()
const recentlyClosed: Map<string, RecentlyClosedEntry> = new Map()
let flushIntervalId: ReturnType<typeof setInterval> | null = null
let cleanTitleFn: CleanTitleFn = () => ''
let tickCallbacks: SessionTickCallback[] = []
let unsubscribeHeartbeat: (() => void) | null = null

// --- Normalization ---

function normalizeAppName(appName: string): string {
  return appName.toLowerCase().replace(/\.(exe|app)$/i, '')
}

// --- Internal helpers ---

function emitTick(data: SessionTick): void {
  for (const cb of tickCallbacks) {
    cb(data)
  }
}

function closeActiveSession(entry: ActiveSessionState, now: number, endTime: string): void {
  const elapsedSeconds = (now - new Date(entry.session.start_time).getTime()) / 1000
  const blockElapsedSeconds = (now - new Date(entry.currentBlock.start_time).getTime()) / 1000

  closeSession(entry.session.id, endTime, Math.max(0, elapsedSeconds))
  closeBlock(entry.currentBlock.id, endTime, Math.max(0, blockElapsedSeconds))
}

function closeRecentlyClosedExpired(now: number): void {
  for (const [appName, entry] of recentlyClosed) {
    if (now - entry.closedAt > MERGE_WINDOW_MS) {
      recentlyClosed.delete(appName)
    }
  }
}

function addToRecentlyClosed(appName: string, entry: ActiveSessionState, now: number): void {
  recentlyClosed.set(appName, {
    session: entry.session,
    blockId: entry.currentBlock.id,
    blockStartTime: entry.currentBlock.start_time,
    closedAt: now
  })
}

// --- Periodic flush (crash-safety) ---

function periodicFlush(): void {
  const now = Date.now()

  // Update durations for all active sessions
  for (const entry of activeSessions.values()) {
    const sessionElapsed = (now - new Date(entry.session.start_time).getTime()) / 1000
    const blockElapsed = (now - new Date(entry.currentBlock.start_time).getTime()) / 1000

    updateSessionDuration(entry.session.id, Math.max(0, sessionElapsed))
    updateBlockDuration(entry.currentBlock.id, Math.max(0, blockElapsed))
  }

  // Check idle timeouts
  checkIdleTimeouts(now)

  // Clean up expired recently-closed entries
  closeRecentlyClosedExpired(now)
}

function checkIdleTimeouts(now: number): void {
  for (const [appName, entry] of activeSessions) {
    if (now - entry.lastHeartbeatTime >= IDLE_TIMEOUT_MS) {
      const endTime = new Date(now).toISOString()
      closeActiveSession(entry, now, endTime)
      addToRecentlyClosed(appName, entry, now)
      activeSessions.delete(appName)
    }
  }
}

// --- Heartbeat handler ---

function handleHeartbeat(tick: HeartbeatTick): void {
  if (!tick.app_name) return

  const appName = normalizeAppName(tick.app_name)
  const now = Date.now()
  const timestamp = tick.timestamp || new Date(now).toISOString()

  // Check if this app has a recently-closed session within the merge window
  const recent = recentlyClosed.get(appName)
  if (recent && now - recent.closedAt <= MERGE_WINDOW_MS) {
    // Close any other active session (only one app at a time)
    for (const [otherApp, otherEntry] of activeSessions) {
      if (otherApp !== appName) {
        const closeTime = new Date(now).toISOString()
        closeActiveSession(otherEntry, now, closeTime)
        addToRecentlyClosed(otherApp, otherEntry, now)
        activeSessions.delete(otherApp)
      }
    }

    // Re-open this session
    reopenSession(recent.session.id)

    // Create a new block for the resumed session
    const label = cleanTitleFn(appName, tick.window_title ?? '')
    const block = createBlock(
      recent.session.id,
      tick.app_name,
      label,
      tick.window_title ?? null,
      'auto',
      timestamp
    )

    activeSessions.set(appName, {
      session: { ...recent.session, end_time: null, status: 'active' },
      currentBlock: block,
      blocks: [block],
      lastTitle: tick.window_title ?? null,
      lastHeartbeatTime: now,
      lastTitleChangeTime: now - DEBOUNCE_MS - 1,
      closedAt: null
    })

    recentlyClosed.delete(appName)

    emitTick({
      appName,
      sessionId: recent.session.id,
      sessionDuration: 0,
      blockId: block.id,
      blockLabel: label,
      blockSource: 'auto',
      blockDuration: 0
    })
    return
  }

  // Remove expired recently-closed entries
  recentlyClosed.delete(appName)

  const entry = activeSessions.get(appName)

  if (!entry) {
    // No active session for this app — close any session for a different app
    // Close the current active session for a different app (only one at a time)
    for (const [otherApp, otherEntry] of activeSessions) {
      if (otherApp !== appName) {
        const closeTime = new Date(now).toISOString()
        closeActiveSession(otherEntry, now, closeTime)
        addToRecentlyClosed(otherApp, otherEntry, now)
        activeSessions.delete(otherApp)
      }
    }

    // Create new session
    const session = createSession(tick.app_name, timestamp)
    const label = cleanTitleFn(appName, tick.window_title ?? '')
    const block = createBlock(
      session.id,
      tick.app_name,
      label,
      tick.window_title ?? null,
      'auto',
      timestamp
    )

    activeSessions.set(appName, {
      session,
      currentBlock: block,
      blocks: [block],
      lastTitle: tick.window_title ?? null,
      lastHeartbeatTime: now,
      lastTitleChangeTime: now - DEBOUNCE_MS - 1,
      closedAt: null
    })

    // Initial duration update (for crash safety)
    updateSessionDuration(session.id, 0)
    updateBlockDuration(block.id, 0)

    emitTick({
      appName,
      sessionId: session.id,
      sessionDuration: 0,
      blockId: block.id,
      blockLabel: label,
      blockSource: 'auto',
      blockDuration: 0
    })
    return
  }

  // --- Existing active session ---

  // Update session duration incrementally
  const sessionDuration = entry.session.duration_seconds + tick.duration_ms / 1000
  updateSessionDuration(entry.session.id, sessionDuration)

  // Check for title change
  if (tick.title_changed) {
    if (now - entry.lastTitleChangeTime >= DEBOUNCE_MS) {
      // Close current block
      const blockEndTime = new Date(now).toISOString()
      const blockDuration = entry.currentBlock.duration_seconds + tick.duration_ms / 1000
      closeBlock(entry.currentBlock.id, blockEndTime, blockDuration)

      // Create new auto block
      const newLabel = cleanTitleFn(appName, tick.window_title ?? '')
      const newBlock = createBlock(
        entry.session.id,
        tick.app_name,
        newLabel,
        tick.window_title ?? null,
        'auto',
        timestamp
      )

      entry.currentBlock = newBlock
      entry.blocks.push(newBlock)
      entry.lastTitle = tick.window_title ?? null
      entry.lastTitleChangeTime = now
      entry.lastHeartbeatTime = now

      emitTick({
        appName,
        sessionId: entry.session.id,
        sessionDuration,
        blockId: newBlock.id,
        blockLabel: newLabel,
        blockSource: 'auto',
        blockDuration: 0
      })
    } else {
      // Debounced — update duration but don't create new block
      const blockDuration = entry.currentBlock.duration_seconds + tick.duration_ms / 1000
      updateBlockDuration(entry.currentBlock.id, blockDuration)
      entry.currentBlock.duration_seconds = blockDuration
      entry.lastHeartbeatTime = now
    }
  } else {
    // Same title — update block duration
    const blockDuration = entry.currentBlock.duration_seconds + tick.duration_ms / 1000
    updateBlockDuration(entry.currentBlock.id, blockDuration)
    entry.currentBlock.duration_seconds = blockDuration
    entry.lastHeartbeatTime = now
  }

  entry.session.duration_seconds = sessionDuration
}

// --- Public API ---

export function initSessionManager(cleanFn: CleanTitleFn): () => void {
  cleanTitleFn = cleanFn

  // Clear stale state (safe: initSessionManager is called once in production)
  activeSessions.clear()
  recentlyClosed.clear()
  tickCallbacks = []
  if (flushIntervalId) {
    clearInterval(flushIntervalId)
    flushIntervalId = null
  }
  if (unsubscribeHeartbeat) {
    unsubscribeHeartbeat()
    unsubscribeHeartbeat = null
  }

  // Crash recovery: mark any existing active sessions as crashed
  const existingActive = getActiveSessions()
  for (const s of existingActive) {
    const endTime = new Date().toISOString()
    closeSession(s.id, endTime, s.duration_seconds)
  }

  // Start periodic flush interval
  flushIntervalId = setInterval(periodicFlush, FLUSH_INTERVAL_MS)

  // Subscribe to heartbeats
  unsubscribeHeartbeat = onHeartbeat(handleHeartbeat)

  return () => {
    shutdownSessionManager()
  }
}

export function setManualLabel(appName: string, label: string): void {
  const normalizedApp = normalizeAppName(appName)
  const entry = activeSessions.get(normalizedApp)
  if (!entry) return

  const now = Date.now()
  const timestamp = new Date(now).toISOString()

  // Close current block
  const blockDuration = entry.currentBlock.duration_seconds
  closeBlock(entry.currentBlock.id, timestamp, blockDuration)

  // Create manual block
  const block = createBlock(
    entry.session.id,
    entry.session.app_name,
    label,
    null,
    'manual',
    timestamp
  )

  entry.currentBlock = block
  entry.blocks.push(block)
  entry.lastTitleChangeTime = now - DEBOUNCE_MS - 1

  emitTick({
    appName: normalizedApp,
    sessionId: entry.session.id,
    sessionDuration: entry.session.duration_seconds,
    blockId: block.id,
    blockLabel: label,
    blockSource: 'manual',
    blockDuration: 0
  })
}

export function getActiveSessionData(): {
  appName: string
  session: AppSession
  blocks: TimeBlock[]
  currentBlock: TimeBlock
} | null {
  // Return the most recently active session
  // Since only one app can be active at a time, return the first (and only) entry
  if (activeSessions.size === 0) return null

  const entries = Array.from(activeSessions.entries())
  // Return the entry that was most recently active
  entries.sort((a, b) => b[1].lastHeartbeatTime - a[1].lastHeartbeatTime)

  const [appName, entry] = entries[0]
  return {
    appName,
    session: entry.session,
    blocks: entry.blocks,
    currentBlock: entry.currentBlock
  }
}

export function setTitleCleaner(fn: CleanTitleFn): void {
  cleanTitleFn = fn
}

export function shutdownSessionManager(): void {
  // Clear flush interval
  if (flushIntervalId) {
    clearInterval(flushIntervalId)
    flushIntervalId = null
  }

  // Close all active sessions and blocks
  const now = Date.now()
  const endTime = new Date(now).toISOString()
  for (const entry of activeSessions.values()) {
    closeActiveSession(entry, now, endTime)
  }
  activeSessions.clear()
  recentlyClosed.clear()

  // Remove heartbeat listener
  if (unsubscribeHeartbeat) {
    unsubscribeHeartbeat()
    unsubscribeHeartbeat = null
  }
}

export function onSessionTick(callback: SessionTickCallback): () => void {
  tickCallbacks.push(callback)
  return () => {
    tickCallbacks = tickCallbacks.filter((cb) => cb !== callback)
  }
}
