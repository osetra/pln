/**
 * Хэндлеры: редакторы полей задачи.
 * Зачем: S, t, A, I, l, p, ;, c, P — изменение полей с сохранением в CalDAV.
 * @module handlers/editors
 */
import { tasksService } from '@pln/core/services/tasks.js'
import { externalEditor } from '@pln/core/utils/external-editor.js'

import { promptText, promptNumber, promptSelect } from '../input.js'
import { toast } from '../animations.js'

/**
 * @typedef {(str?: string, key?: object) => void | Promise<void>} Handler
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
 * Открывает description во внешнем редакторе. Используется core-utility,
 * пишущий во временный .md (для подсветки в редакторе). Blessed
 * leave/enter — отдать и вернуть TTY.
 * @param {object} screen - blessed.screen
 * @param {string} initial - текущее описание
 * @param {string} name - prefix имени файла
 * @returns {Promise<string|null>}
 */
async function openEditor(screen, initial, name) {
  screen.leave()
  try {
    return await externalEditor.openTextInEditor(initial, name)
  } finally {
    screen.enter()
    screen.render()
  }
}

/**
 * Возвращает map ключ → обработчик для блока "редакторы".
 * @param {ReturnType<import('../state.js').createState>} state
 * @param {() => void} render
 * @param {object} screen - blessed.screen
 * @returns {Record<string, Handler>}
 */
export function createEditorHandlers(state, render, screen) {
  /** applyField + toast «Сохранено». */
  const save = async (task, field, newVal) => {
    await applyField(task, field, newVal, state.rawTasks)
    toast(screen, 'Сохранено')
  }

  return {

    /** Изменить статус задачи (одной или всех выделенных). */
    'S-s': async () => {
      const choices = [
        { label: '[ ] NEEDS-ACTION', value: 'NEEDS-ACTION' },
        { label: '[x] COMPLETED',    value: 'COMPLETED' },
        { label: '[-] CANCELLED',    value: 'CANCELLED' },
      ]
      if (state.selected.value.length > 0) {
        const newStatus = await promptSelect(screen, 'Статус (все выделенные):', choices, 'NEEDS-ACTION')
        if (!newStatus) { render(); return }
        for (const uid of state.selected.value) {
          const task = state.rawTasks.value.find(t => t.uid === uid)
          if (!task) continue
          task.status = newStatus
          await tasksService.update(task, { uid: task.uid, status: newStatus })
        }
        state.rawTasks.value = [...state.rawTasks.value]
        toast(screen, `Сохранено: ${state.selected.value.length}`)
        render()
        return
      }
      const task = state.currentTask.value
      if (!task) return
      const newVal = await promptSelect(screen, 'Статус:', choices, task.status)
      if (newVal === null || newVal === task.status) { render(); return }
      await save(task, 'status', newVal)
      render()
    },

    /** Заменить summary через текстовый ввод. */
    't': async () => {
      const task = state.currentTask.value
      if (!task) return
      const newVal = await promptText(screen, 'Summary:', task.summary)
      if (newVal === null || newVal === task.summary) { render(); return }
      await save(task, 'summary', newVal)
      render()
    },

    /** Дополнить summary (append). */
    'S-a': async () => {
      const task = state.currentTask.value
      if (!task) return
      const append = await promptText(screen, 'Добавить к summary:', '')
      if (append === null) { render(); return }
      const newVal = task.summary + ' ' + append
      await save(task, 'summary', newVal)
      render()
    },

    /** Вставить префикс в начало summary (prepend). */
    'S-i': async () => {
      const task = state.currentTask.value
      if (!task) return
      const prefix = await promptText(screen, 'Вставить в начало:', '')
      if (prefix === null) { render(); return }
      const newVal = prefix + ' ' + task.summary
      await save(task, 'summary', newVal)
      render()
    },

    /** Редактировать description во внешнем редакторе ($EDITOR / vi). */
    'l': async () => {
      const task = state.currentTask.value
      if (!task) return
      const initial = task.description || ''
      const name = (task.summary?.slice(0, 20) || 'pln-edit').replace(/[^\w-]/g, '_')
      const result = await openEditor(screen, initial, name)
      if (result === null || result === initial) { render(); return }
      await save(task, 'description', result)
      render()
    },

    /** Изменить приоритет (0-9). */
    'p': async () => {
      const task = state.currentTask.value
      if (!task) return
      const n = await promptNumber(screen, 'Приоритет (0-9):', task.priority || 0)
      if (n === null) { render(); return }
      const newVal = Math.max(0, Math.min(9, n))
      if (newVal === task.priority) { render(); return }
      await save(task, 'priority', newVal)
      render()
    },

    /** Изменить дату due (YYYY-MM-DD). */
    ';': async () => {
      const task = state.currentTask.value
      if (!task) return
      const initial = task.due ? new Date(task.due).toISOString().slice(0, 10) : ''
      const answer = await promptText(screen, 'Due date (YYYY-MM-DD):', initial)
      if (answer === null) { render(); return }
      const date = new Date(answer)
      if (Number.isNaN(date.getTime())) { render(); return }
      await save(task, 'due', date)
      render()
    },

    /** Изменить категории (через запятую). */
    'c': async () => {
      const task = state.currentTask.value
      if (!task) return
      const initial = (task.categories || []).join(', ')
      const answer = await promptText(screen, 'Категории (через запятую):', initial)
      if (answer === null) { render(); return }
      const newVal = answer.split(',').map(s => s.trim()).filter(Boolean)
      await save(task, 'categories', newVal)
      render()
    },

    /** Изменить родителя задачи через select по списку всех задач. */
    'S-p': async () => {
      const task = state.currentTask.value
      if (!task) return
      const choices = [
        { label: '(без родителя)', value: '' },
        ...state.rawTasks.value
          .filter(t => t.uid !== task.uid)
          .map(t => ({ label: t.summary, value: t.uid })),
      ]
      const newVal = await promptSelect(screen, 'Родитель:', choices, task.parent || '')
      if (newVal === null) { render(); return }
      const parent = newVal === '' ? undefined : newVal
      if (parent === task.parent) { render(); return }
      await save(task, 'parent', parent)
      render()
    },
  }
}
