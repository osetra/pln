/**
 * TUI: главный цикл — ввод + рендер.
 * Зачем: соединяет state, render и handlers; не содержит логики сам.
 */
import readline from 'readline'
import { watch } from '@vue/reactivity'

import { createState } from './state.js'
import { renderFrame } from './render.js'
import { createFilterHandlers } from './handlers/filters.js'
import { createEditorHandlers } from './handlers/editors.js'
import { createTaskHandlers } from './handlers/tasks.js'
import { createHelpHandlers } from './handlers/help.js'
import { createBatchHandlers } from './handlers/batch.js'

const HIDE_CURSOR = '\x1b[?25l'
const SHOW_CURSOR = '\x1b[?25h'
const ALT_ON      = '\x1b[?1049h'
const ALT_OFF     = '\x1b[?1049l'

/**
 * Запускает TUI-приложение.
 * @param {object[]} tasks
 * @param {object} [opts]
 * @param {object} [opts.loadFilter] - фильтр загрузки (для refresh)
 * @returns {Promise<void>}
 */
export function runApp(tasks, opts = {}) {
  return new Promise(resolve => {
    const state = createState(tasks)
    const { cursor, maxIdx } = state

    const render = () => renderFrame(state)

    process.stdout.on('resize', render)

    // handlers
    const filterHandlers = createFilterHandlers(state, render, opts)
    const editorHandlers = createEditorHandlers(state, render)
    const taskHandlers   = createTaskHandlers(state, render)
    const helpHandlers   = createHelpHandlers(state, render)
    const batchHandlers  = createBatchHandlers(state, render)

    const allHandlers = { ...filterHandlers, ...editorHandlers, ...taskHandlers, ...helpHandlers, ...batchHandlers }

    // вход в alt-screen ДО первого рендера: иначе кадр уйдёт в основной буфер
    process.stdin.setRawMode(true)
    readline.emitKeypressEvents(process.stdin)
    process.stdout.write(ALT_ON + HIDE_CURSOR)

    // реактивный ре-рендер при изменении cursor; stop() при выходе
    const stop      = watch(cursor, render, { immediate: true })
    const stopRaw    = watch(state.rawTasks, render)
    const stopActive = watch(state.activeOnly, render)

    /** Финальный fallback на случай аварии без exit(). */
    function onProcessExit() {
      if (!exiting) process.stdout.write(ALT_OFF + SHOW_CURSOR)
    }

    /** Обработчик SIGINT с гарантированным завершением. */
    function onSigint() { exit(); process.exit(0) }

    // выход
    let exiting = false
    function exit() {
      if (exiting) return
      exiting = true
      stop()
      stopRaw()
      stopActive()
      process.stdout.removeListener('resize', render)
      process.stdin.removeListener('keypress', onKeypress)
      process.off('exit', onProcessExit)
      process.off('SIGINT', onSigint)
      process.stdin.setRawMode(false)
      process.stdout.write(ALT_OFF + SHOW_CURSOR)
      resolve()
      // event loop держится readline.emitKeypressEvents даже после
      // pause/unref — выходим явно, чтобы не требовать Ctrl+C от юзера
      process.exit(0)
    }

    async function onKeypress(str, key) {
      if (!key) return

      // системные
      if (key.ctrl && key.name === 'c') { exit(); return }
      const k = key.name

      // выход
      if (str === 'q' || k === 'escape') { exit(); return }

      // навигация (всегда доступна)
      if (k === 'j' || k === 'down')    { cursor.value = Math.min(maxIdx.value, cursor.value + 1); return }
      if (k === 'k' || k === 'up')      { cursor.value = Math.max(0, cursor.value - 1); return }
      if (str === 'g')                   { cursor.value = 0; return }
      if (str === 'G')                   { cursor.value = maxIdx.value; return }
      const half = Math.floor((process.stdout.rows || 24) / 2)
      if (k === 'pagedown' || str === ' ') { cursor.value = Math.min(maxIdx.value, cursor.value + half); return }
      if (k === 'pageup'   || str === 'u') { cursor.value = Math.max(0, cursor.value - half); return }

      // расширенные хэндлеры (str первым — для регистрозависимых клавиш S/s, D/d и т.п.)
      const handler = allHandlers[str] ?? allHandlers[k]
      if (handler) await handler(str, key)
    }

    process.stdin.on('keypress', onKeypress)

    process.on('exit', onProcessExit)
    process.on('SIGINT', onSigint)
  })
}
