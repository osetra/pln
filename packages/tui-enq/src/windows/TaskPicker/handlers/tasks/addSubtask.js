import TaskForm from '#tui/windows/TaskForm.js'
import { state } from '#tui/state.js'

export default {
    keys: ['s', 'ы'],
    description: 'Добавить подзадачу',
    action() {
        if (state.currentTask) {
            new TaskForm(state.currentTask.uid)
        }
    }
}
