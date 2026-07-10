import { ipcMain } from 'electron'
import { listOpenWindows } from './window-detector'
import {
  startTimer,
  stopTimer,
  pauseTimer,
  resumeTimer,
  getTimerState,
  onTick,
  lapTimer,
  renameLap
} from './timer'
import {
  saveSession,
  getHistory,
  updateSession,
  deleteSession,
  renameSession,
  getStats,
  getHeartbeatStats,
  getHeartbeatTimeline,
  getRecentSessions,
  renameBlock as dbRenameBlock
} from './database'
import {
  startHeartbeatWatcher,
  stopHeartbeatWatcher,
  isHeartbeatRunning,
  onHeartbeat
} from './heartbeat'
import { togglePip, isPipActive, sendToAllWindows } from './pip'
import { getSettings, setSettings } from './settings'
import { getActiveSessionData, setManualLabel, setTitleCleaner } from './session-manager'
import { createTitleCleaner, getDefaultRules } from './title-cleaner'

export function registerIpcHandlers(): void {
  ipcMain.handle('get:active-apps', async () => {
    return await listOpenWindows()
  })

  ipcMain.handle('timer:start', (_event, appName: string) => {
    startTimer(appName)
    return getTimerState()
  })

  ipcMain.handle('timer:stop', () => {
    const duration = stopTimer()
    return { duration, session: null }
  })

  ipcMain.handle('timer:lap', () => {
    lapTimer()
    return getTimerState()
  })

  ipcMain.handle('timer:rename-lap', (_event, lapIndex: number, label: string) => {
    renameLap(lapIndex, label)
    return { success: true }
  })

  ipcMain.handle('timer:pause', () => {
    pauseTimer()
    return getTimerState()
  })

  ipcMain.handle('timer:resume', () => {
    resumeTimer()
    return getTimerState()
  })

  ipcMain.handle('timer:get-time', () => {
    return getTimerState()
  })

  ipcMain.handle('db:save', (_event, data: { appName: string; duration: number }) => {
    return saveSession(data.appName, new Date().toISOString(), data.duration)
  })

  ipcMain.handle('db:history', (_event, limit?: number) => {
    return getHistory(limit)
  })

  ipcMain.handle('db:edit', (_event, data: { id: number; durationSeconds: number }) => {
    updateSession(data.id, data.durationSeconds)
  })

  ipcMain.handle('db:delete', (_event, id: number) => {
    deleteSession(id)
  })

  ipcMain.handle('db:stats', () => {
    return getStats()
  })

  ipcMain.handle('pip:toggle', () => {
    return togglePip()
  })

  ipcMain.handle('pip:status', () => {
    return isPipActive()
  })

  ipcMain.handle('settings:get', () => {
    return getSettings()
  })

  ipcMain.handle('settings:set', (_event, partial: Record<string, unknown>) => {
    const result = setSettings(partial)
    sendToAllWindows('settings:changed', result)
    return result
  })

  ipcMain.handle('heartbeat:start', (_event, intervalMs?: number) => {
    startHeartbeatWatcher(intervalMs)
    return { running: isHeartbeatRunning() }
  })

  ipcMain.handle('heartbeat:stop', () => {
    stopHeartbeatWatcher()
    return { running: false }
  })

  ipcMain.handle('heartbeat:status', () => {
    return { running: isHeartbeatRunning() }
  })

  ipcMain.handle('db:heartbeat-stats', (_event, from?: string, to?: string) => {
    return getHeartbeatStats(from, to)
  })

  ipcMain.handle('db:heartbeat-timeline', (_event, from?: string, to?: string) => {
    return getHeartbeatTimeline(from, to)
  })

  // Session handlers
  ipcMain.handle('session:get-active', () => {
    return getActiveSessionData()
  })

  ipcMain.handle('session:set-label', (_event, appName: string, label: string) => {
    setManualLabel(appName, label)
    return { success: true }
  })

  ipcMain.handle('session:rename', (_event, sessionId: number, newName: string) => {
    renameSession(sessionId, newName)
    return { success: true }
  })

  ipcMain.handle('session:list', (_event, limit?: number, appName?: string) => {
    return getRecentSessions(limit, appName)
  })

  ipcMain.handle('session:stats', () => {
    return getRecentSessions(50)
  })

  // Title rules handlers
  ipcMain.handle('title-rules:get', () => {
    return getSettings()?.titleRules ?? getDefaultRules()
  })

  ipcMain.handle('block:rename', (_event, blockId: number, label: string) => {
    dbRenameBlock(blockId, label)
    return { success: true }
  })

  ipcMain.handle(
    'title-rules:set',
    (_event, rules: Record<string, import('./title-cleaner').TitleRule[]>) => {
      setSettings({ titleRules: rules })
      const cleaner = createTitleCleaner(rules)
      setTitleCleaner(cleaner)
      return { success: true }
    }
  )

  onTick((tick) => {
    sendToAllWindows('timer:tick', tick)
  })

  onHeartbeat((data) => {
    sendToAllWindows('heartbeat:tick', data)
  })
}
