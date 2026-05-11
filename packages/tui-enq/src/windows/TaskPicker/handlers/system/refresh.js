import { state } from '#tui/state.js'
import { invalidateTasks, loadTasks } from '@pln/core/cache/query-client.js'

/**
 * Refresh: инвалидирует кеш задач и перечитывает с сервера тем же
 * filter-ом, с которым tui стартовал.
 * Использование: задачи могли поменяться снаружи (другой клиент,
 * правка в Radicale) — нажми R чтобы подтянуть актуальное.
 */
export default {
    keys: ['r', 'к'],
    async action() {
        await invalidateTasks()
        const tasks = await loadTasks(state.loadFilter)
        state.tasks = tasks
        this.prompt?.render()
    }
}
