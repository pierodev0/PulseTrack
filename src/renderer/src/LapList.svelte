<script lang="ts">
  import { getState } from './timerStore.svelte.ts'

  const state = $derived(getState())

  let editingLapIndex = $state(-1)
  let editValue = $state('')
  let editInput: HTMLInputElement | undefined = $state()

  function formatLapTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  function formatTimeOfDay(isoString: string): string {
    if (!isoString) return ''
    const d = new Date(isoString)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  function startEdit(index: number): void {
    const lap = state.laps[index]
    if (!lap) return
    editingLapIndex = index
    editValue = lap.label
    queueMicrotask(() => editInput?.focus())
  }

  async function commitEdit(): Promise<void> {
    const i = editingLapIndex
    if (i < 0) return
    editingLapIndex = -1
    const lap = state.laps[i]
    if (!lap || !editValue.trim() || editValue.trim() === lap.label) return
    await window.electronAPI.renameLap(i, editValue.trim())
  }

  function cancelEdit(): void {
    editingLapIndex = -1
  }
</script>

{#if state.running || state.laps.length > 0}
  <div class="space-y-1">
    {#each state.laps as lap, i (lap.number)}
      <div
        class="flex items-center justify-between text-xs py-1 px-2 rounded {i ===
          state.laps.length - 1 && state.running
          ? 'bg-zinc-800/50'
          : 'bg-zinc-900/30'}"
      >
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-zinc-500 w-6 shrink-0">#{lap.number}</span>
          {#if editingLapIndex === i}
            <input
              bind:this={editInput}
              bind:value={editValue}
              onkeydown={(e) => {
                if (e.key === 'Enter') commitEdit()
                if (e.key === 'Escape') cancelEdit()
              }}
              onblur={commitEdit}
              class="flex-1 min-w-0 bg-zinc-900 border border-sky-500 rounded px-1.5 py-0.5 text-xs text-zinc-200 outline-none"
            />
          {:else}
            <button
              onclick={() => startEdit(i)}
              class="text-zinc-300 hover:text-zinc-100 cursor-pointer text-left truncate"
              title="Renombrar"
            >
              {lap.label}
            </button>
          {/if}
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="font-mono text-zinc-500 text-[10px]">{formatTimeOfDay(lap.startedAt)}</span>
          <span class="font-mono text-zinc-400">{formatLapTime(lap.duration)}</span>
        </div>
      </div>
    {/each}
  </div>
{/if}
