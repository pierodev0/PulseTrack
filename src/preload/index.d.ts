import type { WindowInfo } from '../main/window-detector'
import type { HeartbeatTick } from '../main/heartbeat'
import type { HeartbeatStats } from '../main/database'
import type { AppSession, TimeBlock } from '../main/database'
import type { TitleRule } from '../main/title-cleaner'
import type { SessionTick } from '../main/session-manager'

interface TimerTickData {
  elapsed: number
  running: boolean
  lapCount: number
  laps: Array<{ number: number; label: string; duration: number }>
}

interface ElectronAPI {
  getActiveApps(): Promise<WindowInfo[]>
  startTimer(appName: string): Promise<{ running: boolean; selectedApp: string; elapsed: number }>
  stopTimer(): Promise<{ duration: number; session: unknown }>
  pauseTimer(): Promise<{ running: boolean; selectedApp: string; elapsed: number }>
  resumeTimer(): Promise<{ running: boolean; selectedApp: string; elapsed: number }>
  getCurrentTime(): Promise<{ running: boolean; selectedApp: string; elapsed: number }>
  lapTimer(): Promise<{ running: boolean; selectedApp: string; elapsed: number }>
  renameLap(lapIndex: number, label: string): Promise<{ success: boolean }>
  saveSession(data: { appName: string; duration: number }): Promise<unknown>
  getHistory(limit?: number): Promise<unknown[]>
  editRecord(data: { id: number; durationSeconds: number }): Promise<void>
  deleteRecord(id: number): Promise<void>
  getStats(): Promise<unknown[]>
  togglePip(): Promise<boolean>
  getPipStatus(): Promise<boolean>
  onTimerTick(callback: (data: TimerTickData) => void): () => void
  getSettings(): Promise<{
    pipStyle: string
    customColors: { bg: string; text: string; border: string }
  }>
  setSettings(
    partial: Record<string, unknown>
  ): Promise<{ pipStyle: string; customColors: { bg: string; text: string; border: string } }>
  onSettingsChanged(callback: (data: Record<string, unknown>) => void): () => void
  onWindowFocus(callback: () => void): () => void
  onModeChange(callback: (isPip: boolean) => void): () => void
  startHeartbeat(intervalMs?: number): Promise<{ running: boolean }>
  stopHeartbeat(): Promise<{ running: boolean }>
  getHeartbeatStatus(): Promise<{ running: boolean }>
  getHeartbeatStats(from?: string, to?: string): Promise<HeartbeatStats[]>
  getHeartbeatTimeline(from?: string, to?: string): Promise<unknown[]>
  onHeartbeatTick(callback: (data: HeartbeatTick) => void): () => void

  // Session tracking API
  getActiveSession(): Promise<{
    appName: string
    session: AppSession
    blocks: TimeBlock[]
    currentBlock: TimeBlock
  } | null>

  getSessionList(
    limit?: number,
    appName?: string
  ): Promise<(AppSession & { blocks: TimeBlock[] })[]>

  setSessionLabel(appName: string, label: string): Promise<{ success: boolean }>

  getTitleRules(): Promise<Record<string, TitleRule[]>>

  setTitleRules(rules: Record<string, TitleRule[]>): Promise<{ success: boolean }>

  onSessionTick(callback: (data: SessionTick) => void): () => void
}

interface Window {
  electronAPI: ElectronAPI
}
