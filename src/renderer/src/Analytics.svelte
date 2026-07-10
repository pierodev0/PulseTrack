<script lang="ts">
  import { onMount } from 'svelte'

  // Load heartbeat stats and manual timer stats
  let heartbeatStats = $state<
    Array<{ app_name: string; total_seconds: number; heartbeat_count: number }>
  >([])

  let manualStats = $state<
    Array<{ app_name: string; total_seconds: number; session_count: number }>
  >([])

  // Combined stats derived from both sources
  const combinedStats = $derived.by(() => {
    const map = new Map<string, {
      app_name: string
      total_seconds: number
      manual_seconds: number
      auto_seconds: number
      session_count: number
      heartbeat_count: number
    }>()

    for (const s of manualStats) {
      map.set(s.app_name, {
        app_name: s.app_name,
        total_seconds: s.total_seconds,
        manual_seconds: s.total_seconds,
        auto_seconds: 0,
        session_count: s.session_count,
        heartbeat_count: 0
      })
    }

    for (const s of heartbeatStats) {
      const existing = map.get(s.app_name)
      if (existing) {
        existing.total_seconds += s.total_seconds
        existing.auto_seconds = s.total_seconds
        existing.heartbeat_count = s.heartbeat_count
      } else {
        map.set(s.app_name, {
          app_name: s.app_name,
          total_seconds: s.total_seconds,
          manual_seconds: 0,
          auto_seconds: s.total_seconds,
          session_count: 0,
          heartbeat_count: s.heartbeat_count
        })
      }
    }

    return Array.from(map.values()).sort((a, b) => b.total_seconds - a.total_seconds)
  })

  const totalSeconds = $derived(combinedStats.reduce((sum, s) => sum + s.total_seconds, 0))
  const topApp = $derived(combinedStats[0]?.app_name || '—')

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
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  function barWidth(seconds: number, total: number): string {
    if (total === 0) return '0%'
    return ((seconds / total) * 100).toFixed(1) + '%'
  }

  async function loadData(): Promise<void> {
    const [h, m] = await Promise.all([
      window.electronAPI.getHeartbeatStats(),
      window.electronAPI.getStats()
    ])
    heartbeatStats = h as Array<{ app_name: string; total_seconds: number; heartbeat_count: number }>
    manualStats = m as Array<{ app_name: string; total_seconds: number; session_count: number }>
  }

  onMount(() => {
    loadData()
  })
</script>

<div class="space-y-6">
  <!-- Summary header -->
  <div class="grid grid-cols-2 gap-3">
    <div class="bg-zinc-800/50 rounded-lg p-3 border border-zinc-800">
      <div class="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Total registrado</div>
      <div class="text-lg font-mono font-bold text-zinc-100">{formatDuration(totalSeconds)}</div>
    </div>
    <div class="bg-zinc-800/50 rounded-lg p-3 border border-zinc-800">
      <div class="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">App principal</div>
      <div class="text-lg font-bold text-zinc-100 truncate">{topApp}</div>
    </div>
  </div>

  <!-- Combined ranking -->
  <div>
    <h2 class="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">
      Apps m&aacute;s usadas
    </h2>

    {#if combinedStats.length > 0}
      <div class="space-y-2">
        {#each combinedStats as stat, i (stat.app_name)}
          <div class="bg-zinc-800/50 rounded-lg p-3 border border-zinc-800">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-xs text-zinc-600 w-5 shrink-0">#{i + 1}</span>
                <span class="text-sm font-medium text-zinc-200 truncate">{stat.app_name}</span>
              </div>
              <span class="text-sm font-mono text-zinc-100 font-bold shrink-0 ml-2"
                >{formatDuration(stat.total_seconds)}</span
              >
            </div>
            <!-- Bar -->
            <div class="flex items-center gap-3">
              <div class="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden flex">
                <div
                  class="h-full bg-emerald-500 rounded-l-full transition-all"
                  style="width: {barWidth(stat.manual_seconds, totalSeconds)}"
                  title="Manual"
                ></div>
                <div
                  class="h-full bg-sky-500 rounded-r-full transition-all"
                  style="width: {barWidth(stat.auto_seconds, totalSeconds)}"
                  title="Auto"
                ></div>
              </div>
            </div>
            <!-- Breakdown -->
            <div class="flex items-center gap-3 mt-1.5 text-[10px] text-zinc-500">
              {#if stat.manual_seconds > 0}
                <span class="flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Manual: {formatTimeCompact(stat.manual_seconds)} ({stat.session_count} sesiones)
                </span>
              {/if}
              {#if stat.auto_seconds > 0}
                <span class="flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                  Auto: {formatTimeCompact(stat.auto_seconds)}
                </span>
              {/if}
            </div>
          </div>
        {/each}
      </div>

      <div class="text-xs text-zinc-500 pt-3 border-t border-zinc-800 mt-3">
        {combinedStats.length} app{combinedStats.length !== 1 ? 's' : ''} &middot;
        {formatDuration(totalSeconds)} total
      </div>
    {:else}
      <p class="text-xs text-zinc-600 italic">
        Sin datos. Usa el temporizador manual o activa el auto-track para ver estad&iacute;sticas.
      </p>
    {/if}
  </div>
</div>
