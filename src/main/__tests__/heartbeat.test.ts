import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

vi.mock('../window-detector', () => ({
  getActiveApp: vi.fn()
}))

let savedHeartbeats: Array<{
  appName: string
  windowTitle: string | null
  durationMs: number
}> = []

vi.mock('../database', () => ({
  saveHeartbeat: vi.fn((appName: string, windowTitle: string | null, durationMs: number) => {
    savedHeartbeats.push({ appName, windowTitle, durationMs })
    return {
      id: savedHeartbeats.length,
      app_name: appName,
      window_title: windowTitle,
      timestamp: new Date().toISOString(),
      duration_ms: durationMs
    }
  })
}))

import { getActiveApp } from '../window-detector'
import {
  startHeartbeatWatcher,
  stopHeartbeatWatcher,
  isHeartbeatRunning,
  onHeartbeat,
  getLastWindow,
  resetHeartbeatWatcher
} from '../heartbeat'

const mockGetActiveApp = getActiveApp as ReturnType<typeof vi.fn>

describe('heartbeat watcher', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    savedHeartbeats = []
    mockGetActiveApp.mockReset()
  })

  afterEach(() => {
    stopHeartbeatWatcher()
    resetHeartbeatWatcher()
    vi.useRealTimers()
  })

  it('starts and stops the watcher', () => {
    expect(isHeartbeatRunning()).toBe(false)
    startHeartbeatWatcher(1000)
    expect(isHeartbeatRunning()).toBe(true)
    stopHeartbeatWatcher()
    expect(isHeartbeatRunning()).toBe(false)
  })

  it('does not double-start', () => {
    startHeartbeatWatcher(1000)
    startHeartbeatWatcher(1000)
    expect(isHeartbeatRunning()).toBe(true)
    stopHeartbeatWatcher()
  })

  it('calls saveHeartbeat on each tick', async () => {
    mockGetActiveApp.mockResolvedValue({
      title: 'index.ts',
      id: 123,
      app: 'Code.exe',
      path: '/usr/local/bin/code'
    })

    startHeartbeatWatcher(1000)
    await vi.advanceTimersByTimeAsync(0)

    expect(mockGetActiveApp).toHaveBeenCalledTimes(1)
    expect(savedHeartbeats.length).toBe(1)
    expect(savedHeartbeats[0].appName).toBe('Code.exe')
    expect(savedHeartbeats[0].windowTitle).toBe('index.ts')

    await vi.advanceTimersByTimeAsync(2000)

    expect(savedHeartbeats.length).toBe(3)
  })

  it('emits heartbeat tick events', async () => {
    mockGetActiveApp.mockResolvedValue({
      title: 'index.ts',
      id: 123,
      app: 'Code.exe',
      path: '/usr/local/bin/code'
    })

    const events: unknown[] = []
    const unsub = onHeartbeat((data) => {
      events.push(data)
    })

    startHeartbeatWatcher(1000)
    await vi.advanceTimersByTimeAsync(1000)

    expect(events.length).toBeGreaterThanOrEqual(1)
    const first = events[0] as Record<string, unknown>
    expect(first.app_name).toBe('Code.exe')
    expect(first.window_title).toBe('index.ts')

    unsub()
    stopHeartbeatWatcher()
  })

  it('detects app change', async () => {
    mockGetActiveApp.mockResolvedValueOnce({
      title: 'index.ts',
      id: 123,
      app: 'Code.exe',
      path: '/usr/local/bin/code'
    })
    mockGetActiveApp.mockResolvedValueOnce({
      title: 'Terminal',
      id: 456,
      app: 'Terminal.exe',
      path: '/usr/local/bin/terminal'
    })

    const changes: boolean[] = []
    const unsub = onHeartbeat((data) => {
      changes.push(data.app_changed)
    })

    startHeartbeatWatcher(1000)
    await vi.advanceTimersByTimeAsync(1000)

    expect(changes).toEqual([false, true])

    unsub()
    stopHeartbeatWatcher()
  })

  it('detects title change', async () => {
    mockGetActiveApp.mockResolvedValueOnce({
      title: 'index.ts',
      id: 123,
      app: 'Code.exe',
      path: '/usr/local/bin/code'
    })
    mockGetActiveApp.mockResolvedValueOnce({
      title: 'App.svelte',
      id: 123,
      app: 'Code.exe',
      path: '/usr/local/bin/code'
    })

    const titleChanges: boolean[] = []
    const unsub = onHeartbeat((data) => {
      titleChanges.push(data.title_changed)
    })

    startHeartbeatWatcher(1000)
    await vi.advanceTimersByTimeAsync(1000)

    expect(titleChanges).toEqual([false, true])

    unsub()
    stopHeartbeatWatcher()
  })

  it('getLastWindow returns current app and title', async () => {
    mockGetActiveApp.mockResolvedValue({
      title: 'App.svelte',
      id: 123,
      app: 'Code.exe',
      path: '/usr/local/bin/code'
    })

    startHeartbeatWatcher(1000)
    await vi.advanceTimersByTimeAsync(0)
    stopHeartbeatWatcher()

    const last = getLastWindow()
    expect(last.app).toBe('Code.exe')
    expect(last.title).toBe('App.svelte')
  })

  it('returns null last window when never ticked', () => {
    const last = getLastWindow()
    expect(last.app).toBeNull()
    expect(last.title).toBeNull()
  })
})
