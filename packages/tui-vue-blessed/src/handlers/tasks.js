/**
 * Хэндлеры: CRUD задач, выделение, таймер сессий, отчёт.
 * Зачем: a, s, D, v, V, T, ! — создание/удаление/выделение/тайминг.
 * @module handlers/tasks
 */
import blessed from 'neo-blessed'

import { tasksService } from '@pln/core/services/tasks.js'
import Task from '@pln/core/dto/task.js'

import { promptText, promptConfirm } from '../input.js'
import { toast } from '../animations.js'

/**
 * @typedef {(str?: string, key?: object) => void | Promise<void>} Handler
 */

/**
 * Текущая дата-время в формате "YYYY-MM-DD HH:MM" (UTC slice).
 * @returns {string}
 */
function nowStr() {
  return new Date().toISOString().slice(0, 16).replace('T', ' ')
}

/**
 * Строит обновлённое описание с открытой/закрытой сессией.
 * Логика идентична @pln/tui-vue/handlers/tasks.js — патчинг YAML-блока sessions.
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
    return description.replace(
      /(sessions:\s*\n(?:.*\n)*?)(\s*-\s*\[([^\]]+)\])\s*\n(\s*---)/,
      `$1  - [$3, ${now}]\n$4`
    )
  }

  if (!description.startsWith(yamlSep)) {
    return `${yamlSep}\nsessions:\n  - [${now}]\n${yamlSep}\n${description}`
  }

  if (description.includes('sessions:')) {
    return description.replace(
      /(sessions:\s*\n(?:.*\n)*?)(\s*---)/,
      `$1  - [${now}]\n$2`
    )
  }

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
 * Полноэкранный отчёт по сессиям. Закрывается любой клавишей.
 * @param {object} screen - blessed.screen
 * @param {object[]} tasks - rawTasks
 */
function showSessionsReport(screen, tasks) {
  const withSessions = tasks.filter(t => t.customProperties?.sessions?.length > 0)

  let body = '{bold}Отчёт по сессиям{/}\n\n'
  if (!withSessions.length) {
    body += '  Нет задач с сессиями.\n'
  } else {
    for (const t of withSessions) {
      const sessions = t.customProperties.sessions
      let total = 0
      for (const s of sessions) {
        if (s.length === 2) total += (new Date(s[1]) - new Date(s[0])) / 3_600_000
      }
      const hours = total.toFixed(2)
      const open  = sessions.at(-1)?.length === 1 ? ' {yellow-fg}[активна]{/}' : ''
      body += `  ${t.summary}  — ${hours} ч${open}\n`
    }
  }

  const box = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '80%',
    height: '80%',
    border: 'line',
    label: ' report ',
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    mouse: false,
    content: body + '\n{gray-fg}(любая клавиша — закрыть){/}',
    style: { border: { fg: 'cyan' } },
  })

  const prevGrab = screen.grabKeys
  screen.grabKeys = true
  screen.saveFocus()
  box.focus()
  box.once('keypress', () => {
    box.destroy()
    screen.grabKeys = prevGrab
    screen.restoreFocus()
    screen.render()
  })
  screen.render()
}

/**
 * Возвращает map ключ → обработчик для блока "задачи".
 * @param {ReturnType<import('../state.js').createState>} state
 * @param {() => void} render
 * @param {object} screen - blessed.screen
 * @returns {Record<string, Handler>}
 */
export function createTaskHandlers(state, render, screen) {
  return {

    /** Добавить задачу-сиблинг (тот же уровень что и текущая). */
    async a() {
      const summary = await promptText(screen, 'Новая задача:', '')
      if (!summary) { render(); return }

      const parent = state.currentTask.value?.parent || null
      const task   = await tasksService.create(new Task({ summary, parent: parent || undefined }))
      state.rawTasks.value = [...state.rawTasks.value, task]

      const idx = findFlatIdx(state, task.uid)
      if (idx !== -1) state.cursor.value = idx
      toast(screen, 'Создано')
      render()
    },

    /** Добавить подзадачу (дочернюю к текущей). */
    async s() {
      const summary = await promptText(screen, 'Новая подзадача:', '')
      if (!summary) { render(); return }

      const parent = state.currentTask.value?.uid || null
      const task   = await tasksService.create(new Task({ summary, parent: parent || undefined }))
      state.rawTasks.value = [...state.rawTasks.value, task]

      const idx = findFlatIdx(state, task.uid)
      if (idx !== -1) state.cursor.value = idx
      toast(screen, 'Создано')
      render()
    },

    /** Удалить текущую задачу (с подтверждением). */
    'S-d': async () => {
      const task = state.currentTask.value
      if (!task) return

      const label = 'Удалить задачу? ' + (task.summary || '').slice(0, 40)
      const ok = await promptConfirm(screen, label)
      if (!ok) { render(); return }

      await tasksService.delete(task.uid, 'uid')
      state.rawTasks.value = state.rawTasks.value.filter(t => t.uid !== task.uid)

      const max = state.maxIdx.value
      if (state.cursor.value > max) state.cursor.value = max
      toast(screen, 'Удалено', { color: 'red' })
      render()
    },

    /** Toggle выделение текущей задачи. */
    v() {
      const task = state.currentTask.value
      if (!task) return
      const uid = task.uid
      const selected = state.selected.value.includes(uid)
      state.selected.value = selected
        ? state.selected.value.filter(u => u !== uid)
        : [...state.selected.value, uid]
      render()
    },

    /** Сбросить все выделения. */
    'S-v': () => {
      state.selected.value = []
      render()
    },

    /** Toggle таймер сессии для текущей задачи. */
    'S-t': async () => {
      const task = state.currentTask.value
      if (!task) return

      const wasOpen = task.customProperties?.sessions?.at(-1)?.length === 1
      const now = nowStr()
      const newDesc = patchSessionDescription(task, now)

      await tasksService.update(task, { uid: task.uid, description: newDesc })
      task.description = newDesc
      state.rawTasks.value = [...state.rawTasks.value]
      toast(screen, wasOpen ? 'Таймер OFF' : 'Таймер ON', { color: wasOpen ? 'yellow' : 'cyan' })
      render()
    },

    /** Полноэкранный отчёт по сессиям. */
    '!'() {
      showSessionsReport(screen, state.rawTasks.value)
    },
  }
}
