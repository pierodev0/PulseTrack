<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import AppList from './AppList.svelte'
  import TimerDisplay from './TimerDisplay.svelte'
  import Dashboard from './Dashboard.svelte'
  import History from './History.svelte'
  import EditModal from './EditModal.svelte'
  import Settings from './Settings.svelte'
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
    setHeartbeatActive,
    setHeartbeatTick,
    setTimerTick,
    PIP_STYLES
  } from './timerStore.svelte.ts'
  import type { WindowInfo } from '../../main/window-detector'
  import type { HeartbeatTick } from '../../main/heartbeat'
  import Play from '@lucide/svelte/icons/play'
  import Pause from '@lucide/svelte/icons/pause'
  import Square from '@lucide/svelte/icons/square'
  import Flag from '@lucide/svelte/icons/flag'
  import PictureInPicture2 from '@lucide/svelte/icons/picture-in-picture-2'

  let apps = $state<WindowInfo[]>([])
  let selectedHistoryItem = $state<{ id: number; duration_seconds: number } | null>(null)
  let showEditModal = $state(false)
  let cleanupTick: (() => void) | null = null
  let cleanupSettings: (() => void) | null = null
  let cleanupFocus: (() => void) | null = null
  let cleanupMode: (() => void) | null = null
  let cleanupHeartbeat: (() => void) | null = null
  let currentTab = $state<'timer' | 'history' | 'settings' | 'dashboard'>('timer')

  const isPipMode = $derived(getState().pipActive)

  async function loadApps(): Promise<void> {
    const result = await window.electronAPI.getActiveApps()
    apps = result as WindowInfo[]
  }

  async function handleSelectApp(appName: string): Promise<void> {
    setSelectedApp(appName)
  }

  async function handlePlayPause(): Promise<void> {
    const s = getState()
    if (s.running) {
      const result = await window.electronAPI.pauseTimer()
      setRunning(result.running)
    } else if (s.elapsed > 0) {
      const result = await window.electronAPI.resumeTimer()
      setRunning(result.running)
    } else {
      if (!s.selectedApp) return
      await window.electronAPI.startTimer(s.selectedApp)
      setRunning(true)
      setElapsed(0)
    }
  }

  async function handleReset(): Promise<void> {
    const s = getState()
    if (s.elapsed === 0 && !s.running) return
    const result = await window.electronAPI.stopTimer()
    setRunning(false)
    if (result.session) {
      await loadHistory()
      await loadStats()
    }
  }

  async function loadHistory(): Promise<void> {
    const h = await window.electronAPI.getHistory()
    setHistory(h)
  }

  async function loadStats(): Promise<void> {
    const s = await window.electronAPI.getStats()
    setStats(s)
  }

  function handleEdit(item: { id: number; duration_seconds: number }): void {
    selectedHistoryItem = item
    showEditModal = true
  }

  async function handleSaveEdit(durationSeconds: number): Promise<void> {
    if (!selectedHistoryItem) return
    await window.electronAPI.editRecord({
      id: selectedHistoryItem.id,
      durationSeconds
    })
    showEditModal = false
    selectedHistoryItem = null
    await loadHistory()
  }

  async function handleDelete(id: number): Promise<void> {
    await window.electronAPI.deleteRecord(id)
    await loadHistory()
    await loadStats()
  }

  async function handleLap(): Promise<void> {
    await window.electronAPI.lapTimer()
  }

  async function handleToggleHeartbeat(): Promise<void> {
    const s = getState()
    if (s.heartbeat.active) {
      const result = await window.electronAPI.stopHeartbeat()
      setHeartbeatActive(result.running)
    } else {
      const result = await window.electronAPI.startHeartbeat()
      setHeartbeatActive(result.running)
    }
  }

  async function handleTogglePip(): Promise<void> {
    const active = await window.electronAPI.togglePip()
    setPipActive(active)
  }

  async function checkPipStatus(): Promise<void> {
    const active = await window.electronAPI.getPipStatus()
    setPipActive(active)
  }

  async function loadSettings(): Promise<void> {
    const s = await window.electronAPI.getSettings()
    setPipStyle(
      s.pipStyle as 'transparent' | 'dark' | 'light' | 'green' | 'blue' | 'amber' | 'custom'
    )
    setCustomColors(s.customColors)
  }

  onMount(() => {
    loadSettings()
    loadApps()
    loadHistory()
    loadStats()
    checkPipStatus()

    cleanupSettings = window.electronAPI.onSettingsChanged((data) => {
      const d = data as {
        pipStyle?: string
        customColors?: { bg: string; text: string; border: string }
      }
      if (d.pipStyle)
        setPipStyle(
          d.pipStyle as 'transparent' | 'dark' | 'light' | 'green' | 'blue' | 'amber' | 'custom'
        )
      if (d.customColors) setCustomColors(d.customColors)
    })

    cleanupTick = window.electronAPI.onTimerTick((data) => {
      setTimerTick(data)
    })

    cleanupFocus = window.electronAPI.onWindowFocus(() => {
      loadApps()
    })

    cleanupMode = window.electronAPI.onModeChange((isPip) => {
      setPipActive(isPip)
      if (!isPip) {
        loadApps()
        loadHistory()
        loadStats()
      }
    })

    cleanupHeartbeat = window.electronAPI.onHeartbeatTick((data: HeartbeatTick) => {
      setHeartbeatTick(data)
    })
  })

  onDestroy(() => {
    cleanupTick?.()
    cleanupSettings?.()
    cleanupFocus?.()
    cleanupMode?.()
    cleanupHeartbeat?.()
  })
