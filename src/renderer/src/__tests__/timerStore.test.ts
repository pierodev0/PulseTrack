import { describe, it, expect } from 'vitest'
import {
  getState,
  setElapsed,
  setRunning,
  setSelectedApp,
  setHistory,
  setStats,
  setPipActive,
  setPipStyle,
  setCustomColors,
  resetTimer,
  getEffectivePipBg,
  getEffectivePipText,
  getEffectivePipBorder,
  setSessionTick,
  setRecentSessions,
  setSessionLoading,
  setLapCount,
  setLaps,
  setTimerTick,
  PIP_STYLES,
  PIP_STYLE_LIST
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

  describe('session state', () => {
    it('starts with null active session, empty recent sessions, loading false', () => {
      const s = getState()
      expect(s.session.active).toBeNull()
      expect(s.session.recentSessions).toEqual([])
      expect(s.session.loading).toBe(false)
    })

    it('setSessionTick updates active session', () => {
      const data = {
        appName: 'code.exe',
        sessionId: 1,
        sessionDuration: 120.5,
        blockId: 10,
        blockLabel: 'index.ts',
        blockSource: 'auto' as const,
        blockDuration: 30.2
      }
      setSessionTick(data)
      const s = getState()
      expect(s.session.active).toEqual(data)
      expect(s.session.active?.appName).toBe('code.exe')
      expect(s.session.active?.blockLabel).toBe('index.ts')
      expect(s.session.active?.blockSource).toBe('auto')
    })

    it('setSessionTick overwrites previous active session', () => {
      setSessionTick({
        appName: 'photoshop.exe',
        sessionId: 2,
        sessionDuration: 500,
        blockId: 20,
        blockLabel: 'photo.psd',
        blockSource: 'auto',
        blockDuration: 100
      })
      const s = getState()
      expect(s.session.active?.appName).toBe('photoshop.exe')
      expect(s.session.active?.sessionId).toBe(2)
    })

    it('setRecentSessions updates session list', () => {
      const sessions = [
        {
          app_name: 'code.exe',
          id: 1,
          start_time: '2026-07-10T10:00:00.000Z',
          end_time: '2026-07-10T11:30:00.000Z',
          duration_seconds: 5400,
          status: 'closed',
          blocks: [
            {
              id: 10,
              label: 'index.ts',
              source: 'auto' as const,
              duration_seconds: 2700,
              start_time: '2026-07-10T10:00:00.000Z',
              end_time: '2026-07-10T10:45:00.000Z'
            }
          ]
        }
      ]
      setRecentSessions(sessions)
      const s = getState()
      expect(s.session.recentSessions).toHaveLength(1)
      expect(s.session.recentSessions[0].app_name).toBe('code.exe')
      expect(s.session.recentSessions[0].blocks).toHaveLength(1)
      expect(s.session.recentSessions[0].blocks[0].label).toBe('index.ts')
    })

    it('setRecentSessions overwrites previous list', () => {
      setRecentSessions([])
      expect(getState().session.recentSessions).toEqual([])
    })

    it('setSessionLoading updates loading state', () => {
      setSessionLoading(true)
      expect(getState().session.loading).toBe(true)
      setSessionLoading(false)
      expect(getState().session.loading).toBe(false)
    })

    describe('lap state', () => {
      it('starts with zero lapCount and empty laps', () => {
        const s = getState()
        expect(s.lapCount).toBe(0)
        expect(s.laps).toEqual([])
      })

      it('setLapCount updates lapCount', () => {
        setLapCount(3)
        expect(getState().lapCount).toBe(3)
      })

      it('setLaps updates laps array', () => {
        const laps = [
          { number: 1, label: 'Lap 1', duration: 30 },
          { number: 2, label: 'Lap 2', duration: 45 }
        ]
        setLaps(laps)
        expect(getState().laps).toEqual(laps)
      })

      it('setTimerTick updates elapsed, running, lapCount, and laps at once', () => {
        const tick = {
          elapsed: 120,
          running: true,
          lapCount: 2,
          laps: [
            { number: 1, label: 'Design', duration: 60 },
            { number: 2, label: 'Code', duration: 60 }
          ]
        }
        setTimerTick(tick)

        const s = getState()
        expect(s.elapsed).toBe(120)
        expect(s.running).toBe(true)
        expect(s.lapCount).toBe(2)
        expect(s.laps).toHaveLength(2)
        expect(s.laps[0].label).toBe('Design')
        expect(s.laps[1].duration).toBe(60)
      })

      it('setTimerTick with empty laps resets lap state', () => {
        setLapCount(3)
        setLaps([{ number: 1, label: 'A', duration: 10 }])

        setTimerTick({ elapsed: 0, running: false, lapCount: 0, laps: [] })

        const s = getState()
        expect(s.elapsed).toBe(0)
        expect(s.running).toBe(false)
        expect(s.lapCount).toBe(0)
        expect(s.laps).toEqual([])
      })
    })

    it('session state persists alongside existing timer state', () => {
      // Block: fixture to set active session
      setSessionTick({
        appName: 'code.exe',
        sessionId: 5,
        sessionDuration: 60,
        blockId: 50,
        blockLabel: 'main.ts',
        blockSource: 'manual',
        blockDuration: 30
      })
      setElapsed(999)

      const s = getState()
      expect(s.session.active?.appName).toBe('code.exe')
      expect(s.elapsed).toBe(999)
      expect(s.running).toBe(false)
    })
  })
})
