<script lang="ts">
  import { onMount } from 'svelte'
  import {
    getState,
    setPipStyle,
    setCustomColors,
    setPipFontSize,
    PIP_STYLES,
    PIP_STYLE_LIST
  } from './timerStore.svelte.ts'
  import type { PipStyle, CustomColors, PipFontSize } from './timerStore.svelte.ts'

  const state = $derived(getState())

  let saving = $state(false)
  let savingRules = $state(false)
  let rulesSaved = $state(false)

  interface LocalRule {
    app: string
    pattern: string
    replacement: string
    disabled: boolean
  }

  let localRules = $state<LocalRule[]>([])
  let newAppName = $state('')
  let newPattern = $state('')

  interface RuleGroup {
    app: string
    rules: Array<LocalRule & { flatIndex: number }>
  }

  const ruleGroups = $derived.by(() => {
    const groups: RuleGroup[] = []
    for (let i = 0; i < localRules.length; i++) {
      const rule = localRules[i]
      let group = groups.find((g) => g.app === rule.app)
      if (!group) {
        group = { app: rule.app, rules: [] }
        groups.push(group)
      }
      group.rules.push({ ...rule, flatIndex: i })
    }
    return groups
  })

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

  function handleFontSize(key: keyof PipFontSize, value: number): void {
    const next = { ...state.pipFontSize, [key]: value }
    setPipFontSize(next)
    save({ pipFontSize: next })
  }

  async function save(partial: Record<string, unknown>): Promise<void> {
    saving = true
    await window.electronAPI.setSettings(partial)
    saving = false
  }

  const currentPreset = $derived(state.pipStyle === 'custom' ? null : PIP_STYLES[state.pipStyle])

  // --- Title rules ---

  function flattenRules(
    rules: Record<string, { pattern: string; replacement: string; disabled?: boolean }[]>
  ): LocalRule[] {
    const result: LocalRule[] = []
    for (const [app, appRules] of Object.entries(rules)) {
      for (const rule of appRules) {
        result.push({
          app,
          pattern: rule.pattern,
          replacement: rule.replacement ?? '',
          disabled: rule.disabled ?? false
        })
      }
    }
    return result
  }

  function groupRules(
    rules: LocalRule[]
  ): Record<string, { pattern: string; replacement: string; disabled?: boolean }[]> {
    const grouped: Record<string, { pattern: string; replacement: string; disabled?: boolean }[]> =
      {}
    for (const rule of rules) {
      if (!rule.pattern.trim()) continue
      if (!grouped[rule.app]) {
        grouped[rule.app] = []
      }
      grouped[rule.app].push({
        pattern: rule.pattern.trim(),
        replacement: rule.replacement,
        disabled: rule.disabled
      })
    }
    return grouped
  }

  function isValidRegex(pattern: string): boolean {
    try {
      new RegExp(pattern)
      return true
    } catch {
      return false
    }
  }

  function addRule(): void {
    if (!newAppName.trim() || !newPattern.trim()) return
    if (!isValidRegex(newPattern.trim())) return
    localRules = [
      ...localRules,
      { app: newAppName.trim(), pattern: newPattern.trim(), replacement: '', disabled: false }
    ]
    newPattern = ''
  }

  function toggleRuleDisabled(index: number): void {
    localRules = localRules.map((r, i) => (i === index ? { ...r, disabled: !r.disabled } : r))
  }

  function removeRule(index: number): void {
    localRules = localRules.filter((_, i) => i !== index)
  }

  function moveRule(index: number, direction: -1 | 1): void {
    const target = index + direction
    if (target < 0 || target >= localRules.length) return
    const next = [...localRules]
    const tmp = next[index]
    next[index] = next[target]
    next[target] = tmp
    localRules = next
  }

  async function saveTitleRules(): Promise<void> {
    // Validate all patterns before saving
    for (let i = 0; i < localRules.length; i++) {
      if (localRules[i].pattern.trim() && !isValidRegex(localRules[i].pattern.trim())) {
        return
      }
    }

    savingRules = true
    rulesSaved = false
    const grouped = groupRules(localRules)
    await window.electronAPI.setTitleRules(grouped)
    rulesSaved = true
    savingRules = false
    setTimeout(() => {
      rulesSaved = false
    }, 2000)
  }

  onMount(async () => {
    const existing = await window.electronAPI.getTitleRules()
    localRules = flattenRules(
      existing as Record<string, { pattern: string; replacement: string; disabled?: boolean }[]>
    )
  })
