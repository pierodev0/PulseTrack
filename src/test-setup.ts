import { vi } from 'vitest'

const testDir = vi.hoisted(() => {
  const { mkdtempSync } = require('fs')
  const { join } = require('path')
  const { tmpdir } = require('os')
  return mkdtempSync(join(tmpdir(), 'reloj-test-'))
})

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => testDir)
  },
  ipcMain: {
    handle: vi.fn()
  },
  BrowserWindow: vi.fn()
}))
