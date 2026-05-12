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
      'l': () => this.prompt.submit(),
      'д': () => this.prompt.submit(),
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
    const initial = this.#findInitial(tasks)

    const tasksHeight = calcTasksHeight({
      terminalHeight: process.stdout.rows,
      consoleLinesToKeep: 2,
      headerHeight: headerString(state.tasks, null).split('\n').length,
      footerHeight: FOOTER_HEIGHT,
      tasksCount: tasks.length,
    })

    this.prompt = new Enquirer.Select({
      limit: tasksHeight,
      message: '⊘ Выбор предшественника (d — убрать, q — отмена):',
      choices,
      initial,
      pointer: '⏿ ',
      header: () => headerString(state.tasks, null),
      footer: () => footerString(state.currentTask, FOOTER_HEIGHT),
    })

    this.prompt.clear = function() {
      this.state.buffer = ''
      process.stdout.write('\x1b[H\x1b[2J')
    }

    this.prompt.run()
      .then(chosen => this.onSelect(chosen?.uid))
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

  /**
   * Индекс текущего предшественника в списке (или 0).
   * @param {Object[]} tasks
   * @returns {number}
   */
  #findInitial(tasks) {
    const existing = state.currentTask.dependsOn?.[0]
    if (!existing) return 0
    const idx = tasks.findIndex(t => t.uid === existing)
    return idx >= 0 ? idx : 0
  }

  async onSelect(uid) {
    if (!uid) return this.close()
    const current = state.currentTask.dependsOn?.[0]
    if (uid === current) return this.close()

    this.updateTaskProp({ dependsOn: [uid] })
    return this.close()
  }

  async removePredecessor() {
    if (!state.currentTask.dependsOn?.length) return this.close()
    this.updateTaskProp({ dependsOn: [] })
    return this.close()
  }
}
