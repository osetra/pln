import DateEditor from '#tui/windows/editors/DateEditor.js'
import { state } from '#tui/state.js'

export default {
    keys: [';', 'ж'],
    description: 'Редактировать дату',
    action() {
        if (state.currentTask) {
            new DateEditor()
        }
    }
}
