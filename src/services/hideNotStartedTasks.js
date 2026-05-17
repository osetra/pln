/** @typedef {import('../dto/task.js').default} Task */

/**
 * Убирает «не начатые» задачи — те, у которых DTSTART задан и ещё не наступил.
 * Зачем: пользователь хочет видеть только то, за что физически можно браться
 * сейчас; задачи, отложенные на будущую дату, в списке только мешают.
 *
 * Задачи без start пропускаются как «начатые» (нет ограничения на старт).
 *
 * @param {Task[]} tasks
 * @returns {Task[]} новый массив без отложенных задач
 */
export default function hideNotStartedTasks(tasks) {
  const now = Date.now()
  return tasks.filter(t => !t.start || new Date(t.start).getTime() <= now)
}
