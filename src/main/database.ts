import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

export interface Session {
  id: number
  app_name: string
  start_time: string
  duration_seconds: number
  created_at: string
}

export interface AppStats {
  app_name: string
  total_seconds: number
  session_count: number
}

let db: Database.Database

export function initDatabase(): void {
  const dbPath = join(app.getPath('userData'), 'sessions.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      duration_seconds REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
}

export function saveSession(
  appName: string,
  startTime: string,
  durationSeconds: number
): Session {
  const stmt = db.prepare(
    'INSERT INTO sessions (app_name, start_time, duration_seconds) VALUES (?, ?, ?)'
  )
  const info = stmt.run(appName, startTime, durationSeconds)
  return db
    .prepare('SELECT * FROM sessions WHERE id = ?')
    .get(info.lastInsertRowid) as Session
}

export function getHistory(limit = 50): Session[] {
  return db
    .prepare('SELECT * FROM sessions ORDER BY created_at DESC LIMIT ?')
    .all(limit) as Session[]
}

export function updateSession(id: number, durationSeconds: number): void {
  db.prepare('UPDATE sessions SET duration_seconds = ? WHERE id = ?').run(
    durationSeconds,
    id
  )
}

export function deleteSession(id: number): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id)
}

export function getStats(): AppStats[] {
  return db
    .prepare(
      `SELECT app_name, SUM(duration_seconds) as total_seconds, COUNT(*) as session_count
       FROM sessions GROUP BY app_name ORDER BY total_seconds DESC`
    )
    .all() as AppStats[]
}
