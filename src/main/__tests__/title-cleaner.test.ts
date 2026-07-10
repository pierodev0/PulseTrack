import { describe, it, expect } from 'vitest'
import { createTitleCleaner, getDefaultRules } from '../title-cleaner'
import type { TitleRule } from '../title-cleaner'

describe('title-cleaner', () => {
  describe('getDefaultRules', () => {
    it('returns rules for all five priority apps', () => {
      const rules = getDefaultRules()
      expect(Object.keys(rules).sort()).toEqual([
        'chrome',
        'clipstudio',
        'code',
        'firefox',
        'krita',
        'photoshop'
      ])
    })

    it('photoshop rule strips @ N% (mode) suffix', () => {
      const rules = getDefaultRules()
      const clean = createTitleCleaner(rules)
      expect(clean('photoshop.exe', 'foto.psd @ 100% (RGB/8)')).toBe('foto.psd')
    })

    it('photoshop rule handles no suffix', () => {
      const rules = getDefaultRules()
      const clean = createTitleCleaner(rules)
      expect(clean('photoshop.exe', 'foto.psd')).toBe('foto.psd')
    })

    it('vscode rule strips leading ● or * and trailing app suffix', () => {
      const rules = getDefaultRules()
      const clean = createTitleCleaner(rules)
      expect(clean('Code.exe', '● timerStore.svelte.ts — reloj — Visual Studio Code')).toBe(
        'timerStore.svelte.ts'
      )
    })

    it('vscode rule with asterisk still strips', () => {
      const rules = getDefaultRules()
      const clean = createTitleCleaner(rules)
      expect(clean('Code.exe', '* index.ts — Visual Studio Code')).toBe('index.ts')
    })

    it('vscode rule extracts basename from full path', () => {
      const rules = getDefaultRules()
      const clean = createTitleCleaner(rules)
      expect(clean('Code.exe', 'C:\\Users\\test\\file.ts — Visual Studio Code')).toBe('file.ts')
    })

    it('chrome rule strips suffix', () => {
      const rules = getDefaultRules()
      const clean = createTitleCleaner(rules)
      expect(clean('chrome.exe', 'GitHub — Google Chrome')).toBe('GitHub')
    })

    it('firefox rule strips suffix', () => {
      const rules = getDefaultRules()
      const clean = createTitleCleaner(rules)
      expect(clean('firefox.exe', 'GitHub — Mozilla Firefox')).toBe('GitHub')
    })

    it('clipstudio returns raw title trimmed', () => {
      const rules = getDefaultRules()
      const clean = createTitleCleaner(rules)
      expect(clean('ClipStudioPaint.exe', '  sketch  ')).toBe('sketch')
    })

    it('krita returns raw title trimmed', () => {
      const rules = getDefaultRules()
      const clean = createTitleCleaner(rules)
      expect(clean('krita.exe', 'painting.psd @ 50%')).toBe('painting.psd @ 50%')
    })
  })

  describe('custom rules', () => {
    const customRules: Record<string, TitleRule[]> = {
      myapp: [{ pattern: '^(.+?)\\s*[-–]\\s*MyApp$', replacement: '$1', enabled: true }]
    }

    it('applies matching enabled rule', () => {
      const clean = createTitleCleaner(customRules)
      expect(clean('myapp.exe', 'my file - MyApp')).toBe('my file')
    })

    it('falls back to raw title when no rule matches', () => {
      const clean = createTitleCleaner(customRules)
      expect(clean('myapp.exe', 'Some Random App — Untitled')).toBe('Some Random App — Untitled')
    })

    it('falls back to raw title when app has no registered rules', () => {
      const clean = createTitleCleaner(customRules)
      expect(clean('unknown.exe', 'Something')).toBe('Something')
    })

    it('disabled rules are skipped', () => {
      const rulesWithDisabled: Record<string, TitleRule[]> = {
        myapp: [
          { pattern: '^(.+?)\\s*[-–]\\s*Suffix$', replacement: '$1', enabled: false },
          { pattern: '^(.+?)\\s*[-–]\\s*Other$', replacement: '$1', enabled: true }
        ]
      }
      const clean = createTitleCleaner(rulesWithDisabled)
      expect(clean('myapp.exe', 'test - Other')).toBe('test')
    })

    it('disabled rule does not match even if pattern would', () => {
      const rulesWithDisabled: Record<string, TitleRule[]> = {
        myapp: [{ pattern: '^(.+?)\\s*[-–]\\s*Suffix$', replacement: '$1', enabled: false }]
      }
      const clean = createTitleCleaner(rulesWithDisabled)
      expect(clean('myapp.exe', 'test - Suffix')).toBe('test - Suffix')
    })

    it('trims whitespace from result', () => {
      const rules: Record<string, TitleRule[]> = {
        myapp: [{ pattern: '^\\s*(.+?)\\s*$', replacement: '$1', enabled: true }]
      }
      const clean = createTitleCleaner(rules)
      expect(clean('myapp.exe', '  spaced  ')).toBe('spaced')
    })

    it('handles empty raw title', () => {
      const clean = createTitleCleaner({})
      expect(clean('any.exe', '')).toBe('')
    })

    it('normalizes app name (lowercase, strip .exe)', () => {
      const rules: Record<string, TitleRule[]> = {
        code: [{ pattern: '^(.+?)\\s*[-–]\\s*Suffix$', replacement: '$1', enabled: true }]
      }
      const clean = createTitleCleaner(rules)
      expect(clean('Code.exe', 'test - Suffix')).toBe('test')
      expect(clean('code', 'test - Suffix')).toBe('test')
      expect(clean('CODE.EXE', 'test - Suffix')).toBe('test')
    })

    it('first matching rule wins (order matters)', () => {
      const rules: Record<string, TitleRule[]> = {
        myapp: [
          { pattern: '^Winning\\s*[-–]\\s*Suffix$', replacement: 'winner', enabled: true },
          { pattern: '^Winning\\s*[-–]\\s*Suffix$', replacement: 'loser', enabled: true }
        ]
      }
      const clean = createTitleCleaner(rules)
      expect(clean('myapp.exe', 'Winning - Suffix')).toBe('winner')
    })

    it('extracts basename from Unix-style path', () => {
      const rules: Record<string, TitleRule[]> = {
        code: [
          {
            pattern: '^(.+?)\\s*[—–-]\\s+.*Visual\\s+Studio\\s+Code\\s*$',
            replacement: '$1',
            enabled: true
          }
        ]
      }
      const clean = createTitleCleaner(rules)
      expect(clean('code', '/home/user/project/file.ts — Visual Studio Code')).toBe('file.ts')
    })

    it('normalizes .app suffix same as .exe', () => {
      const rules: Record<string, TitleRule[]> = {
        code: [{ pattern: '^(.+?)\\s*[—–-]\\s+Suffix$', replacement: '$1', enabled: true }]
      }
      const clean = createTitleCleaner(rules)
      expect(clean('Code.app', 'test - Suffix')).toBe('test')
    })

    it('raw title with regex special characters does not crash', () => {
      const clean = createTitleCleaner({})
      expect(clean('any.exe', 'file (1) [test] + $ ^ . * ?')).toBe('file (1) [test] + $ ^ . * ?')
    })

    it('applies rule only to matching raw title, does not corrupt non-match', () => {
      const rules: Record<string, TitleRule[]> = {
        myapp: [{ pattern: '^(.+?)\\.txt$', replacement: '$1', enabled: true }]
      }
      const clean = createTitleCleaner(rules)
      expect(clean('myapp.exe', 'document.txt')).toBe('document')
      expect(clean('myapp.exe', 'document.pdf')).toBe('document.pdf')
    })
  })
})
