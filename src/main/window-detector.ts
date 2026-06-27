import { activeWindow, openWindows } from 'get-windows'

export interface WindowInfo {
  title: string
  id: number
  app: string
  path: string
}

export async function getActiveApp(): Promise<WindowInfo | null> {
  try {
    const win = await activeWindow()
    if (!win) return null
    return {
      title: win.title,
      id: win.id,
      app: win.owner.name,
      path: win.owner.path
    }
  } catch {
    return null
  }
}

export async function listOpenWindows(): Promise<WindowInfo[]> {
  try {
    const wins = await openWindows()
    return wins
      .map((win) => ({
        title: win.title,
        id: win.id,
        app: win.owner.name,
        path: win.owner.path
      }))
      .filter((w) => w.title && w.app)
  } catch {
    return []
  }
}
