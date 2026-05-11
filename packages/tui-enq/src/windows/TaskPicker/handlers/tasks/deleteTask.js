import DeleteModal from '#tui/windows/DeleteModal.js'
import { state } from '#tui/state.js'

export default {
    keys: ['D', 'В'],
    description: 'Удалить задачу',
    action() {
        if (state.currentTask) {
            new DeleteModal()
        }
    }
}
