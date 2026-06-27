import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { app } from 'electron'

import { initSettings, getSettings, setSettings } from '../settings'

describe('settings', () => {
  let testDir: string

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'reloj-settings-test-'))
    vi.mocked(app.getPath).mockReturnValue(testDir)
    initSettings()
  })

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  it('uses defaults when no file exists', () => {
    const s = getSettings()
    expect(s.pipStyle).toBe('transparent')
    expect(s.customColors.bg).toBe('#1e1e2e')
    expect(s.customColors.text).toBe('#ffffff')
    expect(s.customColors.border).toBe('#334155')
  })

  it('setSettings merges partial values', () => {
    const result = setSettings({ pipStyle: 'dark' })
    expect(result.pipStyle).toBe('dark')
    // customColors should still be defaults
    expect(result.customColors.bg).toBe('#1e1e2e')
  })

  it('setSettings persists to disk', () => {
    setSettings({ pipStyle: 'amber' })

    // re-init to read from disk
    initSettings()
    const s = getSettings()
    expect(s.pipStyle).toBe('amber')
  })

  it('setSettings replaces customColors entirely', () => {
    setSettings({
      customColors: { bg: '#000000', text: '#ffffff', border: '#ff0000' }
    })

    const s = getSettings()
    expect(s.customColors.bg).toBe('#000000')
    expect(s.customColors.border).toBe('#ff0000')
  })

  it('getSettings returns a copy, not internal reference', () => {
    const a = getSettings()
    const b = getSettings()
    expect(a).not.toBe(b)
  })

  it('loads saved settings from disk on init', () => {
    setSettings({ pipStyle: 'green' })

    // simulate fresh init (new test dir)
    initSettings()
    expect(getSettings().pipStyle).toBe('green')
  })
})
