import TaskForm from '#tui/windows/TaskForm.js'
import { state } from '#tui/state.js'

export default {
    keys: ['a', 'ф'],
    description: 'Добавить задачу',
    action() {
        if (state.currentTask) {
            const parentUid = state.currentTask.parent || null
            new TaskForm(parentUid)
        } else {
            new TaskForm(null)
        }
    }
}
