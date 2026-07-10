<script lang="ts">
  import type { WindowInfo } from '../../main/window-detector'
  import { getState, setSelectedApp } from './timerStore.svelte.ts'
  import RefreshCw from '@lucide/svelte/icons/refresh-cw'

  let {
    apps,
    onselect,
    onrefresh
  }: { apps: WindowInfo[]; onselect: (app: string) => void; onrefresh: () => void } = $props()

  function select(app: string): void {
    setSelectedApp(app)
    onselect(app)
  }

  const state = $derived(getState())
</script>

<div class="mb-4">
  <div class="flex items-center justify-between mb-2">
    <h2 class="text-xs font-medium text-zinc-400 uppercase tracking-wide">Aplicaciones activas</h2>
    <button
      onclick={onrefresh}
      class="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
      title="Refrescar"
    >
      <RefreshCw size={12} />
    </button>
  </div>
  <div class="max-h-40 overflow-y-auto space-y-1">
    {#each apps as app}
      <button
        onclick={() => select(app.app)}
        class="w-full text-left px-3 py-1.5 rounded text-sm transition-colors cursor-pointer
          {state.selectedApp === app.app
          ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-600/30'
          : 'bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 border border-transparent'}"
      >
        <span class="font-medium">{app.app}</span>
        {#if app.title}
          <span class="ml-2 text-zinc-500">— {app.title}</span>
        {/if}
      </button>
    {:else}
      <p class="text-xs text-zinc-600 italic">No se detectaron ventanas</p>
    {/each}
  </div>
</div>
