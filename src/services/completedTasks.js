/** @typedef {import('../dto/task.js').default} Task */

/**
 * Сервис фильтрации задач по дате завершения.
 * Зачем: единая точка для CLI/TUI/web, чтобы "выполнены за N дней"
 *   считалось одинаково и не размазывалось по UI.
 */
export const completedTasksService = {

  /**
   * Возвращает задачи, завершённые за последние `daysBack` дней.
   * Сегодня = 0 (т.е. daysBack=1 — только сегодня).
   * @param {Task[]} tasks
   * @param {number} daysBack
   * @returns {Task[]}
   */
  completedInDays(tasks, daysBack) {
    const now = new Date()
    return tasks.filter(t => {
      if (t.status !== 'COMPLETED') return false
      if (!t.completed) return false
      const completedDate = new Date(t.completed)
      const daysDiff = Math.floor((now - completedDate) / (1000 * 60 * 60 * 24))
      return daysDiff < daysBack
    })
  },

}
