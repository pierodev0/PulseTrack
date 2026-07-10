import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { app } from 'electron'

import { initSettings, getSettings, setSettings } from '../settings'
import type { TitleRule } from '../title-cleaner'

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
    expect(s.pipFontSize).toEqual({ time: 24, label: 11, appName: 9 })
  })

  it('setSettings merges partial values', () => {
    const result = setSettings({ pipStyle: 'dark' })
    expect(result.pipStyle).toBe('dark')
    // customColors should still be defaults
    expect(result.customColors.bg).toBe('#1e1e2e')
    // pipFontSize should still be defaults
    expect(result.pipFontSize).toEqual({ time: 24, label: 11, appName: 9 })
  })

  it('setSettings merges pipFontSize', () => {
    const result = setSettings({ pipFontSize: { time: 28, label: 13, appName: 10 } })
    expect(result.pipFontSize.time).toBe(28)
    expect(result.pipFontSize.label).toBe(13)
    expect(result.pipFontSize.appName).toBe(10)
    // pipStyle should still be defaults
    expect(result.pipStyle).toBe('transparent')
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

  describe('titleRules', () => {
    it('defaults to empty object', () => {
      const s = getSettings()
      expect(s.titleRules).toEqual({})
    })

    it('can set and retrieve title rules', () => {
      const myRules: Record<string, TitleRule[]> = {
        photoshop: [{ pattern: '^(.+?)\\s+@.*$', replacement: '$1', enabled: true }]
      }
      const result = setSettings({ titleRules: myRules })
      expect(result.titleRules.photoshop).toHaveLength(1)
      expect(result.titleRules.photoshop[0].pattern).toBe('^(.+?)\\s+@.*$')
    })

    it('persists titleRules to disk', () => {
      const myRules: Record<string, TitleRule[]> = {
        code: [{ pattern: '^(.+?)\\s*[-–].*$', replacement: '$1', enabled: true }]
      }
      setSettings({ titleRules: myRules })

      // re-init to read from disk
      initSettings()
      const s = getSettings()
      expect(s.titleRules.code).toBeDefined()
      expect(s.titleRules.code[0].enabled).toBe(true)
    })

    it('merges titleRules with other settings', () => {
      const result = setSettings({
        pipStyle: 'dark',
        titleRules: { krita: [{ pattern: 'test', replacement: 'x', enabled: false }] }
      })
      expect(result.pipStyle).toBe('dark')
      expect(result.titleRules.krita).toHaveLength(1)
    })

    it('overwrites existing titleRules on set', () => {
      setSettings({
        titleRules: { app1: [{ pattern: 'a', replacement: 'b', enabled: true }] }
      })
      setSettings({
        titleRules: { app2: [{ pattern: 'c', replacement: 'd', enabled: true }] }
      })
      const s = getSettings()
      expect(s.titleRules.app1).toBeUndefined()
      expect(s.titleRules.app2).toBeDefined()
    })
  })
})
