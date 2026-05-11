/**
 * Композабл задач: vue-query поверх tasksService.
 *
 * - useQuery(['tasks']) загружает задачи через Worker (разгрузка main-thread)
 * - mutations create/update/delete зеркалят результат в кеш через setQueryData
 * - refetchOnWindowFocus в QueryClient (см. main.js) подхватывает серверные правки
 */
import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { tasksService } from '@pln/core/services/tasks.js'
import { frontendFilter } from '@pln/core/utils/frontend-filter.js'
import { useUiState } from './useUiState.js'

const TASKS_KEY = ['tasks']

const worker = new Worker(
    new URL('../workers/workerForFetchTasks.js', import.meta.url),
    { type: 'module' }
)

/**
 * Один fetch через worker. Listener одноразовый, чтобы можно было
 * вызывать повторно (vue-query сам дедуплицирует параллельные).
 * @returns {Promise<Task[]>}
 */
function fetchViaWorker() {
    return new Promise((resolve, reject) => {
        const handler = ({ data }) => {
            worker.removeEventListener('message', handler)
            if (data.error) reject(new Error(data.error))
            else resolve(data.tasks)
        }
        worker.addEventListener('message', handler)
        worker.postMessage({})
    })
}

export function useTasks() {
    const queryClient = useQueryClient()
    const { uiState } = useUiState()

    const query = useQuery({
        queryKey: TASKS_KEY,
        queryFn: fetchViaWorker,
    })

    const tasks = computed(() => query.data.value ?? [])
    const loading = computed(() => query.isLoading.value || query.isFetching.value)

    /** @returns {Task[]} задачи после mainFilter (или все, если фильтра нет) */
    const filteredTasks = computed(() => {
        if (!uiState.value.mainFilter) return tasks.value
        return frontendFilter.applyFilter(tasks.value, uiState.value.mainFilter)
    })

    const createMutation = useMutation({
        mutationFn: (task) => tasksService.create(task),
        onSuccess: (created) => {
            queryClient.setQueryData(TASKS_KEY, (old) => [...(old ?? []), created])
        },
    })

    const updateMutation = useMutation({
        mutationFn: ({ originalTask, props }) => tasksService.update(originalTask, props),
        onSuccess: (merged) => {
            queryClient.setQueryData(TASKS_KEY, (old) =>
                (old ?? []).map(t => t.uid === merged.uid ? merged : t)
            )
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (hrefs) => {
            const arr = Array.isArray(hrefs) ? hrefs : [hrefs]
            return tasksService.delete(arr, 'href')
        },
        onSuccess: (_res, hrefs) => {
            const arr = Array.isArray(hrefs) ? hrefs : [hrefs]
            queryClient.setQueryData(TASKS_KEY, (old) =>
                (old ?? []).filter(t => !arr.includes(t.href))
            )
        },
    })

    return {
        tasks,
        filteredTasks,
        loading,
        createTask: (task) => createMutation.mutateAsync(task),
        updateTask: (originalTask, props) => updateMutation.mutateAsync({ originalTask, props }),
        deleteTask: (hrefs) => deleteMutation.mutateAsync(hrefs),
    }
}
