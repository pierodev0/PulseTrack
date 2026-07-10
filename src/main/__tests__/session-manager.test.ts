import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { HeartbeatTick } from '../heartbeat'

// -- Hoisted shared state for mocks --

const { heartbeatCallbacks, mockDb, resetMockIds } = vi.hoisted(() => {
  let nextId = 1
  let nextBlockId = 1000

  return {
    heartbeatCallbacks: [] as Array<(data: HeartbeatTick) => void>,
    mockDb: {
      createSession: vi.fn((appName: string, startTime: string) => {
        const id = nextId++
        return {
          id,
          app_name: appName,
          start_time: startTime,
          end_time: null,
          duration_seconds: 0,
          status: 'active',
          created_at: startTime
        }
      }),
      closeSession: vi.fn(),
      updateSessionDuration: vi.fn(),
      reopenSession: vi.fn(),
      createBlock: vi.fn(
        (
          sessionId: number,
          appName: string,
          label: string,
          rawTitle: string | null,
          source: string,
          startTime: string
        ) => {
          const id = nextBlockId++
          return {
            id,
            session_id: sessionId,
            app_name: appName,
            label,
            raw_title: rawTitle,
            source,
            start_time: startTime,
            end_time: null,
            duration_seconds: 0,
            status: 'active'
          }
        }
      ),
      closeBlock: vi.fn(),
      updateBlockDuration: vi.fn(),
      getActiveSessions: vi.fn(() => []),
      getSessionBlocks: vi.fn(() => [])
    },
    resetMockIds: () => {
      nextId = 1
      nextBlockId = 1000
    }
  }
})

vi.mock('../heartbeat', () => ({
  onHeartbeat: vi.fn((cb: (data: HeartbeatTick) => void) => {
    heartbeatCallbacks.push(cb)
    return () => {
      const idx = heartbeatCallbacks.indexOf(cb)
      if (idx >= 0) heartbeatCallbacks.splice(idx, 1)
    }
  })
}))

vi.mock('../database', () => ({
  createSession: mockDb.createSession,
  closeSession: mockDb.closeSession,
  updateSessionDuration: mockDb.updateSessionDuration,
  reopenSession: mockDb.reopenSession,
  createBlock: mockDb.createBlock,
  closeBlock: mockDb.closeBlock,
  updateBlockDuration: mockDb.updateBlockDuration,
  getActiveSessions: mockDb.getActiveSessions,
  getSessionBlocks: mockDb.getSessionBlocks
}))

// -- Module under test --

import {
  initSessionManager,
  setManualLabel,
  setTitleCleaner,
  getActiveSessionData,
  shutdownSessionManager,
  onSessionTick
} from '../session-manager'
import type { SessionTick } from '../session-manager'

// -- Helpers --

function createTick(overrides: Partial<HeartbeatTick> = {}): HeartbeatTick {
  return {
    app_name: 'code.exe',
    window_title: 'file.ts - Code',
    timestamp: new Date().toISOString(),
    duration_ms: 5000,
    app_changed: false,
    title_changed: false,
    ...overrides
  }
}

function fireHeartbeat(overrides: Partial<HeartbeatTick> = {}): void {
  if (heartbeatCallbacks.length === 0) {
    throw new Error('No heartbeat callback registered. Call initSessionManager first.')
  }
  heartbeatCallbacks[0](createTick(overrides))
}

// -- Tests --

