/**
 * Хэндлеры: CRUD задач, выделение, таймер сессий, отчёт.
 * Зачем: a, s, D, v, V, T, ! — создание/удаление/выделение/тайминг.
 * @module handlers/tasks
 */

import { tasksService } from '@pln/core/services/tasks.js'
import Task from '@pln/core/dto/task.js'

import { promptText, promptConfirm, suspendKeypress, resumeKeypress } from '../input.js'

/**
 * @typedef {(str: string, key: object) => void | Promise<void>} Handler
 */

/** Текущая дата-время в формате "YYYY-MM-DD HH:MM". */
function nowStr() {
  return new Date().toISOString().slice(0, 16).replace('T', ' ')
}

/**
 * Строит обновлённое описание с открытой/закрытой сессией.
 * Использует логику taskSessionsManager для надёжного патчинга YAML.
 * @param {object} task
 * @param {string} now - метка времени "YYYY-MM-DD HH:MM"
 * @returns {string}
 */
function patchSessionDescription(task, now) {
  const description = task.description || ''
  const sessions    = task.customProperties?.sessions || []
  const lastSession = sessions.at(-1)
  const isOpen      = lastSession?.length === 1

  const yamlSep = '---'

  if (isOpen) {
    // Закрываем последнюю сессию: заменяем однозначную запись на двузначную
    return description.replace(
      /(sessions:\s*\n(?:.*\n)*?)(\s*-\s*\[([^\]]+)\])\s*\n(\s*---)/,
      `$1  - [$3, ${now}]\n$4`
    )
  }

  // Открываем новую сессию
  if (!description.startsWith(yamlSep)) {
    return `${yamlSep}\nsessions:\n  - [${now}]\n${yamlSep}\n${description}`
  }

  if (description.includes('sessions:')) {
    // Добавляем строку перед закрывающим ---
    return description.replace(
      /(sessions:\s*\n(?:.*\n)*?)(\s*---)/,
      `$1  - [${now}]\n$2`
    )
  }

  // YAML есть, но sessions: нет — добавляем блок sessions перед ---
  return description.replace(
    /(---\s*\n(?:.*\n)*?)(---)/,
    `$1sessions:\n  - [${now}]\n$2`
  )
}

/**
 * Находит индекс задачи по uid в flatTree.
 * @param {ReturnType<import('../state.js').createState>} state
 * @param {string} uid
 * @returns {number} -1 если не найдена
 */
function findFlatIdx(state, uid) {
  return state.flatTree.value.findIndex(({ task }) => task.uid === uid)
}

/**
 * Возвращает map ключ → обработчик для блока "задачи".
 * @param {ReturnType<import('../state.js').createState>} state
 * @param {() => void} render
 * @returns {Record<string, Handler>}
 */
export function createTaskHandlers(state, render) {
  return {

    /** Добавить задачу-сиблинг (тот же уровень что и текущая). */
    async a() {
      const summary = await promptText('Новая задача:', '')
      if (!summary) { render(); return }

      const parent = state.currentTask.value?.parent || null
      const task   = await tasksService.create(new Task({ summary, parent: parent || undefined }))
      state.rawTasks.value = [...state.rawTasks.value, task]

      const idx = findFlatIdx(state, task.uid)
      if (idx !== -1) state.cursor.value = idx

      render()
    },

    /** Добавить подзадачу (дочернюю к текущей). */
    async s() {
      const summary = await promptText('Новая подзадача:', '')
      if (!summary) { render(); return }

      const parent = state.currentTask.value?.uid || null
      const task   = await tasksService.create(new Task({ summary, parent: parent || undefined }))
      state.rawTasks.value = [...state.rawTasks.value, task]

      const idx = findFlatIdx(state, task.uid)
      if (idx !== -1) state.cursor.value = idx

      render()
    },

    /** Удалить текущую задачу (с подтверждением). */
    async D() {
      const task = state.currentTask.value
      if (!task) return

      const label = 'Удалить задачу? ' + task.summary.slice(0, 40)
      const ok    = await promptConfirm(label)
      if (!ok) { render(); return }

      await tasksService.delete(task.uid, 'uid')
      state.rawTasks.value = state.rawTasks.value.filter(t => t.uid !== task.uid)

      const max = state.maxIdx.value
      if (state.cursor.value > max) state.cursor.value = max

      render()
    },

    /** Toggle выделение текущей задачи. */
    v() {
      const task = state.currentTask.value
      if (!task) return
      const uid      = task.uid
      const selected = state.selected.value.includes(uid)
      state.selected.value = selected
        ? state.selected.value.filter(u => u !== uid)
        : [...state.selected.value, uid]
      render()
    },

    /** Сбросить все выделения. */
    V() {
      state.selected.value = []
      render()
    },

    /** Toggle таймер сессии для текущей задачи. */
    async T() {
      const task = state.currentTask.value
      if (!task) return

      const now     = nowStr()
      const newDesc = patchSessionDescription(task, now)

      await tasksService.update(task, { uid: task.uid, description: newDesc })

      // Обновляем description прямо в объекте задачи и форсируем пересчёт
      task.description = newDesc
      state.rawTasks.value = [...state.rawTasks.value]

      render()
    },

    /** Отчёт по сессиям: суммарные часы на задачу. */
    '!'() {
      // снимаем основной keypress, чтобы клавиша возврата не ушла хэндлерам
      suspendKeypress()

      const withSessions = state.rawTasks.value.filter(
        t => t.customProperties?.sessions?.length > 0
      )

      const CLEAR = '\x1b[H\x1b[2J'
      let out = CLEAR + 'Отчёт по сессиям\n\n'

      for (const t of withSessions) {
        const sessions = t.customProperties.sessions
        let total = 0
        for (const s of sessions) {
          if (s.length === 2) {
            total += (new Date(s[1]) - new Date(s[0])) / 3_600_000
          }
        }
        const hours = total.toFixed(2)
        const open  = sessions.at(-1)?.length === 1 ? ' [активна]' : ''
        out += `  ${t.summary}  — ${hours} ч${open}\n`
      }

      if (!withSessions.length) out += '  Нет задач с сессиями.\n'

      out += '\n[любая клавиша — вернуться]'
      process.stdout.write(out)

      process.stdin.once('keypress', () => { resumeKeypress(); render() })
    },
  }
}
