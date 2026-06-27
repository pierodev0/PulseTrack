<script lang="ts">
  import { getState } from './timerStore.svelte.ts'

  const state = $derived(getState())

  function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m`
    return `${Math.floor(seconds)}s`
  }

  const stats = $derived(
    (state.stats as Array<{ app_name: string; total_seconds: number; session_count: number }>) || []
  )

  const totalSeconds = $derived(
    stats.reduce((sum, s) => sum + s.total_seconds, 0)
  )

  function barWidth(seconds: number): string {
    if (totalSeconds === 0) return '0%'
    return ((seconds / totalSeconds) * 100).toFixed(1) + '%'
  }
</script>

<div class="space-y-4">
  <h2 class="text-xs font-medium text-zinc-400 uppercase tracking-wide">
    Dashboard
  </h2>

  {#if stats.length > 0}
    <div class="space-y-3">
      {#each stats as stat}
        <div class="bg-zinc-800/50 rounded-lg p-3 border border-zinc-800">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-zinc-200">{stat.app_name}</span>
            <span class="text-sm font-mono text-zinc-300">{formatDuration(stat.total_seconds)}</span>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
              <div
                class="h-full bg-emerald-500 rounded-full transition-all"
                style="width: {barWidth(stat.total_seconds)}"
              ></div>
            </div>
            <span class="text-xs text-zinc-500 w-16 text-right">{stat.session_count} sesiones</span>
          </div>
        </div>
      {/each}
    </div>

    <div class="text-xs text-zinc-500 pt-2 border-t border-zinc-800">
      Total: {formatDuration(totalSeconds)} &middot; {stats.length} apps
    </div>
  {:else}
    <p class="text-xs text-zinc-600 italic">
      Sin datos. Inicia un temporizador para ver estad&iacute;sticas.
    </p>
  {/if}
</div>
