import { state } from '#tui/state.js'

export default {
    keys: ['v', 'м'],
    description: 'Выделить/снять выделение с задачи',
    action() {
        const task = state.currentTask
        if (!task) return

        const idx = state.selectedTasks.findIndex(t => t.uid === task.uid)
        if (idx >= 0) {
            state.selectedTasks.splice(idx, 1)
        } else {
            state.selectedTasks.push(task)
        }

        // Переходим на следующую задачу и перерисовываем
        this.down()
        this.freeze()
        this.open()
    }
}
