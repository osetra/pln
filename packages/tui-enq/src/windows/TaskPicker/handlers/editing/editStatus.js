import StatusEditor from '#tui/windows/editors/StatusEditor.js'
import { state } from '#tui/state.js'

export default {
    keys: ['S', 'Ы'],
    description: 'Редактировать статус',
    action() {
        if (state.currentTask) {
            new StatusEditor()
        }
    }
}
