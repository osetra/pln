import CategoriesEditor from '#tui/windows/editors/CategoriesEditor.js'
import { state } from '#tui/state.js'

export default {
    keys: ['c', 'с'],
    description: 'Редактировать категории',
    action() {
        if (state.currentTask) {
            new CategoriesEditor()
        }
    }
}
