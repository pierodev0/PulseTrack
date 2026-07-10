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
</script>

{#if pip}
  <div
    class="flex flex-col items-center justify-center w-full h-full select-none"
    style="line-height: 1.2"
  >
    {#if state.selectedApp && state.running}
      <span
        class="tabular-nums truncate max-w-[90%]"
        style="font-size: {state.pipFontSize.appName}px;{state.pipStyle === 'custom'
          ? ` color: ${state.customColors.text};`
          : ''}"
      >
        {state.selectedApp}
      </span>
    {/if}
    <span
      class="font-mono font-bold tabular-nums"
      class:opacity-50={!state.running}
      style="font-size: {state.pipFontSize
        .time}px; line-height: 1; text-shadow: 0 1px 3px rgba(0,0,0,0.5);{state.pipStyle ===
      'custom'
        ? ` color: ${state.customColors.text};`
        : ''}"
    >
      {formatTime(state.elapsed)}
    </span>
    {#if state.running && state.laps.length > 0}
      <span
        class="truncate max-w-[90%]"
        style="font-size: {state.pipFontSize.label}px;{state.pipStyle === 'custom'
          ? ` color: ${state.customColors.text};`
          : ''}"
      >
        {state.laps[state.laps.length - 1].label} &middot; {formatLapTime(
          state.laps[state.laps.length - 1].duration
        )}
      </span>
    {/if}
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
{/if}
