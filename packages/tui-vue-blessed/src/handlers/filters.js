/**
 * Хэндлеры: фильтры, поиск, обновление задач.
 * Зачем: x, h, /, r — навигация без записи в CalDAV (только меняет state).
 * @module handlers/filters
 */
import { invalidateTasks, loadTasks } from '@pln/core/cache/query-client.js'

import { promptText } from '../input.js'
import { startSpinner, pulseFound, toast } from '../animations.js'

/**
 * @typedef {(str?: string, key?: object) => void | Promise<void>} Handler
 */

/**
 * Возвращает map ключ → обработчик для блока "фильтры".
 * @param {ReturnType<import('../state.js').createState>} state
 * @param {() => void} render
 * @param {object} screen - blessed.screen
 * @param {object} opts
 * @param {object} [opts.loadFilter] - фильтр загрузки (для refresh)
 * @returns {Record<string, Handler>}
 */
export function createFilterHandlers(state, render, screen, opts = {}) {
  return {

    /** Переключить фильтр активных задач (скрывает COMPLETED/someday/cancel). */
    x: () => {
      state.activeOnly.value = !state.activeOnly.value
      render()
    },

    /** Свернуть/развернуть подзадачи текущей задачи. */
    h: () => {
      const task = state.currentTask.value
      if (!task) return
      state.hiddenSubs.value = {
        ...state.hiddenSubs.value,
        [task.uid]: !state.hiddenSubs.value[task.uid],
      }
      render()
    },

    /** Обновить список задач с сервера и сбросить курсор. */
    r: async () => {
      const stop = startSpinner(screen, 'Обновление…')
      const minDelay = new Promise(r => setTimeout(r, 350))
      try {
        await invalidateTasks()
        const tasks = await loadTasks(opts.loadFilter)
        state.rawTasks.value = tasks
        state.cursor.value = 0
        await minDelay
      } finally {
        stop()
      }
      toast(screen, 'Обновлено', { ms: 1200 })
      render()
    },

    /**
     * Inline-поиск по summary: разворачивает предков найденной задачи
     * и перематывает курсор на её позицию во flatTree.
     */
    '/': async () => {
      const query = await promptText(screen, 'Поиск (summary):', '')
      if (!query) { render(); return }

      const q = query.toLowerCase()
      const found = state.tasks.value.find(t => t.summary?.toLowerCase().includes(q))
      if (!found) { toast(screen, 'Не найдено', { ms: 1000, color: 'red' }); render(); return }

      const byUid = new Map(state.tasks.value.map(t => [t.uid, t]))
      const hidden = { ...state.hiddenSubs.value }
      let cur = found
      while (cur.parent && byUid.has(cur.parent)) {
        if (hidden[cur.parent]) hidden[cur.parent] = false
        cur = byUid.get(cur.parent)
      }
      state.hiddenSubs.value = hidden

      const idx = state.flatTree.value.findIndex(({ task }) => task.uid === found.uid)
      if (idx >= 0) state.cursor.value = idx
      render()
      pulseFound(screen, found.summary || '')
    },
  }
}
