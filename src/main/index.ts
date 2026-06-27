import { app, BrowserWindow, shell, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initDatabase } from './database'
import { initSettings } from './settings'
import { registerIpcHandlers } from './ipc'
import { createTray, destroyTray, updateTrayTooltip } from './tray'
import { setMainWindow } from './pip'
import { onTick } from './timer'

let mainWindow: BrowserWindow | null = null
let isQuitting = false

Menu.setApplicationMenu(null)

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 720,
    height: 540,
    show: false,
    frame: false,
    minWidth: 240,
    minHeight: 80,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.on('focus', () => {
    mainWindow?.webContents.send('window:focus')
  })

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  setMainWindow(mainWindow)
  registerIpcHandlers()
  createTray(
    () => mainWindow?.show(),
    () => app.quit()
  )

  onTick((elapsed, running) => {
    const mins = Math.floor(elapsed / 60)
    const secs = Math.floor(elapsed % 60)
    updateTrayTooltip(
      running ? `${mins}m ${secs}s` : 'Detenido'
    )
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.reloj.app')
  initDatabase()
  initSettings()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else mainWindow?.show()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  isQuitting = true
  destroyTray()
})
