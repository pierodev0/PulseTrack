import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'

vi.mock('better-sqlite3', () => {
  const tables = new Map<string, Map<number, Record<string, unknown>>>()
  let nextId = 1

  class MockStatement {
    private sql: string

    constructor(sql: string) {
      this.sql = sql.trim()
    }

    run(...args: unknown[]) {
      if (this.sql.startsWith('INSERT')) {
        const id = nextId++
        const tableName = this.extractTable()
        const table = tables.get(tableName)!
        const row: Record<string, unknown> = { id }
        // parse VALUES
        const valuesMatch = this.sql.match(/VALUES\s*\(([^)]+)\)/i)
        if (valuesMatch) {
          const cols = this.extractColumns()
          cols.forEach((col, i) => {
            row[col] = args[i]
          })
        }
        table.set(id, row)
        nextId = Math.max(nextId, id + 1)
        return { lastInsertRowid: id, changes: 1 }
      }

      if (this.sql.startsWith('UPDATE')) {
        const tableName = this.extractTable()
        const table = tables.get(tableName)!
        const setPartMatch = this.sql.match(/SET\s+(.+?)(?:\bWHERE\b|$)/is)
        const whereIdMatch = this.sql.match(/WHERE\s+id\s*=\s*\?/i)
        if (setPartMatch && whereIdMatch) {
          const assignments = setPartMatch[1].split(',').map(s => s.trim())
          const setArgsCount = (setPartMatch[1].match(/\?/g) || []).length
          const setArgs = args.slice(0, setArgsCount)
          const targetId = args[setArgsCount] as number
          const row = table.get(targetId)
          if (row) {
            assignments.forEach((a, i) => {
              const [col] = a.split('=').map(s => s.trim())
              row[col] = setArgs[i]
            })
          }
        }
        return { changes: 1 }
      }

      if (this.sql.startsWith('DELETE')) {
        const tableName = this.extractTable()
        const table = tables.get(tableName)!
        const idIndex = this.sql.match(/WHERE\s+id\s*=\s*\?\s*$/i) ? args.length - 1 : -1
        if (idIndex >= 0) {
          const targetId = args[idIndex] as number
          table.delete(targetId)
        }
        return { changes: 1 }
      }

      return { changes: 0 }
    }

    get(...args: unknown[]) {
      const tableName = this.extractTable()
      const table = tables.get(tableName)!
      if (this.sql.includes('WHERE id =')) {
        const id = args[0] as number
        return table.get(id) ?? null
      }
      // fallback: return first row
      return table.values().next().value ?? null
    }

    all(...args: unknown[]) {
      const tableName = this.extractTable()
      const table = tables.get(tableName)!
      let rows = Array.from(table.values())

      // handle ORDER BY created_at DESC
      if (this.sql.includes('ORDER BY created_at DESC')) {
        rows = rows.reverse()
      }

      // handle LIMIT
      const limitMatch = this.sql.match(/LIMIT\s+\?/i)
      if (limitMatch && args.length > 0) {
        const limit = args[0] as number
        rows = rows.slice(0, limit)
      }

      // handle GROUP BY (getStats)
      if (this.sql.includes('GROUP BY')) {
        const grouped = new Map<string, { total: number; count: number }>()
        for (const row of rows) {
          const appName = row.app_name as string
          if (!grouped.has(appName)) {
            grouped.set(appName, { total: 0, count: 0 })
          }
          const g = grouped.get(appName)!
          g.total += row.duration_seconds as number
          g.count++
        }
        return Array.from(grouped.entries())
          .map(([app_name, g]) => ({
            app_name,
            total_seconds: g.total,
            session_count: g.count
          }))
          .sort((a, b) => b.total_seconds - a.total_seconds)
      }

      return rows
    }

    private extractTable(): string {
      const match = this.sql.match(/(?:INSERT\s+INTO|FROM|UPDATE|DELETE\s+FROM)\s+(\w+)/i)
      return match?.[1] ?? 'unknown'
    }

    private extractColumns(): string[] {
      const match = this.sql.match(/INSERT\s+INTO\s+\w+\s*\(([^)]+)\)/i)
      if (!match) return []
      return match[1].split(',').map(c => c.trim())
    }
  }

  return {
    default: class Database {
      constructor(_path: string) {
        // nothing
      }
      pragma() { /* noop */ }
      exec(sql: string) {
        const tableMatch = sql.match(/CREATE TABLE IF NOT EXISTS\s+(\w+)/i)
        if (tableMatch) {
          tables.set(tableMatch[1], new Map())
        }
      }
      prepare(sql: string) {
        return new MockStatement(sql)
      }
      close() { /* noop */ }
    }
  }
})

import { initDatabase, saveSession, getHistory, updateSession, deleteSession, getStats } from '../database'
import type { Session, AppStats } from '../database'

describe('database', () => {
  beforeAll(() => {
    initDatabase()
  })

  afterAll(() => {
    const all = getHistory(1000) as Session[]
    for (const s of all) {
      deleteSession(s.id)
    }
  })

  it('saves and retrieves a session', () => {
    const saved = saveSession('Code.exe', '2026-06-27T12:00:00Z', 120) as Session
    expect(saved.id).toBeGreaterThan(0)
    expect(saved.app_name).toBe('Code.exe')
    expect(saved.duration_seconds).toBe(120)

    const history = getHistory(10) as Session[]
    const found = history.find((s: Session) => s.id === saved.id)
    expect(found).toBeDefined()
    expect(found!.app_name).toBe('Code.exe')
  })

  it('getHistory respects limit', () => {
    const limited = getHistory(1) as Session[]
    expect(limited.length).toBeLessThanOrEqual(1)
  })

  it('updateSession modifies duration', () => {
    const saved = saveSession('Update.exe', '2026-06-27T12:00:00Z', 100) as Session
    updateSession(saved.id, 200)

    const history = getHistory(100) as Session[]
    const updated = history.find((s: Session) => s.id === saved.id)!
    expect(updated.duration_seconds).toBe(200)
  })

  it('deleteSession removes a record', () => {
    const saved = saveSession('Delete.exe', '2026-06-27T12:00:00Z', 50) as Session
    deleteSession(saved.id)

    const history = getHistory(100) as Session[]
    const found = history.find((s: Session) => s.id === saved.id)
    expect(found).toBeUndefined()
  })

  it('getStats aggregates sessions by app', () => {
    saveSession('StatsApp.exe', '2026-06-27T12:00:00Z', 100)
    saveSession('StatsApp.exe', '2026-06-27T13:00:00Z', 200)

    const stats = getStats() as AppStats[]
    const entry = stats.find((s: AppStats) => s.app_name === 'StatsApp.exe')
    expect(entry).toBeDefined()
    expect(entry!.total_seconds).toBe(300)
    expect(entry!.session_count).toBeGreaterThanOrEqual(2)
  })
})
