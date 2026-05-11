/**
 * Адаптер Task[] → данные для vue-timeline-chart
 * @module timelineAdapter
 */

/**
 * Проверяет, пересекается ли набор дат задачи с диапазоном
 * @param {Object} task
 * @param {number} rangeStart - ms
 * @param {number} rangeEnd - ms
 * @returns {boolean}
 */
function taskInRange(task, rangeStart, rangeEnd) {
  const dates = [task.created, task.modified, task.start, task.due, task.completed]
    .filter(Boolean)
    .map(d => d.getTime())

  if (task.start && task.due) {
    const s = task.start.getTime()
    const e = task.due.getTime()
    if (s <= rangeEnd && e >= rangeStart) return true
  }

  return dates.some(d => d >= rangeStart && d <= rangeEnd)
}

/**
 * Преобразует массив задач в groups и items для vue-timeline-chart
 * @param {Task[]} tasks
 * @param {number} rangeStart - ms-таймстамп начала диапазона
 * @param {number} rangeEnd - ms-таймстамп конца диапазона
 * @returns {{ groups: Object[], items: Object[] }}
 */
export function tasksToTimeline(tasks, rangeStart, rangeEnd) {
  const GROUP_ID = 'all'
  const groups = [{ id: GROUP_ID, label: '' }]
  const items = []

  for (const task of tasks) {
    if (!taskInRange(task, rangeStart, rangeEnd)) continue

    if (task.start && task.due) {
      items.push({
        id: task.uid,
        type: 'range',
        start: task.start.getTime(),
        end: task.due.getTime(),
        group: GROUP_ID,
        title: task.summary,
      })
    }

    if (task.created) {
      items.push({ type: 'point', start: task.created.getTime(), group: GROUP_ID, title: task.summary })
    }
    if (task.modified) {
      items.push({ type: 'point', start: task.modified.getTime(), group: GROUP_ID, title: task.summary })
    }
    if (task.completed) {
      items.push({ type: 'point', start: task.completed.getTime(), group: GROUP_ID, title: task.summary })
    }
    if (task.start && !task.due) {
      items.push({ type: 'point', start: task.start.getTime(), group: GROUP_ID, title: task.summary })
    }
    if (task.due && !task.start) {
      items.push({ type: 'point', start: task.due.getTime(), group: GROUP_ID, title: task.summary })
    }
  }

  return { groups, items }
}
