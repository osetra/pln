/**
 * Хэндлеры: фильтры, поиск, обновление задач.
 * Зачем: x, h, /, r — навигация без записи в CalDAV.
 * @module handlers/filters
 */

import { invalidateTasks, loadTasks } from '@pln/core/cache/query-client.js'

import { promptText } from '../input.js'

/**
 * @typedef {import('../state.js').createState} State
 * @typedef {(str: string, key: object) => void | Promise<void>} Handler
 */

/**
 * Возвращает map ключ → обработчик для блока "фильтры".
 * @param {ReturnType<import('../state.js').createState>} state
 * @param {() => void} render
 * @param {object} opts
 * @param {import('@pln/core/dto/filter.js').Filter} [opts.loadFilter]
 * @returns {Record<string, Handler>}
 */
export function createFilterHandlers(state, render, opts = {}) {
  return {
    /**
     * Переключает фильтр активных задач (скрывает COMPLETED, someday, cancel).
     */
    x: () => {
      state.activeOnly.value = !state.activeOnly.value
      render()
    },

    /**
     * Скрывает/показывает подзадачи текущей задачи.
     */
    h: () => {
      const task = state.currentTask.value
      if (!task) return
      const uid = task.uid
      state.hiddenSubs.value = {
        ...state.hiddenSubs.value,
        [uid]: !state.hiddenSubs.value[uid],
      }
      render()
    },

    /**
     * Обновляет список задач с сервера и сбрасывает курсор.
     */
    r: async () => {
      await invalidateTasks()
      const tasks = await loadTasks(opts.loadFilter)
      state.rawTasks.value = tasks
      state.cursor.value = 0
      render()
    },

    /**
     * Inline-поиск по summary: ищет среди всех задач (с учётом activeOnly),
     * разворачивает свёрнутых предков найденной, перематывает курсор.
     */
    '/': async () => {
      const query = await promptText('Поиск (summary):', '')
      if (!query) { render(); return }

      const q = query.toLowerCase()
      const found = state.tasks.value.find(
        t => t.summary?.toLowerCase().includes(q)
      )
      if (!found) { render(); return }

      // Развернуть всех предков, чтобы задача попала во flatTree
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
    },
  }
}
