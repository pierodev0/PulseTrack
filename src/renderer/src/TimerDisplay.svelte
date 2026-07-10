<script lang="ts">
  import { getState, PIP_STYLES } from './timerStore.svelte.ts'

  let { pip = false }: { pip?: boolean } = $props()

  const state = $derived(getState())

  function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  function formatLapTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  async function handleRenameLap(index: number): Promise<void> {
    const lap = state.laps[index]
    if (!lap) return
    const newLabel = prompt('Renombrar vuelta:', lap.label)
    if (newLabel && newLabel !== lap.label) {
      await window.electronAPI.renameLap(index, newLabel)
    }
  }
</script>

{#if pip}
  <div class="flex items-center justify-center w-full h-full select-none">
    <span
      class="font-mono font-bold tabular-nums"
      class:opacity-50={!state.running}
      style="font-size: 28px; line-height: 1; text-shadow: 0 1px 3px rgba(0,0,0,0.5);{state.pipStyle ===
      'custom'
        ? ` color: ${state.customColors.text};`
        : ''}"
    >
      {formatTime(state.elapsed)}
    </span>
  </div>
{:else}
  <div class="text-center my-4">
    <div
      class="text-5xl tabular-nums font-mono font-bold transition-colors
        {state.running ? 'text-emerald-400' : 'text-zinc-400'}"
    >
      {formatTime(state.elapsed)}
    </div>
    <div class="text-xs mt-1">
      {#if state.running}
        <span class="text-emerald-500">Corriendo</span>
      {:else if state.selectedApp}
        <span class="text-zinc-500">Pausado</span>
      {:else}
        <span class="text-zinc-600">Selecciona una aplicación</span>
      {/if}
    </div>
  </div>
  {#if state.running || state.laps.length > 0}
    <div class="mt-4 space-y-1">
      {#each state.laps as lap, i (lap.number)}
        <div
          class="flex items-center justify-between text-xs py-1 px-2 rounded {i ===
            state.laps.length - 1 && state.running
            ? 'bg-zinc-800/50'
            : 'bg-zinc-900/30'}"
        >
          <div class="flex items-center gap-2">
            <span class="text-zinc-500 w-6">#{lap.number}</span>
            <button
              onclick={() => handleRenameLap(i)}
              class="text-zinc-300 hover:text-zinc-100 cursor-pointer text-left"
              title="Renombrar"
            >
              {lap.label}
            </button>
          </div>
          <span class="font-mono text-zinc-400">{formatLapTime(lap.duration)}</span>
        </div>
      {/each}
    </div>
  {/if}
{/if}
