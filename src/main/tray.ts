import { Menu, nativeImage, Tray } from 'electron'
import { join } from 'path'

let tray: Tray | null = null

export function createTray(
  onShow: () => void,
  onQuit: () => void
): void {
  const iconPath = join(__dirname, '../../resources/icon.png')
  const icon = nativeImage.createFromPath(iconPath)
  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Mostrar',
      click: onShow
    },
    {
      label: 'Salir',
      click: onQuit
    }
  ])

  tray.setToolTip('Reloj - Temporizador de actividad')
  tray.setContextMenu(contextMenu)
  tray.on('double-click', onShow)
}

export function updateTrayTooltip(text: string): void {
  if (tray) {
    tray.setToolTip(`Reloj - ${text}`)
  }
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
