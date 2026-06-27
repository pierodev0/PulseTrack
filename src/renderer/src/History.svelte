<script lang="ts">
  import { getState } from './timerStore.svelte.ts'

  let { onedit, ondelete }: { onedit: (item: { id: number; duration_seconds: number }) => void; ondelete: (id: number) => void } = $props()

  const state = $derived(getState())

  function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  function formatDate(iso: string): string {
    const d = new Date(iso)
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
</script>

<div class="mt-6">
  <h2 class="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wide">
    Historial
  </h2>

  {#if state.history.length > 0}
    <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead>
          <tr class="text-zinc-500 border-b border-zinc-800">
            <th class="text-left py-1 pr-2 font-medium">App</th>
            <th class="text-left py-1 pr-2 font-medium">Duración</th>
            <th class="text-left py-1 pr-2 font-medium">Fecha</th>
            <th class="text-right py-1 font-medium">Acción</th>
          </tr>
        </thead>
        <tbody>
          {#each state.history as item (item.id)}
            <tr class="border-b border-zinc-800/50 hover:bg-zinc-800/30">
              <td class="py-1.5 pr-2 text-zinc-300">{item.app_name}</td>
              <td class="py-1.5 pr-2 font-mono text-zinc-200">{formatDuration(item.duration_seconds)}</td>
              <td class="py-1.5 pr-2 text-zinc-500">{formatDate(item.created_at)}</td>
              <td class="py-1.5 text-right">
                <button
                  onclick={() => onedit({ id: item.id, duration_seconds: item.duration_seconds })}
                  class="text-zinc-500 hover:text-zinc-300 mr-2 cursor-pointer"
                >
                  Editar
                </button>
                <button
                  onclick={() => ondelete(item.id)}
                  class="text-red-500 hover:text-red-400 cursor-pointer"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <p class="text-xs text-zinc-600 italic">Sin registros</p>
  {/if}
</div>
