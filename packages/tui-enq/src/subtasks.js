import { state } from './state.js'

/**
 * Найти все uid-потомков заданного родителя (BFS по `parent`).
 * Зачем: одинаковая логика нужна и тогглу, и стартовому collapse.
 * @param {Task[]} tasks
 * @param {string} parentUid
 * @returns {Set<string>}
 */
export function findDescendants(tasks, parentUid) {
  const descendants = new Set()
  const queue = [parentUid]
  while (queue.length > 0) {
    const uid = queue.shift()
    const children = tasks.filter(t => t.parent === uid)
    children.forEach(child => {
      descendants.add(child.uid)
      queue.push(child.uid)
    })
  }
  return descendants
}

/**
 * Пересчитать state.filteredTasks из текущего state._hiddenSubtasks.
 * Зачем: единая точка применения «свёрнутости» к видимому списку.
 */
export function applyHiddenSubtasks() {
  const originalTasks = state._tasks
  const hiddenDescendants = new Set()
  for (const [uid, hidden] of Object.entries(state._hiddenSubtasks)) {
    if (!hidden) continue
    findDescendants(originalTasks, uid).forEach(d => hiddenDescendants.add(d))
  }
  state.filteredTasks = hiddenDescendants.size > 0
    ? originalTasks.filter(t => !hiddenDescendants.has(t.uid))
    : []
}

/**
 * Свернуть подзадачи у всех задач с детьми (стартовое состояние).
 * Зачем: дефолт «всё свёрнуто» по флагу config.tuiCollapseSubtasks.
 */
export function collapseAllSubtasks() {
  const originalTasks = state._tasks
  const parentUids = new Set(
    originalTasks
      .map(t => t.parent)
      .filter(uid => uid && originalTasks.some(t => t.uid === uid))
  )
  for (const uid of parentUids) {
    state._hiddenSubtasks[uid] = true
    const task = originalTasks.find(t => t.uid === uid)
    if (task) {
      task.isHiddenSubtasks = true
      task.hiddenSubtasksCount = originalTasks.filter(t => t.parent === uid).length
    }
  }
  applyHiddenSubtasks()
}
