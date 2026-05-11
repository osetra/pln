import ParentEditor from '#tui/windows/editors/ParentEditor.js'
import { state } from '#tui/state.js'

export default {
    keys: ['P', 'З'],
    description: 'Изменить родителя',
    action() {
        if (state.currentTask) {
            new ParentEditor()
        }
    }
}
