/**
 * Хэндлеры: быстрые действия над текущей задачей.
 * Зачем: Enter/e — toggle статуса одной клавишей без открытия меню.
 * @module handlers/batch
 */
import { tasksService } from '@pln/core/services/tasks.js'

/**
 * @typedef {(str?: string, key?: object) => void | Promise<void>} Handler
 */

/**
 * Toggle статуса текущей задачи (NEEDS-ACTION ↔ COMPLETED).
 * @param {ReturnType<import('../state.js').createState>} state
 * @param {() => void} render
 * @returns {Promise<void>}
 */
async function toggleCurrentTaskStatus(state, render) {
  const task = state.currentTask.value
  if (!task) return
  const newStatus = task.status === 'COMPLETED' ? 'NEEDS-ACTION' : 'COMPLETED'
  await tasksService.update(task, { uid: task.uid, status: newStatus })
  task.status = newStatus
  state.rawTasks.value = [...state.rawTasks.value]
  render()
}

/**
 * Возвращает map ключ → обработчик для блока "быстрые действия".
 * @param {ReturnType<import('../state.js').createState>} state
 * @param {() => void} render
 * @returns {Record<string, Handler>}
 */
export function createBatchHandlers(state, render) {
  return {
    /** Toggle статуса текущей задачи через Enter. */
    'enter': async () => { await toggleCurrentTaskStatus(state, render) },

    /** Toggle статуса текущей задачи через e. */
    'e': async () => { await toggleCurrentTaskStatus(state, render) },
  }
}
