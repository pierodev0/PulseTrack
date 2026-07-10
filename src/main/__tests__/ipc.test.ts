import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ipcMain } from 'electron'

// -- Mock dependencies that ipc.ts imports directly --
// Using __mocks__ approach with vi.mock at module level

vi.mock('../window-detector', () => ({
  listOpenWindows: vi.fn()
}))

vi.mock('../timer', () => ({
  startTimer: vi.fn(),
  stopTimer: vi.fn(),
  pauseTimer: vi.fn(),
  resumeTimer: vi.fn(),
  getTimerState: vi.fn(),
  onTick: vi.fn(),
  lapTimer: vi.fn(),
  renameLap: vi.fn()
}))

vi.mock('../database', () => ({
  saveSession: vi.fn(),
  getHistory: vi.fn(),
  updateSession: vi.fn(),
  deleteSession: vi.fn(),
  getStats: vi.fn(),
  getHeartbeatStats: vi.fn(),
  getHeartbeatTimeline: vi.fn(),
  getRecentSessions: vi.fn(),
  getActiveSessions: vi.fn(),
  renameBlock: vi.fn()
}))

vi.mock('../heartbeat', () => ({
  startHeartbeatWatcher: vi.fn(),
  stopHeartbeatWatcher: vi.fn(),
  isHeartbeatRunning: vi.fn(),
  onHeartbeat: vi.fn()
}))

vi.mock('../pip', () => ({
  togglePip: vi.fn(),
  isPipActive: vi.fn(),
  sendToAllWindows: vi.fn()
}))

vi.mock('../settings', () => ({
  getSettings: vi.fn(() => ({
    pipStyle: 'transparent',
    customColors: { bg: '#1e1e2e', text: '#ffffff', border: '#334155' },
    titleRules: {}
  })),
  setSettings: vi.fn()
}))

vi.mock('../session-manager', () => ({
  getActiveSessionData: vi.fn(),
  setManualLabel: vi.fn(),
  setTitleCleaner: vi.fn(),
  onSessionTick: vi.fn(() => vi.fn())
}))

vi.mock('../title-cleaner', () => ({
  createTitleCleaner: vi.fn(() => vi.fn()),
  getDefaultRules: vi.fn(() => ({}))
}))

import { registerIpcHandlers } from '../ipc'

describe('IPC handlers for session & title-rules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers session:get-active handler', () => {
    registerIpcHandlers()
    expect(ipcMain.handle).toHaveBeenCalledWith('session:get-active', expect.any(Function))
  })

  it('registers session:set-label handler', () => {
    registerIpcHandlers()
    expect(ipcMain.handle).toHaveBeenCalledWith('session:set-label', expect.any(Function))
  })

  it('registers session:list handler', () => {
    registerIpcHandlers()
    expect(ipcMain.handle).toHaveBeenCalledWith('session:list', expect.any(Function))
  })

  it('registers session:stats handler', () => {
    registerIpcHandlers()
    expect(ipcMain.handle).toHaveBeenCalledWith('session:stats', expect.any(Function))
  })

  it('registers title-rules:get handler', () => {
    registerIpcHandlers()
    expect(ipcMain.handle).toHaveBeenCalledWith('title-rules:get', expect.any(Function))
  })

  it('registers title-rules:set handler', () => {
    registerIpcHandlers()
    expect(ipcMain.handle).toHaveBeenCalledWith('title-rules:set', expect.any(Function))
  })

  it('registers timer:lap handler', () => {
    registerIpcHandlers()
    expect(ipcMain.handle).toHaveBeenCalledWith('timer:lap', expect.any(Function))
  })

  it('registers timer:rename-lap handler', () => {
    registerIpcHandlers()
    expect(ipcMain.handle).toHaveBeenCalledWith('timer:rename-lap', expect.any(Function))
  })
})
