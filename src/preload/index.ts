import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getActiveApps: (): Promise<import('../main/window-detector').WindowInfo[]> =>
    ipcRenderer.invoke('get:active-apps'),

  startTimer: (appName: string) => ipcRenderer.invoke('timer:start', appName),

  stopTimer: () => ipcRenderer.invoke('timer:stop'),

  pauseTimer: () => ipcRenderer.invoke('timer:pause'),

  resumeTimer: () => ipcRenderer.invoke('timer:resume'),

  getCurrentTime: () => ipcRenderer.invoke('timer:get-time'),

  saveSession: (data: { appName: string; duration: number }) =>
    ipcRenderer.invoke('db:save', data),

  getHistory: (limit?: number) => ipcRenderer.invoke('db:history', limit),

  editRecord: (data: { id: number; durationSeconds: number }) =>
    ipcRenderer.invoke('db:edit', data),

  deleteRecord: (id: number) => ipcRenderer.invoke('db:delete', id),

  getStats: () => ipcRenderer.invoke('db:stats'),

  togglePip: () => ipcRenderer.invoke('pip:toggle'),

  getPipStatus: () => ipcRenderer.invoke('pip:status'),

  onTimerTick: (callback: (data: { elapsed: number; running: boolean }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { elapsed: number; running: boolean }) =>
      callback(data)
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
