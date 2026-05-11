import { caldavClient }   from '../external/caldav/client.js'
import { cacheManager }   from '../cache/cache-manager.js'
import { analizator }     from '../utils/analizator.js'
import { Filter, Condition } from '../dto/filter.js'
import { TaskWithShortUid } from '../dto/task.js'

export const tasksService = {

    /**
     * Читает задачи, кладёт в кеш одним write, анализирует
     * @param {Filter} [filter] фильтр для caldav-клиента
     * @returns {Promise<TaskWithShortUid[]>}
     */
    async list(filter) {
        const tasks = await caldavClient.read(filter)
        const withShortUid = tasks.map(t => {
            t.shortUid = cacheManager.addTask(t)
            return new TaskWithShortUid(t)
        })
        cacheManager.saveCache()
        return analizator.analize(withShortUid)
    },

    /**
     * Создаёт задачу на сервере и зеркалит в кеш
     * @param {Task} task
     */
    async create(task) {
        if (!task.href) task.href = task.uid + '.ics'
        await caldavClient.create(task)
        cacheManager.putTask(task)
        return task
    },

    /**
     * Обновляет задачу: мержит originalTask + taskProps, отправляет на сервер,
     * зеркалит результат в кеш
     * @param {Task} originalTask
     * @param {TaskProps} taskProps
     * @returns {Promise<Task>}
     */
    async update(originalTask, taskProps) {
        if (taskProps.status === 'COMPLETED') {
            taskProps.completed = new Date()
            console.debug('Для задачи установлена дата completed')
        } else if (originalTask?.status === 'COMPLETED' && taskProps.status === 'NEEDS-ACTION') {
            taskProps.completed = null
            console.debug('Для задачи снята дата completed')
        }

        const merged = { ...originalTask }
        for (const key in taskProps) {
            if (key === 'shortUid' || key === 'formatted') continue
            if (taskProps[key] !== undefined) merged[key] = taskProps[key]
        }

        await caldavClient.update(merged)
        cacheManager.putTask(merged)
        return merged
    },

    /**
     * Удаляет задачи и зеркалит в кеше
     * @param {string[]} uidsOrHrefs
     * @param {'uid'|'href'} type
     */
    async delete(uidsOrHrefs, type) {
        const result = await caldavClient.delete(uidsOrHrefs, type)
        const arr = Array.isArray(uidsOrHrefs) ? uidsOrHrefs : [uidsOrHrefs]
        if (type === 'uid') {
            arr.forEach(uid => cacheManager.removeTask(uid))
        } else {
            // href — поищем uid в кеше
            const map = new Map(cacheManager.tasks.map(t => [t.href, t.uid]))
            arr.forEach(href => {
                const uid = map.get(href)
                if (uid) cacheManager.removeTask(uid)
            })
        }
        return result
    },

    /**
     * Читает одну задачу с сервера по uid
     * @param {string} uid
     * @returns {Promise<Task>}
     */
    async getByUid(uid) {
        const filter = new Filter().addCondition(new Condition({
            field: 'uid', value: uid, combineType: 'add'
        }))
        const result = await caldavClient.read(filter)
        return result[0]
    },
}
