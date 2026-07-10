export interface TitleRule {
  pattern: string
  replacement: string
  enabled: boolean
}

export type CleanTitleFn = (appName: string, rawTitle: string) => string

export function createTitleCleaner(rules: Record<string, TitleRule[]>): CleanTitleFn {
  return (appName: string, rawTitle: string): string => {
    const normalizedApp = appName.toLowerCase().replace(/\.(exe|app)$/i, '')

    const appRules = rules[normalizedApp]
    if (!appRules) {
      return rawTitle.trim()
    }

    let current = rawTitle

    for (const rule of appRules) {
      if (!rule.enabled) continue

      const regex = new RegExp(rule.pattern)
      const result = current.replace(regex, rule.replacement)

      if (result !== current) {
        current = result
        break
      }
    }

    // Post-process: if result looks like an absolute path, extract basename
    const pathSeparator = current.includes('\\') ? '\\' : current.includes('/') ? '/' : null
    if (pathSeparator) {
      const segments = current.split(pathSeparator)
      current = segments[segments.length - 1]
    }

    return current.trim()
  }
}

export function getDefaultRules(): Record<string, TitleRule[]> {
  return {
    photoshop: [
      { pattern: '^(.+?)\\s+@\\s+\\d+%\\s*\\([^)]*\\)\\s*$', replacement: '$1', enabled: true }
    ],
    code: [
      {
        pattern: '^[●*]\\s*(.+?)\\s*[—–-]\\s+.*Visual\\s+Studio\\s+Code\\s*$',
        replacement: '$1',
        enabled: true
      },
      {
        pattern: '^(.+?)\\s*[—–-]\\s+.*Visual\\s+Studio\\s+Code\\s*$',
        replacement: '$1',
        enabled: true
      }
    ],
    chrome: [
      { pattern: '^(.+?)\\s*[—–-]\\s+Google\\s+Chrome\\s*$', replacement: '$1', enabled: true }
    ],
    firefox: [
      { pattern: '^(.+?)\\s*[—–-]\\s+Mozilla\\s+Firefox\\s*$', replacement: '$1', enabled: true }
    ],
    clipstudio: [],
    krita: []
  }
}
