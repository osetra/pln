import { state } from '#tui/state.js'

export default {
    keys: ['V', 'М'],
    description: 'Сбросить выделение',
    action() {
        if (state.selectedTasks.length === 0) return

        state.selectedTasks = []
        this.freeze()
        this.open()
    }
}
