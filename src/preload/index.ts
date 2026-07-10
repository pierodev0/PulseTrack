import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getActiveApps: (): Promise<import('../main/window-detector').WindowInfo[]> =>
    ipcRenderer.invoke('get:active-apps'),

  startTimer: (appName: string) => ipcRenderer.invoke('timer:start', appName),

  stopTimer: () => ipcRenderer.invoke('timer:stop'),

  pauseTimer: () => ipcRenderer.invoke('timer:pause'),

  resumeTimer: () => ipcRenderer.invoke('timer:resume'),

  getCurrentTime: () => ipcRenderer.invoke('timer:get-time'),

  lapTimer: () => ipcRenderer.invoke('timer:lap'),

  renameLap: (lapIndex: number, label: string) =>
    ipcRenderer.invoke('timer:rename-lap', lapIndex, label),

  saveSession: (data: { appName: string; duration: number }) => ipcRenderer.invoke('db:save', data),

  getHistory: (limit?: number) => ipcRenderer.invoke('db:history', limit),

  editRecord: (data: { id: number; durationSeconds: number }) =>
    ipcRenderer.invoke('db:edit', data),

  deleteRecord: (id: number) => ipcRenderer.invoke('db:delete', id),

  getStats: () => ipcRenderer.invoke('db:stats'),

  togglePip: () => ipcRenderer.invoke('pip:toggle'),

  getPipStatus: () => ipcRenderer.invoke('pip:status'),

  onTimerTick: (
    callback: (data: {
      elapsed: number
      running: boolean
      lapCount: number
      laps: Array<{ number: number; label: string; duration: number }>
    }) => void
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: {
        elapsed: number
        running: boolean
        lapCount: number
        laps: Array<{ number: number; label: string; duration: number }>
      }
    ) => callback(data)
    ipcRenderer.on('timer:tick', handler)
    return () => {
      ipcRenderer.removeListener('timer:tick', handler)
    }
  },

  getSettings: () => ipcRenderer.invoke('settings:get'),

  setSettings: (partial: Record<string, unknown>) => ipcRenderer.invoke('settings:set', partial),

  onSettingsChanged: (callback: (data: Record<string, unknown>) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: Record<string, unknown>) =>
      callback(data)
    ipcRenderer.on('settings:changed', handler)
    return () => {
      ipcRenderer.removeListener('settings:changed', handler)
    }
  },

  onWindowFocus: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('window:focus', handler)
    return () => {
      ipcRenderer.removeListener('window:focus', handler)
    }
  },

  onModeChange: (callback: (isPip: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, isPip: boolean) => callback(isPip)
    ipcRenderer.on('mode:changed', handler)
    return () => {
      ipcRenderer.removeListener('mode:changed', handler)
    }
  },

  startHeartbeat: (intervalMs?: number) => ipcRenderer.invoke('heartbeat:start', intervalMs),

  stopHeartbeat: () => ipcRenderer.invoke('heartbeat:stop'),

  getHeartbeatStatus: () => ipcRenderer.invoke('heartbeat:status'),

  getHeartbeatStats: (from?: string, to?: string) =>
    ipcRenderer.invoke('db:heartbeat-stats', from, to),

  getHeartbeatTimeline: (from?: string, to?: string) =>
    ipcRenderer.invoke('db:heartbeat-timeline', from, to),

  onHeartbeatTick: (callback: (data: import('../main/heartbeat').HeartbeatTick) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: import('../main/heartbeat').HeartbeatTick
    ) => callback(data)
    ipcRenderer.on('heartbeat:tick', handler)
    return () => {
      ipcRenderer.removeListener('heartbeat:tick', handler)
    }
  },

  // Session tracking API
  getActiveSession: () => ipcRenderer.invoke('session:get-active'),

  getSessionList: (limit?: number, appName?: string) =>
    ipcRenderer.invoke('session:list', limit, appName),

  setSessionLabel: (appName: string, label: string) =>
    ipcRenderer.invoke('session:set-label', appName, label),

  getTitleRules: () => ipcRenderer.invoke('title-rules:get'),

  setTitleRules: (rules: Record<string, import('../main/title-cleaner').TitleRule[]>) =>
    ipcRenderer.invoke('title-rules:set', rules),

  onSessionTick: (callback: (data: import('../main/session-manager').SessionTick) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: import('../main/session-manager').SessionTick
    ) => callback(data)
    ipcRenderer.on('session:tick', handler)
    return () => {
      ipcRenderer.removeListener('session:tick', handler)
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electronAPI = api
}