</script>

<div class="space-y-5">
  <h2 class="text-xs font-medium text-zinc-400 uppercase tracking-wide">Picture-in-Picture</h2>

  <label class="block">
    <span class="text-sm text-zinc-300 mb-1.5 block">Estilo</span>
    <select
      value={state.pipStyle}
      onchange={handleStyleChange}
      class="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 cursor-pointer"
    >
      {#each PIP_STYLE_LIST as style (style)}
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

      {#each [{ key: 'bg' as const, label: 'Fondo', default: '#1e1e2e' }, { key: 'text' as const, label: 'Texto', default: '#ffffff' }, { key: 'border' as const, label: 'Borde', default: '#334155' }] as field (field.key)}
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

      <div
        class="mt-4 rounded-lg border overflow-hidden"
        style="border-color: {state.customColors.border}; background-color: {state.customColors
          .bg};"
      >
        <div
          class="flex flex-col items-center justify-center py-3 px-4 select-none"
          style="color: {state.customColors.text};"
        >
          <span
            class="font-mono font-bold tabular-nums"
            style="font-size: {state.pipFontSize.time}px; line-height: 1;"
          >
            01:23:45
          </span>
          <div class="flex items-center gap-3 mt-1" style="opacity: 0.8;">
            <span style="font-size: {state.pipFontSize.label}px;">Retoque</span>
            <span style="font-size: {state.pipFontSize.label}px;">&middot; 12:30</span>
            <span style="font-size: {state.pipFontSize.label}px;">▶ ■ ⊞</span>
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

  <div class="space-y-3 pt-2 border-t border-zinc-800">
    <h3 class="text-xs font-medium text-zinc-500 uppercase tracking-wide">
      Tama&ntilde;os de texto
    </h3>

    <!-- Time font size -->
    <div class="flex items-center justify-between">
      <span class="text-xs text-zinc-400">Tiempo</span>
      <div class="flex items-center gap-1">
        {#each [20, 24, 28, 32] as size (size)}
          <button
            onclick={() => handleFontSize('time', size)}
            class="px-2 py-1 text-xs rounded transition-colors {state.pipFontSize.time === size
              ? 'bg-sky-600 text-white'
              : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}">{size}px</button
          >
        {/each}
      </div>
    </div>

    <!-- Label font size -->
    <div class="flex items-center justify-between">
      <span class="text-xs text-zinc-400">Etiquetas (app, lap)</span>
      <div class="flex items-center gap-1">
        {#each [9, 11, 13] as size (size)}
          <button
            onclick={() => handleFontSize('label', size)}
            class="px-2 py-1 text-xs rounded transition-colors {state.pipFontSize.label === size
              ? 'bg-sky-600 text-white'
              : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}">{size}px</button
          >
        {/each}
      </div>
    </div>
  </div>

  <!-- Title cleaning rules section -->
  <div class="pt-4 border-t border-zinc-800 space-y-3">
    <h2 class="text-xs font-medium text-zinc-400 uppercase tracking-wide">
      Limpieza de t&iacute;tulos
    </h2>

    <p class="text-xs text-zinc-500">
      Reglas para limpiar t&iacute;tulos de ventanas por aplicaci&oacute;n.
    </p>

    <!-- Existing rules grouped by app -->
    {#if localRules.length > 0}
      {#each ruleGroups as group (group.app)}
        <div class="bg-zinc-800/50 rounded-lg p-3 border border-zinc-800">
          <h3 class="text-xs font-medium text-zinc-300 mb-2">{group.app}</h3>
          {#each group.rules as rule (rule.flatIndex)}
            <div class="flex items-center gap-2 py-1.5 border-b border-zinc-800 last:border-b-0">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <input
                    type="text"
                    bind:value={rule.pattern}
                    placeholder="pattern (regex)"
                    class="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-300 placeholder-zinc-600 outline-none focus:border-sky-500"
                  />
                  <input
                    type="text"
                    bind:value={rule.replacement}
                    placeholder="reemplazo"
                    class="w-24 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-300 placeholder-zinc-600 outline-none focus:border-sky-500"
                  />
                </div>
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-[10px] text-zinc-600">App:</span>
                  <input
                    type="text"
                    bind:value={rule.app}
                    class="flex-1 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] text-zinc-300 outline-none focus:border-sky-500"
                  />
                </div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <label class="flex items-center gap-1 text-[10px] text-zinc-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rule.disabled}
                    onchange={() => toggleRuleDisabled(rule.flatIndex)}
                    class="w-3 h-3 rounded border-zinc-600 bg-zinc-800 accent-sky-500"
                  />
                  act.
                </label>
                <button
                  onclick={() => removeRule(rule.flatIndex)}
                  class="text-[10px] px-1.5 py-0.5 rounded text-red-400 hover:text-red-300 hover:bg-red-900/30 cursor-pointer transition-colors"
                  title="Eliminar regla">X</button
                >
              </div>
            </div>
          {/each}
        </div>
      {/each}
    {:else}
      <p class="text-xs text-zinc-600 italic">Sin reglas configuradas.</p>
    {/if}

    <!-- Add new rule -->
    <div class="bg-zinc-800/50 rounded-lg p-3 border border-zinc-800 space-y-2">
      <h3 class="text-xs font-medium text-zinc-400">Agregar nueva regla</h3>
      <div class="flex items-center gap-2">
        <input
          type="text"
          bind:value={newAppName}
          placeholder="App (ej: Photoshop)"
          class="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-sky-500"
        />
        <input
          type="text"
          bind:value={newPattern}
          placeholder="pattern (regex)"
          class="flex-[2] bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-200 placeholder-zinc-600 outline-none focus:border-sky-500"
        />
        <button
          onclick={addRule}
          disabled={!newAppName.trim() || !newPattern.trim() || !isValidRegex(newPattern.trim())}
          class="text-xs px-3 py-1.5 rounded bg-sky-700 hover:bg-sky-600 disabled:opacity-40 text-white cursor-pointer transition-colors"
        >
          + Agregar
        </button>
      </div>
      {#if newPattern.trim() && !isValidRegex(newPattern.trim())}
        <p class="text-[10px] text-red-400">Regex inv&aacute;lido</p>
      {/if}
    </div>

    <!-- Reorder / up-down controls -->
    {#if localRules.length > 1}
      <div class="flex items-center gap-2">
        <span class="text-[10px] text-zinc-600">Reordenar reglas:</span>
        {#each localRules as rule, i (i)}
          <div class="flex items-center gap-1">
            <button
              onclick={() => moveRule(i, -1)}
              disabled={i === 0}
              class="text-[10px] px-1 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-400 cursor-pointer transition-colors"
              title="Subir">↑</button
            >
            <button
              onclick={() => moveRule(i, 1)}
              disabled={i === localRules.length - 1}
              class="text-[10px] px-1 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-400 cursor-pointer transition-colors"
              title="Bajar">↓</button
            >
            <span class="text-[10px] text-zinc-600"
              >{rule.app}: {rule.pattern.slice(0, 20)}{rule.pattern.length > 20 ? '...' : ''}</span
            >
          </div>
        {/each}
      </div>
    {/if}

    <button
      onclick={saveTitleRules}
      disabled={savingRules}
      class="w-full py-2 rounded text-sm font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 cursor-pointer transition-colors"
    >
      {savingRules ? 'Guardando…' : rulesSaved ? '✓ Guardado' : 'Guardar cambios'}
    </button>
  </div>
</div>