describe('session lifecycle (R1)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    heartbeatCallbacks.length = 0
    resetMockIds()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates a session on first heartbeat for an app', () => {
    const cleanFn = vi.fn().mockReturnValue('cleaned title')
    initSessionManager(cleanFn)

    fireHeartbeat({ app_name: 'photoshop.exe', window_title: 'project.psd @ 100%' })

    expect(mockDb.createSession).toHaveBeenCalledWith('photoshop.exe', expect.any(String))
    expect(mockDb.createBlock).toHaveBeenCalledWith(
      expect.any(Number),
      'photoshop.exe',
      'cleaned title',
      'project.psd @ 100%',
      'auto',
      expect.any(String)
    )

    const data = getActiveSessionData()
    expect(data).not.toBeNull()
    expect(data!.appName).toBe('photoshop')
    expect(data!.session.status).toBe('active')
    expect(data!.blocks).toHaveLength(1)
  })

  it('closes session after idle timeout (5 min)', () => {
    const cleanFn = vi.fn().mockReturnValue('label')
    initSessionManager(cleanFn)

    fireHeartbeat({ app_name: 'photoshop.exe' })
    expect(getActiveSessionData()).not.toBeNull()

    // Advance time past the 5-minute idle threshold
    // The periodic flush runs every 60s and checks idle timeouts
    // At 300s (5th flush), the idle check should trigger close
    vi.advanceTimersByTime(301_000)

    expect(mockDb.closeSession).toHaveBeenCalled()
    expect(mockDb.closeBlock).toHaveBeenCalled()
    expect(getActiveSessionData()).toBeNull()
  })

  it('creates a new session after idle close + merge window expiry', () => {
    const cleanFn = vi.fn().mockReturnValue('label')
    initSessionManager(cleanFn)

    fireHeartbeat({ app_name: 'photoshop.exe' })
    expect(mockDb.createSession).toHaveBeenCalledTimes(1)
    const firstSessionId = getActiveSessionData()!.session.id

    // Idle timeout closes the session
    vi.advanceTimersByTime(301_000)
    expect(getActiveSessionData()).toBeNull()

    // Advance past the 30s merge window too
    vi.advanceTimersByTime(31_000)

    // Clear mock counts
    mockDb.createSession.mockClear()

    // New heartbeat — merge window expired, should create new session
    fireHeartbeat({ app_name: 'photoshop.exe' })

    expect(mockDb.createSession).toHaveBeenCalledTimes(1)
    const secondSessionId = getActiveSessionData()!.session.id
    expect(secondSessionId).not.toBe(firstSessionId)
  })

  it('accumulates session duration across multiple heartbeats', () => {
    const cleanFn = vi.fn().mockReturnValue('label')
    initSessionManager(cleanFn)

    fireHeartbeat({ app_name: 'code.exe', duration_ms: 5000 })
    const sessionId = getActiveSessionData()!.session.id

    // The first heartbeat creates the session but does not add duration (starts at 0)
    // Subsequent heartbeats add their duration incrementally
    fireHeartbeat({ app_name: 'code.exe', duration_ms: 5000 }) // +5 → total 5
    fireHeartbeat({ app_name: 'code.exe', duration_ms: 5000 }) // +5 → total 10

    // Duration should be updated
    expect(mockDb.updateSessionDuration).toHaveBeenCalledWith(sessionId, expect.any(Number))
    const calls = mockDb.updateSessionDuration.mock.calls.filter(
      (c: unknown[]) => c[0] === sessionId
    )
    // Should have at least 3 calls: initial(0) + 1st incremental(5) + 2nd incremental(10)
    expect(calls.length).toBeGreaterThanOrEqual(3)
    // The last call should have accumulated ~10s
    const lastCall = calls[calls.length - 1]
    expect(lastCall[1] as number).toBeGreaterThanOrEqual(9)
    expect(lastCall[1] as number).toBeLessThanOrEqual(11)
  })
})

describe('merge window (R2)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    heartbeatCallbacks.length = 0
    resetMockIds()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('app switch closes session A and opens session B', () => {
    const cleanFn = vi.fn().mockReturnValue('label')
    initSessionManager(cleanFn)

    fireHeartbeat({ app_name: 'chrome.exe' })
    expect(getActiveSessionData()!.appName).toBe('chrome')

    fireHeartbeat({ app_name: 'code.exe' })

    // Chrome session should be closed in DB
    expect(mockDb.closeSession).toHaveBeenCalled()
    // Active session should now be VS Code
    expect(getActiveSessionData()!.appName).toBe('code')
  })

  it('re-opens session within 30s merge window', () => {
    const cleanFn = vi.fn().mockReturnValue('label')
    initSessionManager(cleanFn)

    // Chrome session
    fireHeartbeat({ app_name: 'chrome.exe' })
    const chromeSessionId = getActiveSessionData()!.session.id

    // Switch to VS Code — Chrome session closes
    fireHeartbeat({ app_name: 'code.exe' })

    // Clear createSession count to detect new calls
    mockDb.createSession.mockClear()

    // Heartbeat for Chrome within 30s — should reopen
    fireHeartbeat({ app_name: 'chrome.exe' })

    // createSession should NOT have been called (re-opened existing)
    expect(mockDb.createSession).not.toHaveBeenCalled()
    // reopenSession should have been called
    expect(mockDb.reopenSession).toHaveBeenCalledWith(chromeSessionId)
    // Active session should be Chrome
    expect(getActiveSessionData()!.appName).toBe('chrome')
    expect(getActiveSessionData()!.session.id).toBe(chromeSessionId)
  })

  it('creates new session after merge window expires (>31s)', () => {
    const cleanFn = vi.fn().mockReturnValue('label')
    initSessionManager(cleanFn)

    fireHeartbeat({ app_name: 'chrome.exe' })
    const chromeSessionId = getActiveSessionData()!.session.id

    // Switch to VS Code
    fireHeartbeat({ app_name: 'code.exe' })

    // Advance past 31s merge window
    vi.advanceTimersByTime(31_000)

    mockDb.createSession.mockClear()

    // Heartbeat for Chrome after window expired
    fireHeartbeat({ app_name: 'chrome.exe' })

    // Should create a NEW session, not reopen
    expect(mockDb.createSession).toHaveBeenCalledTimes(1)
    expect(mockDb.reopenSession).not.toHaveBeenCalled()
    expect(getActiveSessionData()!.session.id).not.toBe(chromeSessionId)
  })
})

