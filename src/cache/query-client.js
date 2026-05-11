/**
 * Один QueryClient (@tanstack/query-core) на процесс tui.
 *
 * Зачем: единый паттерн query+invalidate с web (vue-query). В tui
 * используется для дедупликации повторных list() и явного
 * invalidate перед refresh-ом по R.
 *
 * НЕ используется в cli — cli всегда холодный старт (новый процесс),
 * in-memory кеш query-core не переживает запуск; для cli работает
 * только cache-manager (файл на диске).
 *
 * @module query-client
 */
import { QueryClient } from '@tanstack/query-core'
import { tasksService } from '../services/tasks.js'
import { Filter } from '../dto/filter.js'
import { frontendFilter } from '../utils/frontend-filter.js'

const TASKS_KEY = ['tasks']

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5_000,
            gcTime: 1000 * 60 * 60,
            retry: false,
        },
    },
})

/**
 * Низкоуровневый fetch через query-core.
 * @param {Filter} [filter]
 * @returns {Promise<Task[]>}
 */
export function fetchTasks(filter) {
    return queryClient.fetchQuery({
        queryKey: [...TASKS_KEY, filter],
        queryFn: () => tasksService.list(filter),
    })
}

/**
 * Загружает задачи с учётом level-флагов.
 *
 * Reader.readTasks умеет разворачивать только childrensLevel >= 2 пошагово.
 * Для levelAll/parentsLevel/-l N такая логика не нужна, если просто
 * подгрузить ВСЕ задачи и применить filter на клиенте — frontendFilter
 * умеет учитывать parent/children. Это поведение раньше жило в ListCommand,
 * вынесли сюда чтобы tui (и refresh по R) шли тем же путём.
 *
 * @param {Filter} filter
 * @returns {Promise<Task[]>}
 */
export async function loadTasks(filter) {
    const needFrontendFilter = filter?.childrensLevel || filter?.parentsLevel
    if (needFrontendFilter) {
        const all = await fetchTasks(new Filter())
        return frontendFilter.applyFilter(all, filter)
    }
    return fetchTasks(filter)
}

/**
 * Помечает все ['tasks'] queries устаревшими — следующий fetchTasks
 * сходит на сервер. Вызывать когда нужно подхватить серверные правки.
 * @returns {Promise<void>}
 */
export function invalidateTasks() {
    return queryClient.invalidateQueries({ queryKey: TASKS_KEY })
}

/**
 * Зеркалит локальное изменение в query-кеш (после успешной mutation).
 * Чтобы повторные fetchTasks в окне staleTime отдавали свежие данные.
 * @param {Task[]} tasks
 */
export function setCachedTasks(tasks) {
    queryClient.setQueriesData({ queryKey: TASKS_KEY }, tasks)
}
