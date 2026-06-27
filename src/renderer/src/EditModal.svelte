<script lang="ts">
  import { onMount } from 'svelte'

  let { duration, onsave, onclose }: { duration: number; onsave: (d: number) => void; onclose: () => void } = $props()

  let initDur = duration as number
  let hours = $state(Math.floor(initDur / 3600))
  let minutes = $state(Math.floor((initDur % 3600) / 60))
  let seconds = $state(Math.floor(initDur % 60))

  function save(): void {
    const total = hours * 3600 + minutes * 60 + seconds
    onsave(total)
  }

  function onBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) onclose()
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') onclose()
  }

  onMount(() => {
    document.addEventListener('keydown', onKeydown)
    return () => document.removeEventListener('keydown', onKeydown)
  })
</script>

<div
  class="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
  onclick={onBackdropClick}
  onkeydown={onKeydown}
  role="dialog"
  aria-modal="true"
  tabindex="-1"
>
  <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-5 w-72">
    <h3 class="text-sm font-medium mb-4">Editar duración</h3>

    <div class="flex gap-2 mb-4">
      <label class="flex flex-col items-center">
        <span class="text-xs text-zinc-500 mb-1">Horas</span>
        <input
          type="number"
          bind:value={hours}
          min="0"
          class="w-16 text-center bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm"
        />
      </label>
      <label class="flex flex-col items-center">
        <span class="text-xs text-zinc-500 mb-1">Min</span>
        <input
          type="number"
          bind:value={minutes}
          min="0"
          max="59"
          class="w-16 text-center bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm"
        />
      </label>
      <label class="flex flex-col items-center">
        <span class="text-xs text-zinc-500 mb-1">Seg</span>
        <input
          type="number"
          bind:value={seconds}
          min="0"
          max="59"
          class="w-16 text-center bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm"
        />
      </label>
    </div>

    <div class="flex gap-2">
      <button
        onclick={onclose}
        class="flex-1 px-3 py-1.5 rounded text-xs bg-zinc-800 hover:bg-zinc-700 cursor-pointer"
      >
        Cancelar
      </button>
      <button
        onclick={save}
        class="flex-1 px-3 py-1.5 rounded text-xs bg-emerald-600 hover:bg-emerald-500 cursor-pointer"
      >
        Guardar
      </button>
    </div>
  </div>
</div>
