import { taskSessionsManager } from '#tui/windows/TaskPicker/task-sessions.js'
import { state } from '#tui/state.js'

export default {
    keys: ['T', 'Е'],
    description: 'Запустить/остановить таймер сессии',
    action() {
        if (!state.currentTask) return

        const sessions = state.currentTask.customProperties?.sessions || []

        const now = new Date(Date.now() + 7 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 16)
            .replace('T', ' ')

        const lastSession = sessions.at(-1)
        const isNewSessionStart = !lastSession || lastSession.length === 2

        const newDescription = taskSessionsManager.updateSessionInDescription(
            state.currentTask.description,
            sessions,
            now,
            isNewSessionStart
        )

        this.updateTaskProp({ description: newDescription })
        this.freeze()
        this.open()
    }
}
