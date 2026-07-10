<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import {
    getState,
    setSessionTick,
    setRecentSessions,
    setSessionLoading
  } from './timerStore.svelte.ts'
  import type { SessionListItem, ActiveSession } from './timerStore.svelte.ts'

  const state = $derived(getState())

  let heartbeatStats = $state<
    Array<{ app_name: string; total_seconds: number; heartbeat_count: number }>
  >([])

  let expandedSessionIds = $state<number[]>([])
  let manualLabel = $state('')
  let labelInputVisible = $state(false)
  let cleanupTick: (() => void) | null = null

  let editingBlockId = $state<number | null>(null)
  let blockEditValue = $state('')
  let blockEditInput: HTMLInputElement | undefined = $state()

  let editingSessionId = $state<number | null>(null)
  let sessionEditValue = $state('')
  let sessionEditInput: HTMLInputElement | undefined = $state()

  function formatTimeOfDay(isoString: string): string {
    if (!isoString) return ''
    const d = new Date(isoString)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m`
    return `${Math.floor(seconds)}s`
  }

  function formatTimeCompact(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const sessionStats = $derived(
    (state.stats as Array<{ app_name: string; total_seconds: number; session_count: number }>) || []
  )

  const totalSessionSeconds = $derived(sessionStats.reduce((sum, s) => sum + s.total_seconds, 0))

  const totalHeartbeatSeconds = $derived(
    heartbeatStats.reduce((sum, s) => sum + s.total_seconds, 0)
  )

  const activeSessionData = $derived(state.session.active)

  const recentSessions = $derived(state.session.recentSessions)

  function barWidth(seconds: number, total: number): string {
    if (total === 0) return '0%'
    return ((seconds / total) * 100).toFixed(1) + '%'
  }

  async function loadHeartbeatStats(): Promise<void> {
    const result = await window.electronAPI.getHeartbeatStats()
    heartbeatStats = result as Array<{
      app_name: string
      total_seconds: number
      heartbeat_count: number
    }>
  }

  async function loadSessionList(): Promise<void> {
    setSessionLoading(true)
    try {
      const result = await window.electronAPI.getSessionList(20)
      setRecentSessions(result as unknown as SessionListItem[])
    } finally {
      setSessionLoading(false)
    }
  }

  function handleSessionTick(data: ActiveSession): void {
    setSessionTick(data)
  }

  function toggleSession(id: number): void {
    if (expandedSessionIds.includes(id)) {
      expandedSessionIds = expandedSessionIds.filter((sid) => sid !== id)
    } else {
      expandedSessionIds = [...expandedSessionIds, id]
    }
  }

  async function handleLabelSubmit(): Promise<void> {
    if (!manualLabel.trim() || !activeSessionData) return
    await window.electronAPI.setSessionLabel(activeSessionData.appName, manualLabel.trim())
    manualLabel = ''
    labelInputVisible = false
  }

  function handleLabelKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      handleLabelSubmit()
    }
    if (e.key === 'Escape') {
      manualLabel = ''
      labelInputVisible = false
    }
  }

  function showLabelInput(): void {
    manualLabel = ''
    labelInputVisible = true
  }

  function startBlockEdit(blockId: number, currentLabel: string): void {
    editingBlockId = blockId
    blockEditValue = currentLabel
    queueMicrotask(() => blockEditInput?.focus())
  }

  async function commitBlockEdit(): Promise<void> {
    const id = editingBlockId
    if (id === null) return
    editingBlockId = null
    if (!blockEditValue.trim()) return
    await window.electronAPI.renameBlock(id, blockEditValue.trim())
    await loadSessionList()
  }

  function cancelBlockEdit(): void {
    editingBlockId = null
  }

  let editingActiveSessionId = $state<number | null>(null)
  let activeSessionEditValue = $state('')
  let activeSessionEditInput: HTMLInputElement | undefined = $state()

  function startSessionEdit(sessionId: number, currentName: string): void {
    editingSessionId = sessionId
    sessionEditValue = currentName
    queueMicrotask(() => sessionEditInput?.focus())
  }

  async function commitSessionEdit(): Promise<void> {
    const id = editingSessionId
    if (id === null) return
    editingSessionId = null
    if (!sessionEditValue.trim()) return
    await window.electronAPI.renameSession(id, sessionEditValue.trim())
    await loadSessionList()
  }

  function cancelSessionEdit(): void {
    editingSessionId = null
  }

  function startActiveSessionEdit(sessionId: number, currentName: string): void {
    editingActiveSessionId = sessionId
    activeSessionEditValue = currentName
    queueMicrotask(() => activeSessionEditInput?.focus())
  }

  async function commitActiveSessionEdit(): Promise<void> {
    const id = editingActiveSessionId
    if (id === null) return
    editingActiveSessionId = null
    if (!activeSessionEditValue.trim()) return
    await window.electronAPI.renameSession(id, activeSessionEditValue.trim())
    await loadSessionList()
    // Refresh active session tick
    const active = await window.electronAPI.getActiveSession()
    if (active) setSessionTick(active)
  }

  function cancelActiveSessionEdit(): void {
    editingActiveSessionId = null
  }

  onMount(() => {
    loadHeartbeatStats()
    loadSessionList()
    cleanupTick = window.electronAPI.onSessionTick(handleSessionTick)
  })

  onDestroy(() => {
    cleanupTick?.()
  })
</script>

<div class="space-y-6">
  {#if state.heartbeat.active}
    <div>
      <h2 class="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">Auto-track</h2>

      {#if state.heartbeat.currentApp}
        <div class="bg-zinc-800/50 rounded-lg p-3 border border-zinc-800 mb-3">
          <div class="text-xs text-zinc-500 mb-1">Ventana activa</div>
          <div class="text-sm font-medium text-zinc-200">{state.heartbeat.currentApp}</div>
          {#if state.heartbeat.currentTitle && state.heartbeat.currentTitle !== state.heartbeat.currentApp}
            <div class="text-xs text-zinc-400 truncate mt-0.5">{state.heartbeat.currentTitle}</div>
          {/if}
        </div>
      {/if}

      {#if heartbeatStats.length > 0}
        <div class="space-y-3">
          {#each heartbeatStats as stat (stat.app_name)}
            <div class="bg-zinc-800/50 rounded-lg p-3 border border-zinc-800">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-zinc-200">{stat.app_name}</span>
                <span class="text-sm font-mono text-zinc-300"
                  >{formatDuration(stat.total_seconds)}</span
                >
              </div>
              <div class="flex items-center gap-3">
                <div class="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-sky-500 rounded-full transition-all"
                    style="width: {barWidth(stat.total_seconds, totalHeartbeatSeconds)}"
                  ></div>
                </div>
                <span class="text-xs text-zinc-500 w-16 text-right"
                  >{stat.heartbeat_count} ticks</span
                >
              </div>
            </div>
          {/each}
        </div>

        <div class="text-xs text-zinc-500 pt-2 border-t border-zinc-800">
          Total: {formatDuration(totalHeartbeatSeconds)} &middot; {heartbeatStats.length} apps
        </div>
      {:else}
        <p class="text-xs text-zinc-600 italic">
          Auto-track activo. Los datos aparecer&aacute;n en unos segundos.
        </p>
      {/if}
    </div>
  {/if}

  <!-- Sessions section -->
  <div>
    <h2 class="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">Sesiones</h2>

    {#if state.session.loading}
      <p class="text-xs text-zinc-600 italic">Cargando sesiones...</p>
    {:else if activeSessionData}
      <!-- Active session card -->
      <div class="bg-zinc-800/50 rounded-lg p-3 border border-zinc-800 border-l-green-500 mb-3">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0"></span>
            {#if editingActiveSessionId === activeSessionData.sessionId}
              <input
                bind:this={activeSessionEditInput}
                bind:value={activeSessionEditValue}
                onkeydown={(e) => {
                  if (e.key === 'Enter') commitActiveSessionEdit()
                  if (e.key === 'Escape') cancelActiveSessionEdit()
                }}
                onblur={commitActiveSessionEdit}
                class="flex-1 min-w-0 bg-zinc-900 border border-sky-500 rounded px-1.5 py-0.5 text-sm text-zinc-200 outline-none"
              />
            {:else}
              <button
                onclick={() => startActiveSessionEdit(activeSessionData.sessionId, activeSessionData.appName)}
                class="text-sm font-medium text-zinc-200 hover:text-zinc-100 cursor-pointer text-left truncate"
                title="Renombrar sesión"
              >
                {activeSessionData.appName}
              </button>
            {/if}
          </div>
          <span class="text-sm font-mono text-zinc-300 shrink-0 ml-2"
            >{formatTimeCompact(activeSessionData.sessionDuration)}</span
          >
        </div>

        <!-- Current block -->
        <div class="flex items-center justify-between pl-4 py-1">
          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-zinc-500"
              >{activeSessionData.blockSource === 'manual' ? '🖊️' : '📄'}</span
            >
            <span class="text-zinc-300">{activeSessionData.blockLabel || 'Sin título'}</span>
            <span class="text-zinc-600 text-[10px]">({activeSessionData.blockSource})</span>
          </div>
          <span class="text-xs font-mono text-zinc-400"
            >{formatTimeCompact(activeSessionData.blockDuration)}</span
          >
        </div>

        <!-- Inline label input -->
        {#if labelInputVisible}
          <div class="flex items-center gap-2 mt-2 pl-4">
            <span class="text-zinc-500 text-xs">🖊️</span>
            <input
              type="text"
              bind:value={manualLabel}
              onkeydown={handleLabelKeyDown}
              placeholder="¿En qué estás trabajando?"
              class="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-sky-500"
            />
            <button
              onclick={handleLabelSubmit}
              disabled={!manualLabel.trim()}
              class="text-xs px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white cursor-pointer transition-colors"
            >
              OK
            </button>
          </div>
        {:else}
          <button
            onclick={showLabelInput}
            class="flex items-center gap-1 mt-1 pl-4 text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors"
          >
            <span class="text-[10px]">✏️</span>
            <span>Etiquetar bloque</span>
          </button>
        {/if}
      </div>
    {/if}

    <!-- Recent sessions list -->
    {#if recentSessions.length > 0}
      <div class="space-y-2">
        {#each recentSessions as session (session.id)}
          <div class="bg-zinc-800/50 rounded-lg border border-zinc-800 overflow-hidden">
            <!-- Session header (collapsible) -->
            <div
              class="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-800 transition-colors"
            >
              <div class="flex items-center gap-2 min-w-0">
                <button
                  onclick={() => toggleSession(session.id)}
                  class="text-xs text-zinc-500 shrink-0 cursor-pointer hover:text-zinc-300"
                  title={expandedSessionIds.includes(session.id) ? 'Contraer' : 'Expandir'}
                >
                  {expandedSessionIds.includes(session.id) ? '▾' : '▸'}
                </button>
                {#if editingSessionId === session.id}
                  <input
                    bind:this={sessionEditInput}
                    bind:value={sessionEditValue}
                    onkeydown={(e) => {
                      if (e.key === 'Enter') commitSessionEdit()
                      if (e.key === 'Escape') cancelSessionEdit()
                    }}
                    onblur={commitSessionEdit}
                    class="flex-1 min-w-0 bg-zinc-900 border border-sky-500 rounded px-1.5 py-0.5 text-sm text-zinc-200 outline-none"
                  />
                {:else}
                  <button
                    onclick={() => startSessionEdit(session.id, session.app_name)}
                    class="text-sm font-medium text-zinc-200 hover:text-zinc-100 cursor-pointer text-left truncate"
                    title="Renombrar sesión"
                  >
                    {session.app_name}
                  </button>
                {/if}
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="text-xs font-mono text-zinc-300"
                  >{formatTimeCompact(session.duration_seconds)}</span
                >
                <span class="text-[10px] text-zinc-600"
                  >· {session.blocks.length} bloque{session.blocks.length !== 1 ? 's' : ''}</span
                >
              </div>
            </div>

            <!-- Blocks (shown when expanded) -->
            {#if expandedSessionIds.includes(session.id)}
              {#if session.blocks.length > 0}
                <div class="border-t border-zinc-800">
                  {#each session.blocks as block (block.id)}
                    <div class="flex items-center justify-between px-3 py-1.5 pl-8 text-xs">
                      <div class="flex items-center gap-1.5 min-w-0">
                        <span class="text-zinc-500 shrink-0"
                          >{block.source === 'manual' ? '🖊️' : '📄'}</span
                        >
                        {#if editingBlockId === block.id}
                          <input
                            bind:this={blockEditInput}
                            bind:value={blockEditValue}
                            onkeydown={(e) => {
                              if (e.key === 'Enter') commitBlockEdit()
                              if (e.key === 'Escape') cancelBlockEdit()
                            }}
                            onblur={commitBlockEdit}
                            class="flex-1 min-w-0 bg-zinc-900 border border-sky-500 rounded px-1.5 py-0.5 text-xs text-zinc-200 outline-none"
                          />
                        {:else}
                          <button
                            onclick={() => startBlockEdit(block.id, block.label || '')}
                            class="text-zinc-300 hover:text-zinc-100 cursor-pointer text-left truncate"
                            title="Renombrar"
                          >
                            {block.label || 'Sin título'}
                          </button>
                        {/if}
                        <span class="text-zinc-600 text-[10px] shrink-0">({block.source})</span>
                      </div>
                      <div class="flex items-center gap-2 shrink-0 ml-2">
                        <span class="font-mono text-zinc-500 text-[10px]">{formatTimeOfDay(block.start_time)}</span>
                        <span class="font-mono text-zinc-400">{formatTimeCompact(block.duration_seconds)}</span>
                      </div>
                    </div>
                  {/each}
                </div>
              {:else}
                <div class="px-3 py-2 pl-8 text-xs text-zinc-600 italic border-t border-zinc-800">
                  Sin bloques
                </div>
              {/if}
            {/if}
          </div>
        {/each}
      </div>
    {:else if !state.session.loading && !activeSessionData}
      <p class="text-xs text-zinc-600 italic mb-3">
        Sin sesiones. Los datos aparecer&aacute;n cuando haya actividad.
      </p>
    {/if}
  </div>
</div>
