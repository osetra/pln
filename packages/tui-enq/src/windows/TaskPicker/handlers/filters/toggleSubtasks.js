import { state } from '#tui/state.js'
import { applyHiddenSubtasks } from '#tui/subtasks.js'

export default {
  keys: ['h', 'р'],
  description: 'Показать/скрыть подзадачи',
  action() {
    if (!state.currentTask) return

    const currentUid = state.currentTask.uid
    const originalTasks = state._tasks

    const hasChildren = originalTasks.some(task => task.parent === currentUid)
    if (!hasChildren) {
      console.debug('⚠️ У задачи нет детей')
      return
    }

    const isHidden = state._hiddenSubtasks[currentUid] || false
    state._hiddenSubtasks[currentUid] = !isHidden
    state.currentTask.isHiddenSubtasks = !isHidden
    state.currentTask.hiddenSubtasksCount = !isHidden
      ? originalTasks.filter(t => t.parent === currentUid).length
      : 0

    applyHiddenSubtasks()

    // если currentTask теперь скрыта — переводим на видимого предка
    // или на первую видимую, чтобы не упасть при rerender
    const visibleTasks = state.filteredTasks.length > 0 ? state.filteredTasks : originalTasks
    if (state.currentTask && !visibleTasks.some(t => t.uid === state.currentTask.uid)) {
      let ancestorUid = state.currentTask.parent
      while (ancestorUid && !visibleTasks.some(t => t.uid === ancestorUid)) {
        const ancestor = originalTasks.find(t => t.uid === ancestorUid)
        ancestorUid = ancestor?.parent
      }
      const visibleAncestor = ancestorUid && visibleTasks.find(t => t.uid === ancestorUid)
      state.currentTask = visibleAncestor || visibleTasks[0] || null
    }

    this.freeze()
    this.open()
  }
}
