/**
 * TUI: blessed-приложение поверх реактивного state.
 * Зачем: тонкий диспатчер — создаёт state + screen + widgets, собирает хэндлеры
 * через createXHandlers и навешивает screen.key для клавиш.
 */
import blessed from 'neo-blessed'
import { effect } from '@vue/reactivity'

import { config } from '@pln/core/config.js'

import { createState } from './state.js'
import { createFilterHandlers } from './handlers/filters.js'
import { createEditorHandlers } from './handlers/editors.js'
import { createTaskHandlers } from './handlers/tasks.js'
import { createHelpHandlers } from './handlers/help.js'
import { createBatchHandlers } from './handlers/batch.js'

/**
 * Иконка статуса задачи (с inline-tag цветом для blessed).
 * @param {string} status
 * @returns {string}
 */
function statusIcon(status) {
  const icons = config.taskStatusIcons || {}
  if (status === 'COMPLETED')  return `{green-fg}${icons['COMPLETED'] || 'x'}{/}`
  if (status === 'IN-PROCESS') return `{yellow-fg}${icons['IN-PROGRESS'] || '~'}{/}`
  return icons['NEEDS-ACTION'] || ' '
}

/**
 * Форматирует одну строку списка: отступ, иконка, summary, маркер свёрнутых,
 * метка выделения (для batch-операций).
 * @param {object} task
 * @param {number} depth
 * @param {number} hiddenChildren
 * @param {boolean} isSelected
 * @returns {string}
 */
function formatTaskLine(task, depth, hiddenChildren, isSelected) {
  const indent = '  '.repeat(depth)
  const icon = statusIcon(task.status)
  const summary = task.summary || ''
  const collapsed = hiddenChildren > 0 ? ` {gray-fg}▸${hiddenChildren}{/}` : ''
  const mark = isSelected ? '{magenta-fg}*{/} ' : ''
  return `${indent}${mark}${icon} ${summary}${collapsed}`
}

/**
 * Контент шапки: счётчики, фильтр, выделение, подсказка.
 * @param {ReturnType<typeof createState>} state
 * @returns {string}
 */
function buildHeader(state) {
  const total = state.tasks.value.length
  const done = state.tasks.value.filter(t => t.status === 'COMPLETED').length
  const pos = total === 0 ? 0 : state.cursor.value + 1
  const filter = state.activeOnly.value ? '{yellow-fg}active{/}' : 'all'
  const sel = state.selected.value.length
  const selPart = sel > 0 ? ` │ {magenta-fg}sel ${sel}{/}` : ''
  return ` {bold}pln tui{/} │ ${done}/${total} │ [${pos}/${total}] │ ${filter}${selPart} │ {gray-fg}? — помощь, q — выход{/}`
}

/**
 * Запускает blessed-TUI.
 * @param {object[]} tasks
 * @param {object} [opts]
 * @param {object} [opts.loadFilter] - фильтр загрузки (для refresh r)
 * @returns {Promise<void>}
 */
export function runApp(tasks, opts = {}) {
  return new Promise(resolve => {
    const state = createState(tasks)

    const screen = blessed.screen({
      smartCSR: true,
      fullUnicode: true,
      title: 'pln',
    })

    const header = blessed.box({
      parent: screen,
      top: 0,
      left: 0,
      width: '100%',
      height: 1,
      tags: true,
      style: { fg: 'white' },
    })

    const list = blessed.list({
      parent: screen,
      top: 1,
      left: 0,
      width: '60%',
      height: '100%-1',
      border: 'line',
      tags: true,
      keys: false,
      mouse: false,
      scrollable: true,
      style: {
        selected: { bg: 'blue' },
        border: { fg: 'gray' },
      },
    })

    const desc = blessed.box({
      parent: screen,
      top: 1,
      left: '60%',
      width: '40%',
      height: '100%-1',
      border: 'line',
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      style: {
        fg: 'white',
        border: { fg: 'gray' },
      },
    })

    const render = () => screen.render()

    // Реактивный ре-рендер: на любое изменение state перерисовываем виджеты.
    const stop = effect(() => {
      const selectedSet = new Set(state.selected.value)
      const items = state.flatTree.value.map(({ task, depth, hiddenChildren }) =>
        formatTaskLine(task, depth, hiddenChildren, selectedSet.has(task.uid))
      )
      list.setItems(items)
      list.select(Math.min(state.cursor.value, Math.max(0, items.length - 1)))

      const cur = state.currentTask.value
      desc.setContent(cur?.customProperties?.cleanDescription || cur?.description || '')
      desc.setLabel(cur?.summary ? ` ${cur.summary.slice(0, 40)} ` : '')

      header.setContent(buildHeader(state))
      screen.render()
    })

    /** Завершение работы: stop эффекта, destroy screen, resolve. */
    function exit() {
      stop()
      screen.destroy()
      resolve()
      process.exit(0)
    }

    // ── Базовая навигация (через screen.on — лочится grabKeys в модалках) ──
    /**
     * Подписка на глобальную клавишу с учётом screen.grabKeys/lockKeys.
     * Когда промпт активен (grabKeys=true) — screen-level emit не идёт.
     * @param {string|string[]} keys
     * @param {Function} fn
     */
    function bindKey(keys, fn) {
      const arr = Array.isArray(keys) ? keys : [keys]
      for (const k of arr) screen.on('key ' + k, fn)
    }

    bindKey('j',          () => { state.cursor.value = Math.min(state.maxIdx.value, state.cursor.value + 1) })
    bindKey('down',       () => { state.cursor.value = Math.min(state.maxIdx.value, state.cursor.value + 1) })
    bindKey('k',          () => { state.cursor.value = Math.max(0, state.cursor.value - 1) })
    bindKey('up',         () => { state.cursor.value = Math.max(0, state.cursor.value - 1) })
    bindKey('g',          () => { state.cursor.value = 0 })
    bindKey('S-g',        () => { state.cursor.value = state.maxIdx.value })
    bindKey(['pagedown', 'space'], () => {
      const half = Math.floor((screen.height || 24) / 2)
      state.cursor.value = Math.min(state.maxIdx.value, state.cursor.value + half)
    })
    bindKey(['pageup', 'u'], () => {
      const half = Math.floor((screen.height || 24) / 2)
      state.cursor.value = Math.max(0, state.cursor.value - half)
    })

    // ── Хэндлеры из модулей ──
    const filterHandlers = createFilterHandlers(state, render, screen, opts)
    const editorHandlers = createEditorHandlers(state, render, screen)
    const taskHandlers   = createTaskHandlers(state, render, screen)
    const helpHandlers   = createHelpHandlers(state, render, screen)
    const batchHandlers  = createBatchHandlers(state, render)

    const allHandlers = {
      ...filterHandlers,
      ...editorHandlers,
      ...taskHandlers,
      ...helpHandlers,
      ...batchHandlers,
    }

    for (const [key, fn] of Object.entries(allHandlers)) {
      bindKey(key, fn)
    }

    // ── Выход (q через screen.on — лочится в промптах; C-c всегда жёстко) ──
    bindKey('q', exit)
    bindKey('escape', exit)
    screen.key('C-c', exit)

    screen.render()
  })
}
