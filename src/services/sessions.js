/** @typedef {import('../dto/task.js').default} Task */

/**
 * Сервис фильтров над сессиями задач.
 * Зачем: единая точка для CLI/TUI/web — что считается "активной сессией"
 *   и как из набора задач выделить те, на которых таймер сейчас идёт.
 */
export const sessionsService = {

  /**
   * Возвращает задачи с активной (начатой, но не закрытой) сессией.
   * Использует `task.customProperties.hasActiveSession` — флаг ставит analizator.
   * @param {Task[]} tasks
   * @returns {Task[]}
   */
  withActive(tasks) {
    return tasks.filter(t => t.customProperties?.hasActiveSession === true)
  },

}
