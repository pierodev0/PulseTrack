import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

vi.mock('../window-detector', () => ({
  getActiveApp: vi.fn()
}))

import { startTimer, stopTimer, pauseTimer, resumeTimer, getTimerState, onTick } from '../timer'
import { getActiveApp } from '../window-detector'

const APP_NAME = 'Code.exe'

describe('timer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
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
    vi.mocked(getActiveApp).mockResolvedValue({ app: APP_NAME, title: 'Editor', id: 1, path: 'C:\\Code.exe' })
    startTimer(APP_NAME)

    vi.advanceTimersByTime(1000)

    await vi.waitFor(() => {
      expect(getTimerState().elapsed).toBeGreaterThanOrEqual(0.5)
    })
  })

  it('does not increment elapsed when active app differs', async () => {
    vi.mocked(getActiveApp).mockResolvedValue({ app: 'Firefox.exe', title: 'Browser', id: 2, path: 'C:\\Firefox.exe' })
    startTimer(APP_NAME)

    vi.advanceTimersByTime(1000)

    await vi.waitFor(() => {
      expect(getTimerState().elapsed).toBe(0)
    })
  })

  it('does not tick while paused', async () => {
    vi.mocked(getActiveApp).mockResolvedValue({ app: APP_NAME, title: 'Editor', id: 1, path: 'C:\\Code.exe' })
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
    expect(callback).toHaveBeenCalledWith(0, true)

    pauseTimer()
    expect(callback).toHaveBeenCalledWith(0, false)

    stopTimer()
    expect(callback).toHaveBeenCalledWith(0, false)

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
    vi.mocked(getActiveApp).mockResolvedValue({ app: APP_NAME, title: 'Editor', id: 1, path: 'C:\\Code.exe' })
    startTimer(APP_NAME)
    startTimer('Other.exe')

    vi.advanceTimersByTime(1000)

    // should only have 2 ticks for Other.exe, not mixed
    expect(getTimerState().selectedApp).toBe('Other.exe')
  })
})
