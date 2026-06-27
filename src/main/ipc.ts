import { ipcMain } from 'electron'
import { listOpenWindows } from './window-detector'
import { startTimer, stopTimer, pauseTimer, resumeTimer, getTimerState, onTick } from './timer'
import {
  saveSession,
  getHistory,
  updateSession,
  deleteSession,
  getStats
} from './database'
import { togglePip, isPipActive, sendToAllWindows } from './pip'
import { getSettings, setSettings } from './settings'

export function registerIpcHandlers(): void {
  ipcMain.handle('get:active-apps', async () => {
    return await listOpenWindows()
  })

  ipcMain.handle('timer:start', (_event, appName: string) => {
    startTimer(appName)
    return getTimerState()
  })

  ipcMain.handle('timer:stop', () => {
    const state = getTimerState()
    const duration = stopTimer()
    if (state.selectedApp) {
      const session = saveSession(
        state.selectedApp,
        new Date().toISOString(),
        duration
      )
      return { duration, session }
    }
    return { duration, session: null }
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

  onTick((elapsed, running) => {
    sendToAllWindows('timer:tick', { elapsed, running })
  })
}
