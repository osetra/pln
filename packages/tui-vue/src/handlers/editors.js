/**
 * Хэндлеры: редакторы полей задачи.
 * Зачем: S, t, A, I, l, p, ;, c, P — изменение полей с сохранением в CalDAV.
 * @module handlers/editors
 */

import { tasksService } from '@pln/core/services/tasks.js'
import { externalEditor } from '@pln/core/utils/external-editor.js'

import { promptText, promptNumber, promptSelect, suspendInput, resumeInput } from '../input.js'

/**
 * @typedef {(str: string, key: object) => void | Promise<void>} Handler
 */

/**
 * Обновляет поле задачи локально и в CalDAV.
 * @param {object} task - задача
 * @param {string} field - имя поля
 * @param {*} newVal - новое значение
 * @param {import('@vue/reactivity').Ref} rawTasksRef - ref массива задач
 * @returns {Promise<void>}
 */
async function applyField(task, field, newVal, rawTasksRef) {
  task[field] = newVal
  rawTasksRef.value = rawTasksRef.value.map(t => t.uid === task.uid ? task : t)
  await tasksService.update(task, { uid: task.uid, [field]: newVal })
}

/**
 * Возвращает map ключ → обработчик для блока "редакторы".
 * @param {ReturnType<import('../state.js').createState>} state
 * @param {() => void} render
 * @returns {Record<string, Handler>}
 */
export function createEditorHandlers(state, render) {
  return {

    /** Изменить статус задачи через меню выбора; если есть выделенные — применяет ко всем */
    'S': async () => {
      const choices = [
        { label: '[ ] NEEDS-ACTION', value: 'NEEDS-ACTION' },
        { label: '[x] COMPLETED',    value: 'COMPLETED' },
        { label: '[-] CANCELLED',    value: 'CANCELLED' },
      ]
      if (state.selected.value.length > 0) {
        const newStatus = await promptSelect('Статус (все выделенные):', choices, 'NEEDS-ACTION')
        if (!newStatus) { render(); return }
        for (const uid of state.selected.value) {
          const task = state.rawTasks.value.find(t => t.uid === uid)
          if (!task) continue
          task.status = newStatus
          await tasksService.update(task, { uid: task.uid, status: newStatus })
        }
        state.rawTasks.value = [...state.rawTasks.value]
        render()
        return
      }
      const task = state.currentTask.value
      if (!task) return
      const newVal = await promptSelect('Статус:', choices, task.status)
      if (newVal === null || newVal === task.status) { render(); return }
      await applyField(task, 'status', newVal, state.rawTasks)
      render()
    },

    /** Заменить summary через текстовый ввод */
    't': async () => {
      const task = state.currentTask.value
      if (!task) return
      const newVal = await promptText('Summary:', task.summary)
      if (newVal === null || newVal === task.summary) { render(); return }
      await applyField(task, 'summary', newVal, state.rawTasks)
      render()
    },

    /** Дополнить summary (append) */
    'A': async () => {
      const task = state.currentTask.value
      if (!task) return
      const append = await promptText('Добавить к summary:', '')
      if (append === null) { render(); return }
      const newVal = task.summary + ' ' + append
      await applyField(task, 'summary', newVal, state.rawTasks)
      render()
    },

    /** Вставить префикс в начало summary (prepend) */
    'I': async () => {
      const task = state.currentTask.value
      if (!task) return
      const prefix = await promptText('Вставить в начало:', '')
      if (prefix === null) { render(); return }
      const newVal = prefix + ' ' + task.summary
      await applyField(task, 'summary', newVal, state.rawTasks)
      render()
    },

    /** Редактировать description во внешнем редакторе */
    'l': async () => {
      const task = state.currentTask.value
      if (!task) return
      const initial = task.description || ''
      suspendInput()
      const result = await externalEditor.openTextInEditor(initial, task.summary?.slice(0, 20) || 'pln-edit')
      resumeInput()
      if (result === null || result === initial) { render(); return }
      await applyField(task, 'description', result, state.rawTasks)
      render()
    },

    /** Изменить приоритет (0–9) */
    'p': async () => {
      const task = state.currentTask.value
      if (!task) return
      const n = await promptNumber('Приоритет (0-9):', task.priority || 0)
      if (n === null) { render(); return }
      const newVal = Math.max(0, Math.min(9, n))
      if (newVal === task.priority) { render(); return }
      await applyField(task, 'priority', newVal, state.rawTasks)
      render()
    },

    /** Изменить дату due (YYYY-MM-DD) */
    ';': async () => {
      const task = state.currentTask.value
      if (!task) return
      const initial = task.due ? new Date(task.due).toISOString().slice(0, 10) : ''
      const answer = await promptText('Due date (YYYY-MM-DD):', initial)
      if (answer === null) { render(); return }
      const date = new Date(answer)
      if (isNaN(date.getTime())) { render(); return }
      await applyField(task, 'due', date, state.rawTasks)
      render()
    },

    /** Изменить категории (через запятую) */
    'c': async () => {
      const task = state.currentTask.value
      if (!task) return
      const initial = (task.categories || []).join(', ')
      const answer = await promptText('Категории (через запятую):', initial)
      if (answer === null) { render(); return }
      const newVal = answer.split(',').map(s => s.trim()).filter(Boolean)
      await applyField(task, 'categories', newVal, state.rawTasks)
      render()
    },

    /** Изменить родителя задачи */
    'P': async () => {
      const task = state.currentTask.value
      if (!task) return
      const choices = [
        { label: '(без родителя)', value: '' },
        ...state.rawTasks.value
          .filter(t => t.uid !== task.uid)
          .map(t => ({ label: t.summary, value: t.uid })),
      ]
      const newVal = await promptSelect('Родитель:', choices, task.parent || '')
      if (newVal === null) { render(); return }
      const parent = newVal === '' ? undefined : newVal
      if (parent === task.parent) { render(); return }
      await applyField(task, 'parent', parent, state.rawTasks)
      render()
    },
  }
}
