import ExternalEditor from '#tui/windows/editors/ExternalEditor.js'
import { state } from '#tui/state.js'

export default {
    keys: ['в', 'l', 'д'],
    description: 'Редактировать описание',
    action() {
        if (!state.currentTask) return
        new ExternalEditor('description', state.currentTask.summary.slice(0, 25) + ' - ' + state.currentTask.uid)
    }
}
