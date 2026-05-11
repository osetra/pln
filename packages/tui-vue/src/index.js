/**
 * TUI на Vue reactivity с прямым выводом в терминал.
 * Зачем: vue-termui имеет проблемы совместимости с Node 25 —
 * используем только @vue/reactivity для реактивного состояния.
 */
import { runApp } from './App.js'

export const tuiVue = {
  /**
   * Запускает TUI с заданным списком задач.
   * @param {import('@pln/core/dto/task.js').default[]} tasks
   * @returns {Promise<void>}
   */
  /**
   * @param {object} [opts]
   * @param {object} [opts.loadFilter]
   */
  async run(tasks, opts = {}) {
    if (!tasks || tasks.length === 0) {
      console.log('Нет задач')
      return
    }
    await runApp(tasks, opts)
  },
}
