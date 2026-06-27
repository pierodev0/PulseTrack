import { BrowserWindow, screen } from 'electron'

let pipWindow: BrowserWindow | null = null
let mainWindow: BrowserWindow | null = null

interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

let savedBounds: Bounds | null = null

export function setMainWindow(win: BrowserWindow): void {
  mainWindow = win
}

export function togglePip(): boolean {
  if (pipWindow) {
    destroyPip()
    return false
  }

  const win = mainWindow
  if (!win) return false

  const bounds = win.getBounds()
  savedBounds = { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }

  const { width } = screen.getPrimaryDisplay().workAreaSize

  win.setBounds({ x: width - 260, y: 40, width: 240, height: 80 })
  win.setAlwaysOnTop(true, 'floating')
  win.setVisibleOnAllWorkspaces(true)
  win.setSkipTaskbar(true)
  win.setResizable(false)

  pipWindow = win
  mainWindow = null

  pipWindow.webContents.send('mode:changed', true)

  return true
}

export function isPipActive(): boolean {
  return pipWindow !== null && !pipWindow.isDestroyed()
}

export function destroyPip(): void {
  const win = pipWindow
  if (!win || win.isDestroyed()) return

  if (savedBounds) {
    win.setBounds(savedBounds)
    savedBounds = null
  }

  win.setAlwaysOnTop(false)
  win.setVisibleOnAllWorkspaces(false)
  win.setSkipTaskbar(false)
  win.setResizable(true)

  mainWindow = win
  pipWindow = null

  mainWindow.webContents.send('mode:changed', false)
}

export function sendToAllWindows(channel: string, data: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
  if (pipWindow && !pipWindow.isDestroyed()) {
    pipWindow.webContents.send(channel, data)
  }
}
