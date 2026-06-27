<script lang="ts">
  import {
    getState,
    setPipStyle,
    setCustomColors,
    PIP_STYLES,
    PIP_STYLE_LIST
  } from './timerStore.svelte.ts'
  import type { PipStyle, CustomColors } from './timerStore.svelte.ts'

  const state = $derived(getState())

  let saving = $state(false)

  function handleStyleChange(e: Event): void {
    const style = (e.target as HTMLSelectElement).value as PipStyle
    setPipStyle(style)
    save({ pipStyle: style })
  }

  function handleCustomColor(key: keyof CustomColors, e: Event): void {
    const val = (e.target as HTMLInputElement).value
    const next = { ...state.customColors, [key]: val }
    setCustomColors(next)
  }

  function saveCustom(): void {
    save({ pipStyle: 'custom', customColors: state.customColors })
  }

  async function save(partial: Record<string, unknown>): Promise<void> {
    saving = true
    await window.electronAPI.setSettings(partial)
    saving = false
  }

  const currentPreset = $derived(
    state.pipStyle === 'custom' ? null : PIP_STYLES[state.pipStyle]
  )
</script>

<div class="space-y-5">
  <h2 class="text-xs font-medium text-zinc-400 uppercase tracking-wide">
    Picture-in-Picture
  </h2>

  <label class="block">
    <span class="text-sm text-zinc-300 mb-1.5 block">Estilo</span>
    <select
      value={state.pipStyle}
      onchange={handleStyleChange}
      class="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 cursor-pointer"
    >
      {#each PIP_STYLE_LIST as style}
        <option value={style}>
          {style === 'custom' ? 'Personalizado' : PIP_STYLES[style].label}
        </option>
      {/each}
    </select>
  </label>

  {#if currentPreset}
    <div class="flex items-center gap-3">
      <span class="text-xs text-zinc-500">Vista previa</span>
      <div
        class="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded border text-xs font-mono {currentPreset.bg} {currentPreset.text} {currentPreset.border}"
      >
        <span>01:23:45</span>
        <span class="opacity-60">▶ ■ ⊞</span>
      </div>
    </div>
  {/if}

  {#if state.pipStyle === 'custom'}
    <div class="space-y-3 pt-2 border-t border-zinc-800">
      <h3 class="text-xs font-medium text-zinc-500 uppercase tracking-wide">
        Personalizar colores
      </h3>

      {#each ([
        { key: 'bg' as const, label: 'Fondo', default: '#1e1e2e' },
        { key: 'text' as const, label: 'Texto', default: '#ffffff' },
        { key: 'border' as const, label: 'Borde', default: '#334155' }
      ]) as field}
        <div class="flex items-center gap-3">
          <span class="w-14 text-xs text-zinc-400">{field.label}</span>
          <input
            type="color"
            value={state.customColors[field.key]}
            oninput={(e) => handleCustomColor(field.key, e)}
            class="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
          />
          <input
            type="text"
            value={state.customColors[field.key]}
            oninput={(e) => handleCustomColor(field.key, e)}
            class="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-300"
          />
          <div
            class="w-6 h-6 rounded border border-zinc-700"
            style="background-color: {state.customColors[field.key]}"
          ></div>
        </div>
      {/each}

      <div class="mt-4 rounded-lg border overflow-hidden" style="border-color: {state.customColors.border}; background-color: {state.customColors.bg};">
        <div class="flex flex-col items-center justify-center py-3 px-4 select-none" style="color: {state.customColors.text};">
          <span class="font-mono font-bold tabular-nums" style="font-size: 22px; line-height: 1;">
            01:23:45
          </span>
          <div class="flex items-center gap-3 mt-1" style="opacity: 0.8;">
            <span style="font-size: 11px;">▶</span>
            <span style="font-size: 11px;">■</span>
            <span style="font-size: 11px;">⊞</span>
          </div>
        </div>
      </div>

      <button
        onclick={saveCustom}
        disabled={saving}
        class="w-full py-2 rounded text-sm font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 cursor-pointer transition-colors"
      >
        {saving ? 'Guardando…' : 'Guardar estilo'}
      </button>
    </div>
  {/if}
</div>
