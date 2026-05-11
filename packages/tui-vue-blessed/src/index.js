/**
 * TUI на neo-blessed + @vue/reactivity.
 * Зачем: альтернатива самописному ANSI-движку @pln/tui-vue —
 * neo-blessed даёт готовые виджеты и layout, @vue/reactivity — реактивный state.
 */
import { runApp } from './App.js'

export const tuiVueBlessed = {
  /**
   * Запускает blessed-TUI с заданным списком задач.
   * @param {import('@pln/core/dto/task.js').default[]} tasks
   * @param {object} [opts]
   * @param {object} [opts.loadFilter] - фильтр загрузки (для refresh)
   * @returns {Promise<void>}
   */
  async run(tasks, opts = {}) {
    if (!tasks?.length) { console.log('Нет задач'); return }
    await runApp(tasks, opts)
  },
}