describe('auto blocks (R2)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    heartbeatCallbacks.length = 0
    resetMockIds()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('title change creates a new auto block and closes the previous one', () => {
    const cleanFn = vi.fn()
    cleanFn.mockReturnValueOnce('file1.ts').mockReturnValueOnce('file2.ts')
    initSessionManager(cleanFn)

    fireHeartbeat({ app_name: 'code.exe', window_title: 'file1.ts - Code' })

    // Title change heartbeat
    fireHeartbeat({
      app_name: 'code.exe',
      window_title: 'file2.ts - Code',
      title_changed: true
    })

    expect(mockDb.closeBlock).toHaveBeenCalledTimes(1)
    expect(mockDb.createBlock).toHaveBeenCalledTimes(2)

    const blocks = getActiveSessionData()!.blocks
    const currentBlock = blocks[blocks.length - 1]
    expect(currentBlock.label).toBe('file2.ts')
    expect(currentBlock.source).toBe('auto')
  })

  it('same title does not create new block, duration accumulates', () => {
    const cleanFn = vi.fn().mockReturnValue('always same')
    initSessionManager(cleanFn)

    fireHeartbeat({ app_name: 'code.exe', window_title: 'same title', duration_ms: 5000 })

    const blockId = getActiveSessionData()!.currentBlock.id

    // Two more heartbeats with the same title — duration should accumulate
    fireHeartbeat({ app_name: 'code.exe', window_title: 'same title', duration_ms: 5000 }) // +5
    fireHeartbeat({ app_name: 'code.exe', window_title: 'same title', duration_ms: 5000 }) // +5

    // Block should NOT have been closed
    expect(mockDb.closeBlock).not.toHaveBeenCalled()
    // Block duration should track accumulated total (0 + 5 + 5 = 10s)
    expect(mockDb.updateBlockDuration).toHaveBeenLastCalledWith(blockId, expect.closeTo(10, 1))
  })

  it('rapid title changes are debounced (<3s apart)', () => {
    const cleanFn = vi.fn()
    cleanFn.mockReturnValue('file.ts')
    initSessionManager(cleanFn)

    fireHeartbeat({ app_name: 'code.exe', window_title: 'a.ts - Code' })

    mockDb.closeBlock.mockClear()
    mockDb.createBlock.mockClear()

    // First title change
    fireHeartbeat({
      app_name: 'code.exe',
      window_title: 'b.ts - Code',
      title_changed: true
    })

    // Within 2 seconds, another title change
    fireHeartbeat({
      app_name: 'code.exe',
      window_title: 'a.ts - Code',
      title_changed: true
    })

    // Only one close/create should have happened (from the first change)
    // The second should be debounced
    expect(mockDb.createBlock).toHaveBeenCalledTimes(1)
    expect(mockDb.closeBlock).toHaveBeenCalledTimes(1)
  })
})

describe('manual blocks (R2)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    heartbeatCallbacks.length = 0
    resetMockIds()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('setManualLabel creates a manual block and closes the auto block', () => {
    const cleanFn = vi.fn().mockReturnValue('auto label')
    initSessionManager(cleanFn)

    fireHeartbeat({ app_name: 'clipstudio.exe', window_title: 'sketch' })

    setManualLabel('clipstudio.exe', 'Sketching character')

    expect(mockDb.closeBlock).toHaveBeenCalledTimes(1)
    expect(mockDb.createBlock).toHaveBeenCalledTimes(2)

    const blocks = getActiveSessionData()!.blocks
    const manualBlock = blocks[blocks.length - 1]
    expect(manualBlock.label).toBe('Sketching character')
    expect(manualBlock.source).toBe('manual')
    expect(manualBlock.raw_title).toBeNull()
  })

  it('after manual block, auto block resumes on title change', () => {
    const cleanFn = vi.fn()
    cleanFn.mockReturnValueOnce('auto1').mockReturnValueOnce('auto2')
    initSessionManager(cleanFn)

    fireHeartbeat({ app_name: 'code.exe', window_title: 'file1.ts' })

    // Set manual label
    setManualLabel('code.exe', 'Manual work')

    // Title change after manual block
    fireHeartbeat({
      app_name: 'code.exe',
      window_title: 'file2.ts - Code',
      title_changed: true
    })

    // New auto block should be created (in addition to manual block)
    expect(mockDb.createBlock).toHaveBeenCalledTimes(3)
    const currentBlock = getActiveSessionData()!.currentBlock
    expect(currentBlock.label).toBe('auto2')
    expect(currentBlock.source).toBe('auto')
  })

  it('multiple setManualLabel calls create multiple manual blocks', () => {
    const cleanFn = vi.fn().mockReturnValue('auto')
    initSessionManager(cleanFn)

    fireHeartbeat({ app_name: 'clipstudio.exe' })

    setManualLabel('clipstudio.exe', 'First task')
    setManualLabel('clipstudio.exe', 'Second task')
    setManualLabel('clipstudio.exe', 'Third task')

    // 1 auto block + 3 manual = 4 total blocks
    expect(mockDb.createBlock).toHaveBeenCalledTimes(4)
    // 3 closes (auto + 2 previous manual)
    expect(mockDb.closeBlock).toHaveBeenCalledTimes(3)

    const blocks = getActiveSessionData()!.blocks
    expect(blocks).toHaveLength(4)
    expect(blocks[1].label).toBe('First task')
    expect(blocks[1].source).toBe('manual')
    expect(blocks[2].label).toBe('Second task')
    expect(blocks[2].source).toBe('manual')
    expect(blocks[3].label).toBe('Third task')
    expect(blocks[3].source).toBe('manual')
  })
})

