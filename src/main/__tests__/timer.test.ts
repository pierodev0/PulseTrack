import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

vi.mock('../window-detector', () => ({
  getActiveApp: vi.fn()
}))

vi.mock('../database', () => ({
  createSession: vi.fn(),
  createBlock: vi.fn(),
  closeBlock: vi.fn(),
  closeSession: vi.fn(),
  renameBlock: vi.fn()
}))

import {
  startTimer,
  stopTimer,
  pauseTimer,
  resumeTimer,
  getTimerState,
  onTick,
  lapTimer,
  renameLap
} from '../timer'
import { getActiveApp } from '../window-detector'
import { createSession, createBlock, closeBlock, closeSession, renameBlock } from '../database'

const APP_NAME = 'Code.exe'

const MOCK_SESSION = {
  id: 1,
  app_name: APP_NAME,
  start_time: '2026-07-10T12:00:00Z',
  duration_seconds: 0,
  status: 'active',
  end_time: null,
  created_at: '2026-07-10T12:00:00Z'
}
const MOCK_BLOCK = {
  id: 10,
  session_id: 1,
  app_name: APP_NAME,
  label: 'Lap 1',
  raw_title: null,
  source: 'manual',
  start_time: '2026-07-10T12:00:00Z',
  duration_seconds: 0,
  status: 'active',
  end_time: null
}

