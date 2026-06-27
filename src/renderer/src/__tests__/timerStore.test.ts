import { describe, it, expect } from 'vitest'
import {
  getState, setElapsed, setRunning, setSelectedApp,
  setHistory, setStats, setPipActive, setPipStyle, setCustomColors,
  resetTimer, getEffectivePipBg, getEffectivePipText, getEffectivePipBorder,
  PIP_STYLES, PIP_STYLE_LIST
} from '../timerStore.svelte.ts'

describe('timerStore', () => {
  it('starts with default state', () => {
    const s = getState()
    expect(s.elapsed).toBe(0)
    expect(s.running).toBe(false)
    expect(s.selectedApp).toBe('')
    expect(s.history).toEqual([])
    expect(s.stats).toEqual([])
    expect(s.pipActive).toBe(false)
    expect(s.pipStyle).toBe('transparent')
    expect(s.customColors).toEqual({ bg: '#1e1e2e', text: '#ffffff', border: '#334155' })
  })

  it('setElapsed updates elapsed', () => {
    setElapsed(42)
    expect(getState().elapsed).toBe(42)
  })

  it('setRunning updates running', () => {
    setRunning(true)
    expect(getState().running).toBe(true)
    setRunning(false)
    expect(getState().running).toBe(false)
  })

  it('setSelectedApp updates app', () => {
    setSelectedApp('Code.exe')
    expect(getState().selectedApp).toBe('Code.exe')
  })

  it('setHistory updates history', () => {
    const data = [{ id: 1, app_name: 'Code.exe' }]
    setHistory(data)
    expect(getState().history).toBe(data)
  })

  it('setStats updates stats', () => {
    const data = [{ app_name: 'Code.exe', total_seconds: 100 }]
    setStats(data)
    expect(getState().stats).toBe(data)
  })

  it('setPipActive updates pipActive', () => {
    setPipActive(true)
    expect(getState().pipActive).toBe(true)
  })

  it('setPipStyle updates style', () => {
    setPipStyle('dark')
    expect(getState().pipStyle).toBe('dark')
  })

  it('setCustomColors updates colors', () => {
    const colors = { bg: '#000', text: '#fff', border: '#f00' }
    setCustomColors(colors)
    expect(getState().customColors).toBe(colors)
  })

  it('resetTimer clears state', () => {
    setElapsed(100)
    setRunning(true)
    setSelectedApp('Code.exe')
    resetTimer()
    const s = getState()
    expect(s.elapsed).toBe(0)
    expect(s.running).toBe(false)
    expect(s.selectedApp).toBe('')
  })

  it('getEffectivePipBg returns custom color or empty', () => {
    setPipStyle('transparent')
    expect(getEffectivePipBg()).toBe('')
    setPipStyle('custom')
    setCustomColors({ bg: '#ff0000', text: '#fff', border: '#000' })
    expect(getEffectivePipBg()).toBe('#ff0000')
  })

  it('getEffectivePipText returns custom color or empty', () => {
    setPipStyle('transparent')
    expect(getEffectivePipText()).toBe('')
    setPipStyle('custom')
    setCustomColors({ bg: '#000', text: '#ff0000', border: '#000' })
    expect(getEffectivePipText()).toBe('#ff0000')
  })

  it('getEffectivePipBorder returns custom color or empty', () => {
    setPipStyle('transparent')
    expect(getEffectivePipBorder()).toBe('')
    setPipStyle('custom')
    setCustomColors({ bg: '#000', text: '#fff', border: '#ff0000' })
    expect(getEffectivePipBorder()).toBe('#ff0000')
  })

  it('PIP_STYLES has all presets', () => {
    for (const style of PIP_STYLE_LIST) {
      if (style === 'custom') continue
      expect(PIP_STYLES[style]).toBeDefined()
      expect(PIP_STYLES[style].label).toBeTruthy()
      expect(PIP_STYLES[style].bg).toMatch(/^bg-/)
    }
  })
})
