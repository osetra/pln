import Enquirer from 'enquirer'

import { Window } from '#tui/windows/Window/index.js'
import { state }  from '#tui/state.js'
import {
  headerString,
  buildChoices,
  footerString,
  calcTasksHeight,
} from '#tui/windows/TaskPicker/helpers.js'

const FOOTER_HEIGHT = 5

/**
 * Окно выбора задачи-предшественника (DEPENDS-ON). Использует те же
 * хелперы что TaskPicker — рендер задач одинаковый.
 */
export default class PredecessorEditor extends Window {
  constructor() {
    super()

    this.keyHandlers = {
      'j': this.down.bind(this), 'о': this.down.bind(this),
      'k': this.up.bind(this),   'л': this.up.bind(this),
      'q': () => this.prompt.keypress('\x1b', { name: 'escape' }),
      'й': () => this.prompt.keypress('\x1b', { name: 'escape' }),
      'd': this.removePredecessor.bind(this),
      'в': this.removePredecessor.bind(this),
      '?': this.showHelp.bind(this),
    }

    this.open()
  }

  open() {
    if (!state.currentTask) { this.close(); return }

    const tasks = this.#availableTasks()
    const choices = buildChoices(tasks, state.selectedTasks)
    const existing = new Set(state.currentTask.dependsOn || [])
    const initial = tasks
      .map((t, i) => existing.has(t.uid) ? i : -1)
      .filter(i => i >= 0)

    const tasksHeight = calcTasksHeight({
      terminalHeight: process.stdout.rows,
      consoleLinesToKeep: 2,
      headerHeight: headerString(state.tasks, null).split('\n').length,
      footerHeight: FOOTER_HEIGHT,
      tasksCount: tasks.length,
    })

    this.prompt = new Enquirer.MultiSelect({
      limit: tasksHeight,
      message: '⊘ Предшественники — SPACE отметить · ENTER сохранить · d очистить · q отмена',
      choices,
      initial,
      pointer: '⏿ ',
      header: () => headerString(state.tasks, null),
      footer: () => footerString(state.currentTask, FOOTER_HEIGHT),
      result() {
        return this.choices.filter(c => c.enabled).map(c => c.value)
      },
    })

    this.prompt.clear = function() {
      this.state.buffer = ''
      process.stdout.write('\x1b[H\x1b[2J')
    }

    this.prompt.run()
      .then(selectedTasks => this.onSubmit(selectedTasks))
      .catch(() => this.close())
  }

  /**
   * Возвращает задачи, доступные для выбора (без текущей и её поддерева).
   * @returns {Object[]}
   */
  #availableTasks() {
    const cur = state.currentTask
    const blocked = new Set([cur.uid])
    const collectDescendants = (uid) => {
      for (const t of state.tasks) {
        if (t.parent === uid && !blocked.has(t.uid)) {
          blocked.add(t.uid)
          collectDescendants(t.uid)
        }
      }
    }
    collectDescendants(cur.uid)
    return state.tasks.filter(t => !blocked.has(t.uid))
  }

  async onSubmit(selectedTasks) {
    if (!Array.isArray(selectedTasks)) return this.close()
    const newUids = selectedTasks.map(t => t.uid)
    const oldUids = state.currentTask.dependsOn || []

    // защита от случайного Enter без отметок: ничего не отмечено, но раньше
    // было — не затираем. Для очистки используется `d`.
    if (newUids.length === 0 && oldUids.length > 0) return this.close()

    const sameSet = newUids.length === oldUids.length
      && newUids.every(u => oldUids.includes(u))
    if (sameSet) return this.close()

    this.updateTaskProp({ dependsOn: newUids })
    return this.close()
  }

  async removePredecessor() {
    if (!state.currentTask.dependsOn?.length) return this.close()
    this.updateTaskProp({ dependsOn: [] })
    return this.close()
  }
}