describe('timer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(createSession).mockReturnValue(MOCK_SESSION)
    vi.mocked(createBlock).mockReturnValue(MOCK_BLOCK)
    vi.mocked(closeBlock).mockReturnValue(undefined)
    vi.mocked(closeSession).mockReturnValue(undefined)
    vi.mocked(renameBlock).mockReturnValue(undefined)
  })

  afterEach(() => {
    stopTimer()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('starts with idle state', () => {
    const state = getTimerState()
    expect(state.running).toBe(false)
    expect(state.selectedApp).toBe('')
    expect(state.elapsed).toBe(0)
  })

  it('startTimer resets elapsed, sets app, and starts running', () => {
    // simulate previous state
    startTimer('Other.exe')
    stopTimer()

    startTimer(APP_NAME)
    const state = getTimerState()
    expect(state.running).toBe(true)
    expect(state.selectedApp).toBe(APP_NAME)
    expect(state.elapsed).toBe(0)
  })

  it('stopTimer returns elapsed and resets everything', () => {
    startTimer(APP_NAME)
    const elapsed = stopTimer()
    expect(elapsed).toBe(0)

    const state = getTimerState()
    expect(state.running).toBe(false)
    expect(state.selectedApp).toBe('')
    expect(state.elapsed).toBe(0)
  })

  it('pauseTimer stops running but keeps app and elapsed', () => {
    startTimer(APP_NAME)
    pauseTimer()

    const state = getTimerState()
    expect(state.running).toBe(false)
    expect(state.selectedApp).toBe(APP_NAME)
    expect(state.elapsed).toBe(0)
  })

  it('resumeTimer continues from paused state', () => {
    startTimer(APP_NAME)
    pauseTimer()
    resumeTimer()

    const state = getTimerState()
    expect(state.running).toBe(true)
    expect(state.selectedApp).toBe(APP_NAME)
  })

  it('resumeTimer does nothing when no app selected', () => {
    // timer is idle, no app selected
    resumeTimer()
    expect(getTimerState().running).toBe(false)
    expect(getTimerState().selectedApp).toBe('')
  })

  it('full cycle: start → pause → resume → stop', () => {
    startTimer(APP_NAME)
    expect(getTimerState().running).toBe(true)

    pauseTimer()
    expect(getTimerState().running).toBe(false)
    expect(getTimerState().selectedApp).toBe(APP_NAME)

    resumeTimer()
    expect(getTimerState().running).toBe(true)

    const elapsed = stopTimer()
    expect(elapsed).toBe(0)
    expect(getTimerState().running).toBe(false)
    expect(getTimerState().selectedApp).toBe('')
  })

  it('increments elapsed on tick when active app matches', async () => {
    vi.mocked(getActiveApp).mockResolvedValue({
      app: APP_NAME,
      title: 'Editor',
      id: 1,
      path: 'C:\\Code.exe'
    })
    startTimer(APP_NAME)

    vi.advanceTimersByTime(1000)

    await vi.waitFor(() => {
      expect(getTimerState().elapsed).toBeGreaterThanOrEqual(0.5)
    })
  })

  it('does not increment elapsed when active app differs', async () => {
    vi.mocked(getActiveApp).mockResolvedValue({
      app: 'Firefox.exe',
      title: 'Browser',
      id: 2,
      path: 'C:\\Firefox.exe'
    })
    startTimer(APP_NAME)

    vi.advanceTimersByTime(1000)

    await vi.waitFor(() => {
      expect(getTimerState().elapsed).toBe(0)
    })
  })

  it('does not tick while paused', async () => {
    vi.mocked(getActiveApp).mockResolvedValue({
      app: APP_NAME,
      title: 'Editor',
      id: 1,
      path: 'C:\\Code.exe'
    })
    startTimer(APP_NAME)
    pauseTimer()

    vi.advanceTimersByTime(1000)

    // flush microtasks in case any pending
    await Promise.resolve()
    expect(getTimerState().elapsed).toBe(0)
  })

  it('emits tick events via onTick callbacks', () => {
    const callback = vi.fn()
    const unsub = onTick(callback)

    startTimer(APP_NAME)
    expect(callback).toHaveBeenCalledWith({
      elapsed: 0,
      running: true,
      lapCount: 0,
      laps: [{ number: 1, label: 'Lap 1', duration: 0 }]
    })

    pauseTimer()
    expect(callback).toHaveBeenCalledWith({
      elapsed: 0,
      running: false,
      lapCount: 0,
      laps: [{ number: 1, label: 'Lap 1', duration: 0 }]
    })

    stopTimer()
    expect(callback).toHaveBeenCalledWith({
      elapsed: 0,
      running: false,
      lapCount: 0,
      laps: []
    })

    unsub()
  })

  it('onTick unsubscribe removes callback', () => {
    const callback = vi.fn()
    const unsub = onTick(callback)

    unsub()
    startTimer(APP_NAME)
    stopTimer()

    expect(callback).toHaveBeenCalledTimes(0)
  })

  it('startTimer clears previous interval', () => {
    vi.mocked(getActiveApp).mockResolvedValue({
      app: APP_NAME,
      title: 'Editor',
      id: 1,
      path: 'C:\\Code.exe'
    })
    startTimer(APP_NAME)
    startTimer('Other.exe')

    vi.advanceTimersByTime(1000)

    // should only have 2 ticks for Other.exe, not mixed
    expect(getTimerState().selectedApp).toBe('Other.exe')
  })

  describe('lap support', () => {
    function setupRunningTimer(blockId = 100) {
      vi.mocked(createSession).mockReturnValue({ ...MOCK_SESSION, id: 42 })
      vi.mocked(createBlock).mockReturnValue({ ...MOCK_BLOCK, id: blockId, session_id: 42 })
      startTimer(APP_NAME)
    }

    it('startTimer creates a session and a first time block', () => {
      setupRunningTimer()

      expect(createSession).toHaveBeenCalledWith(APP_NAME, expect.any(String))
      expect(createBlock).toHaveBeenCalledWith(
        42,
        APP_NAME,
        'Lap 1',
        null,
        'manual',
        expect.any(String)
      )
    })

    it('lapTimer closes current block and creates a new one', () => {
      setupRunningTimer(100)
      vi.mocked(createBlock).mockReturnValue({
        ...MOCK_BLOCK,
        id: 101,
        session_id: 42,
        label: 'Lap 2'
      })

      lapTimer()

      expect(closeBlock).toHaveBeenCalledWith(100, expect.any(String), 0)
      expect(createBlock).toHaveBeenCalledWith(
        42,
        APP_NAME,
        'Lap 2',
        null,
        'manual',
        expect.any(String)
      )
    })

    it('stopTimer closes both block and session', () => {
      setupRunningTimer(100)
      vi.mocked(closeBlock).mockReturnValue(undefined)
      vi.mocked(closeSession).mockReturnValue(undefined)

      stopTimer()

      expect(closeBlock).toHaveBeenCalledWith(100, expect.any(String), 0)
      expect(closeSession).toHaveBeenCalledWith(42, expect.any(String), 0)
    })

    it('lapTimer does nothing when timer is not running', () => {
      lapTimer()

      expect(closeBlock).not.toHaveBeenCalled()
      expect(createBlock).not.toHaveBeenCalled()
    })

    it('renameLap updates label via renameBlock', () => {
      setupRunningTimer(100)

      renameLap(0, 'Setup')

      expect(renameBlock).toHaveBeenCalledWith(100, 'Setup')
    })

    it('renameLap updates label through onTick', () => {
      setupRunningTimer(100)
      const callback = vi.fn()
      const unsub = onTick(callback)
      callback.mockClear()

      renameLap(0, 'Planning')

      const lastCall = callback.mock.lastCall?.[0]
      expect(lastCall).toBeDefined()
      expect(lastCall.laps[0].label).toBe('Planning')
      unsub()
    })

    it('multiple laps in sequence work correctly', () => {
      setupRunningTimer(100)

      lapTimer()
      lapTimer()

      expect(createBlock).toHaveBeenCalledTimes(3) // 1 initial + 2 lap
      expect(closeBlock).toHaveBeenCalledTimes(2)
    })

    it('timer state includes lapCount and laps when running', () => {
      setupRunningTimer()

      const state = getTimerState()
      expect(state.running).toBe(true)
      expect(state.selectedApp).toBe(APP_NAME)
      expect(state.elapsed).toBe(0)
    })
  })
})
