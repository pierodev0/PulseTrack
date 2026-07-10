import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

export interface AppSession {
  id: number
  app_name: string
  start_time: string
  end_time: string | null
  duration_seconds: number
  status: 'active' | 'closed' | 'crashed'
  created_at: string
}

export interface TimeBlock {
  id: number
  session_id: number
  app_name: string
  label: string
  raw_title: string | null
  source: 'auto' | 'manual'
  start_time: string
  end_time: string | null
  duration_seconds: number
  status: 'active' | 'closed'
}

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

export interface Heartbeat {
  id: number
  app_name: string
  window_title: string | null
  timestamp: string
  duration_ms: number
}

export interface HeartbeatStats {
  app_name: string
  total_seconds: number
  heartbeat_count: number
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
  db.exec(`
    CREATE TABLE IF NOT EXISTS heartbeats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_name TEXT NOT NULL,
      window_title TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      duration_ms INTEGER NOT NULL
    )
  `)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_heartbeats_app
    ON heartbeats (app_name)
  `)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_heartbeats_timestamp
    ON heartbeats (timestamp)
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration_seconds REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS time_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES app_sessions(id),
      app_name TEXT NOT NULL,
      label TEXT NOT NULL,
      raw_title TEXT,
      source TEXT NOT NULL CHECK(source IN ('auto', 'manual')),
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration_seconds REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active'
    )
  `)
}

export function saveSession(appName: string, startTime: string, durationSeconds: number): Session {
  const stmt = db.prepare(
    'INSERT INTO sessions (app_name, start_time, duration_seconds) VALUES (?, ?, ?)'
  )
  const info = stmt.run(appName, startTime, durationSeconds)
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(info.lastInsertRowid) as Session
}

export function getHistory(limit = 50): Session[] {
  return db
    .prepare('SELECT * FROM sessions ORDER BY created_at DESC LIMIT ?')
    .all(limit) as Session[]
}

export function updateSession(id: number, durationSeconds: number): void {
  db.prepare('UPDATE sessions SET duration_seconds = ? WHERE id = ?').run(durationSeconds, id)
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

export function saveHeartbeat(
  appName: string,
  windowTitle: string | null,
  durationMs: number
): Heartbeat {
  const stmt = db.prepare(
    'INSERT INTO heartbeats (app_name, window_title, duration_ms) VALUES (?, ?, ?)'
  )
  const info = stmt.run(appName, windowTitle, durationMs)
  return db.prepare('SELECT * FROM heartbeats WHERE id = ?').get(info.lastInsertRowid) as Heartbeat
}

export function getHeartbeatStats(from?: string, to?: string): HeartbeatStats[] {
  let sql = `
    SELECT app_name, SUM(duration_ms) / 1000.0 as total_seconds, COUNT(*) as heartbeat_count
    FROM heartbeats
  `
  const params: string[] = []
  const conditions: string[] = []

  if (from) {
    conditions.push('timestamp >= ?')
    params.push(from)
  }
  if (to) {
    conditions.push('timestamp <= ?')
    params.push(to)
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ')
  }

  sql += ' GROUP BY app_name ORDER BY total_seconds DESC'

  return db.prepare(sql).all(...params) as HeartbeatStats[]
}

export function getHeartbeatTimeline(from?: string, to?: string): Heartbeat[] {
  let sql = 'SELECT * FROM heartbeats'
  const params: string[] = []
  const conditions: string[] = []

  if (from) {
    conditions.push('timestamp >= ?')
    params.push(from)
  }
  if (to) {
    conditions.push('timestamp <= ?')
    params.push(to)
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ')
  }

  sql += ' ORDER BY timestamp DESC'

  return db.prepare(sql).all(...params) as Heartbeat[]
}

// App Session CRUD

export function createSession(appName: string, startTime: string): AppSession {
  const stmt = db.prepare(
    'INSERT INTO app_sessions (app_name, start_time, duration_seconds, status, end_time) VALUES (?, ?, ?, ?, ?)'
  )
  const info = stmt.run(appName, startTime, 0, 'active', null)
  return db
    .prepare('SELECT * FROM app_sessions WHERE id = ?')
    .get(info.lastInsertRowid) as AppSession
}

export function closeSession(id: number, endTime: string, durationSeconds: number): void {
  db.prepare(
    'UPDATE app_sessions SET end_time = ?, duration_seconds = ?, status = ? WHERE id = ?'
  ).run(endTime, durationSeconds, 'closed', id)
}

export function updateSessionDuration(id: number, durationSeconds: number): void {
  db.prepare('UPDATE app_sessions SET duration_seconds = ? WHERE id = ?').run(durationSeconds, id)
}

export function reopenSession(id: number): void {
  db.prepare('UPDATE app_sessions SET end_time = NULL, status = ? WHERE id = ?').run('active', id)
}

export function renameSession(id: number, newName: string): void {
  db.prepare('UPDATE app_sessions SET app_name = ? WHERE id = ?').run(newName, id)
}

export function getActiveSessions(): AppSession[] {
  return db.prepare('SELECT * FROM app_sessions WHERE status = ?').all('active') as AppSession[]
}

// Time Block CRUD

export function createBlock(
  sessionId: number,
  appName: string,
  label: string,
  rawTitle: string | null,
  source: 'auto' | 'manual',
  startTime: string
): TimeBlock {
  const stmt = db.prepare(
    'INSERT INTO time_blocks (session_id, app_name, label, raw_title, source, start_time, duration_seconds, status, end_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  )
  const info = stmt.run(sessionId, appName, label, rawTitle, source, startTime, 0, 'active', null)
  return db.prepare('SELECT * FROM time_blocks WHERE id = ?').get(info.lastInsertRowid) as TimeBlock
}

export function closeBlock(id: number, endTime: string, durationSeconds: number): void {
  db.prepare(
    'UPDATE time_blocks SET end_time = ?, duration_seconds = ?, status = ? WHERE id = ?'
  ).run(endTime, durationSeconds, 'closed', id)
}

export function updateBlockDuration(id: number, durationSeconds: number): void {
  db.prepare('UPDATE time_blocks SET duration_seconds = ? WHERE id = ?').run(durationSeconds, id)
}

export function renameBlock(id: number, label: string): void {
  db.prepare('UPDATE time_blocks SET label = ? WHERE id = ?').run(label, id)
}

export function getSessionBlocks(sessionId: number): TimeBlock[] {
  return db
    .prepare('SELECT * FROM time_blocks WHERE session_id = ? ORDER BY start_time ASC')
    .all(sessionId) as TimeBlock[]
}

export function getRecentSessions(
  limit = 50,
  appName?: string
): (AppSession & { blocks: TimeBlock[] })[] {
  let sql = 'SELECT * FROM app_sessions WHERE status = ?'
  const params: (string | number)[] = ['closed']

  if (appName) {
    sql += ' AND app_name = ?'
    params.push(appName)
  }

  sql += ' ORDER BY created_at DESC LIMIT ?'
  params.push(limit)

  const sessions = db.prepare(sql).all(...params) as AppSession[]

  return sessions.map((s) => ({
    ...s,
    blocks: getSessionBlocks(s.id)
  }))
}