</script>

{#if isPipMode}
  <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
  <div
    class={'flex flex-col items-center justify-center h-screen select-none rounded-lg' +
      (getState().pipStyle !== 'custom' && PIP_STYLES[getState().pipStyle]
        ? ' ' +
          PIP_STYLES[getState().pipStyle].bg +
          ' ' +
          PIP_STYLES[getState().pipStyle].text +
          ' ' +
          PIP_STYLES[getState().pipStyle].border +
          ' border'
        : '')}
    style={getState().pipStyle === 'custom'
      ? `background-color: ${getState().customColors.bg}; color: ${getState().customColors.text}; border-color: ${getState().customColors.border}; border-width: 1px;`
      : ''}
  >
    <div
      style="-webkit-app-region: drag"
      class="flex flex-col items-center justify-center w-full h-full px-3 py-2"
    >
      <TimerDisplay pip />

      <div
        class="flex items-center gap-3 mt-1"
        style="-webkit-app-region: no-drag"
        class:opacity-80={getState().pipStyle !== 'custom'}
      >
        <button
          onclick={handlePlayPause}
          disabled={!getState().selectedApp && getState().elapsed === 0}
          class="disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-not-allowed"
          style={getState().pipStyle === 'custom'
            ? `color: ${getState().customColors.text}cc`
            : 'color: rgba(255,255,255,0.8)'}
          title={getState().running ? 'Pausar' : 'Iniciar'}
        >
          {#if getState().running}
            <Pause size={14} />
          {:else}
            <Play size={14} />
          {/if}
        </button>

        {#if getState().running}
          <button
            onclick={handleLap}
            class="transition-colors cursor-pointer"
            style={getState().pipStyle === 'custom'
              ? `color: ${getState().customColors.text}cc`
              : 'color: rgba(255,255,255,0.8)'}
            title="Vuelta"
          >
            <Flag size={14} />
          </button>
        {/if}

        <button
          onclick={handleReset}
          disabled={getState().elapsed === 0 && !getState().running}
          class="disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-not-allowed"
          style={getState().pipStyle === 'custom'
            ? `color: ${getState().customColors.text}cc`
            : 'color: rgba(255,255,255,0.8)'}
          title="Reiniciar"
        >
          <Square size={14} />
        </button>

        <button
          onclick={handleTogglePip}
          class="transition-colors cursor-pointer"
          style={getState().pipStyle === 'custom'
            ? `color: ${getState().customColors.text}88`
            : 'color: rgba(255,255,255,0.6)'}
          title="Salir de PiP"
        >
          <PictureInPicture2 size={14} />
        </button>
      </div>
    </div>
  </div>
{:else}
  <div class="min-h-screen bg-zinc-950 text-zinc-100 p-4">
    <header style="-webkit-app-region: drag" class="flex items-center justify-between mb-4">
      <div style="-webkit-app-region: no-drag" class="flex gap-4">
        <button
          onclick={() => {
            currentTab = 'timer'
            loadApps()
          }}
          class="text-sm font-medium transition-colors cursor-pointer"
          class:text-zinc-100={currentTab === 'timer'}
          class:text-zinc-500={currentTab !== 'timer'}
        >
          Temporizador
        </button>
        <button
          onclick={() => {
            currentTab = 'dashboard'
            loadStats()
          }}
          class="text-sm font-medium transition-colors cursor-pointer"
          class:text-zinc-100={currentTab === 'dashboard'}
          class:text-zinc-500={currentTab !== 'dashboard'}
        >
          Dashboard
        </button>
        <button
          onclick={() => {
            currentTab = 'history'
          }}
          class="text-sm font-medium transition-colors cursor-pointer"
          class:text-zinc-100={currentTab === 'history'}
          class:text-zinc-500={currentTab !== 'history'}
        >
          Historial
        </button>
        <button
          onclick={() => {
            currentTab = 'settings'
          }}
          class="text-sm font-medium transition-colors cursor-pointer"
          class:text-zinc-100={currentTab === 'settings'}
          class:text-zinc-500={currentTab !== 'settings'}
        >
          Configuración
        </button>
      </div>
      <button
        style="-webkit-app-region: no-drag"
        onclick={handleTogglePip}
        class="text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
      >
        PiP
      </button>
    </header>

    {#if currentTab === 'timer'}
      <AppList {apps} onselect={handleSelectApp} onrefresh={loadApps} />
      <TimerDisplay />
      <div class="flex gap-2 mt-4">
        <button
          onclick={handlePlayPause}
          disabled={!getState().selectedApp && getState().elapsed === 0}
          class="flex-1 px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium cursor-pointer"
        >
          {getState().running ? 'Pausar' : getState().elapsed > 0 ? 'Reanudar' : 'Iniciar'}
        </button>
        {#if getState().running}
          <button
            onclick={handleLap}
            class="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-sm font-medium cursor-pointer inline-flex items-center gap-1.5"
          >
            <Flag size={16} /> Lap
          </button>
        {/if}
        <button
          onclick={handleReset}
          disabled={getState().elapsed === 0 && !getState().running}
          class="flex-1 px-4 py-2 rounded bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium cursor-pointer"
        >
          Reiniciar
        </button>
        <button
          onclick={handleToggleHeartbeat}
          class="px-4 py-2 rounded text-sm font-medium cursor-pointer transition-colors"
          class:bg-emerald-600={getState().heartbeat.active}
          class:hover:bg-emerald-500={getState().heartbeat.active}
          class:bg-zinc-700={!getState().heartbeat.active}
          class:hover:bg-zinc-600={!getState().heartbeat.active}
        >
          {getState().heartbeat.active ? 'Detener' : 'Auto'}
        </button>
      </div>
      {#if getState().heartbeat.active}
        <div class="mt-2 text-xs text-zinc-500 text-center truncate">
          {getState().heartbeat.currentApp ?? 'Esperando...'}
        </div>
      {/if}
    {:else if currentTab === 'dashboard'}
      <Dashboard />
    {:else if currentTab === 'history'}
      <History onedit={handleEdit} ondelete={handleDelete} />
    {:else}
      <Settings />
    {/if}

    <div class="mt-4 text-xs text-zinc-500 text-center">Presiona F12 para abrir DevTools</div>
  </div>
{/if}

{#if showEditModal && selectedHistoryItem}
  <EditModal
    duration={selectedHistoryItem.duration_seconds}
    onsave={handleSaveEdit}
    onclose={() => {
      showEditModal = false
      selectedHistoryItem = null
    }}
  />
{/if}
