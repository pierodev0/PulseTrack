import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

import type { TitleRule } from './title-cleaner'

export interface CustomColors {
  bg: string
  text: string
  border: string
}

export interface AppSettings {
  pipStyle: string
  customColors: CustomColors
  titleRules: Record<string, TitleRule[]>
}

const defaults: AppSettings = {
  pipStyle: 'transparent',
  customColors: { bg: '#1e1e2e', text: '#ffffff', border: '#334155' },
  titleRules: {}
}

let settings: AppSettings = { ...defaults }
let settingsPath: string

export function initSettings(): void {
  settingsPath = join(app.getPath('userData'), 'settings.json')
  if (existsSync(settingsPath)) {
    try {
      const raw = readFileSync(settingsPath, 'utf-8')
      settings = { ...defaults, ...JSON.parse(raw) }
    } catch {
      settings = { ...defaults }
    }
  } else {
    settings = { ...defaults }
  }
}

export function getSettings(): AppSettings {
  return { ...settings }
}

export function setSettings(partial: Partial<AppSettings>): AppSettings {
  settings = { ...settings, ...partial }
  try {
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
  } catch {
    // silent
  }
  return { ...settings }
}