describe('edge cases', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    heartbeatCallbacks.length = 0
    resetMockIds()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('skips heartbeat with null/empty app_name', () => {
    const cleanFn = vi.fn().mockReturnValue('label')
    initSessionManager(cleanFn)

    fireHeartbeat({ app_name: '' })

    expect(mockDb.createSession).not.toHaveBeenCalled()
    expect(getActiveSessionData()).toBeNull()
  })

  it('handles empty window title gracefully', () => {
    const cleanFn = vi.fn().mockReturnValue('')
    initSessionManager(cleanFn)

    fireHeartbeat({ app_name: 'headless.exe', window_title: '' })

    expect(mockDb.createSession).toHaveBeenCalled()
    expect(getActiveSessionData()).not.toBeNull()
  })

  it('normalizes app name (lowercase, strips .exe)', () => {
    const cleanFn = vi.fn().mockReturnValue('label')
    initSessionManager(cleanFn)

    fireHeartbeat({ app_name: 'Code.exe' })

    expect(getActiveSessionData()!.appName).toBe('code')
  })

  it('shutdownSessionManager closes all active sessions', () => {
    const cleanFn = vi.fn().mockReturnValue('label')
    initSessionManager(cleanFn)

    fireHeartbeat({ app_name: 'photoshop.exe' })
    fireHeartbeat({ app_name: 'clipstudio.exe' })

    // Two heartbeats = first session closed on app switch, second is active
    shutdownSessionManager()

    // Both sessions should have been closed
    expect(mockDb.closeSession).toHaveBeenCalled()
    expect(getActiveSessionData()).toBeNull()
  })

  it('onSessionTick delivers tick data from heartbeat', () => {
    const cleanFn = vi.fn().mockReturnValue('tick-label')
    initSessionManager(cleanFn)

    const tickSpy = vi.fn()
    const unsub = onSessionTick(tickSpy)

    fireHeartbeat({ app_name: 'notepad.exe', window_title: 'notes.txt', duration_ms: 5000 })

    expect(tickSpy).toHaveBeenCalledTimes(1)
    const tick: SessionTick = tickSpy.mock.calls[0][0]
    expect(tick.appName).toBe('notepad')
    expect(tick.blockLabel).toBe('tick-label')
    expect(tick.blockSource).toBe('auto')

    unsub()
  })

  it('setTitleCleaner updates the cleaner function for subsequent heartbeats', () => {
    const cleanFn1 = vi.fn().mockReturnValue('old-label')
    initSessionManager(cleanFn1)

    fireHeartbeat({ app_name: 'code.exe', window_title: 'old.ts' })

    const firstBlock = getActiveSessionData()!.currentBlock
    expect(firstBlock.label).toBe('old-label')

    // Swap the cleaner mid-session
    const cleanFn2 = vi.fn().mockReturnValue('new-label')
    setTitleCleaner(cleanFn2)

    mockDb.createBlock.mockClear()
    mockDb.closeBlock.mockClear()

    // Title change should now use the new cleaner
    fireHeartbeat({
      app_name: 'code.exe',
      window_title: 'new.ts',
      title_changed: true
    })

    const blocks = getActiveSessionData()!.blocks
    const lastBlock = blocks[blocks.length - 1]
    expect(lastBlock.label).toBe('new-label')
  })

  it('setTitleCleaner returns undefined (void function)', () => {
    const cleanFn = vi.fn().mockReturnValue('any')
    initSessionManager(cleanFn)

    const result = setTitleCleaner(cleanFn)
    expect(result).toBeUndefined()
  })
})
