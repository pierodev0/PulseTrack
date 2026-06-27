import type { WindowInfo } from '../main/window-detector'

interface ElectronAPI {
  getActiveApps(): Promise<WindowInfo[]>
  startTimer(appName: string): Promise<{ running: boolean; selectedApp: string; elapsed: number }>
  stopTimer(): Promise<{ duration: number; session: unknown }>
  pauseTimer(): Promise<{ running: boolean; selectedApp: string; elapsed: number }>
  resumeTimer(): Promise<{ running: boolean; selectedApp: string; elapsed: number }>
  getCurrentTime(): Promise<{ running: boolean; selectedApp: string; elapsed: number }>
  saveSession(data: { appName: string; duration: number }): Promise<unknown>
  getHistory(limit?: number): Promise<unknown[]>
  editRecord(data: { id: number; durationSeconds: number }): Promise<void>
  deleteRecord(id: number): Promise<void>
  getStats(): Promise<unknown[]>
  togglePip(): Promise<boolean>
  getPipStatus(): Promise<boolean>
  onTimerTick(callback: (data: { elapsed: number; running: boolean }) => void): () => void
  getSettings(): Promise<{ pipStyle: string; customColors: { bg: string; text: string; border: string } }>
  setSettings(partial: Record<string, unknown>): Promise<{ pipStyle: string; customColors: { bg: string; text: string; border: string } }>
  onSettingsChanged(callback: (data: Record<string, unknown>) => void): () => void
  onWindowFocus(callback: () => void): () => void
  onModeChange(callback: (isPip: boolean) => void): () => void
}

interface Window {
  electronAPI: ElectronAPI
}
