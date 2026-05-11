import PriorityEditor from '#tui/windows/editors/PriorityEditor.js'
import { state } from '#tui/state.js'

export default {
    keys: ['p', 'з'],
    description: 'Редактировать приоритет',
    action() {
        if (state.currentTask) {
            new PriorityEditor()
        }
    }
}
