import Reader  from './crud/reader.js'
import Creator from './crud/creator.js'
import Updater from './crud/updater.js'
import Deleter from './crud/deleter.js'

import { escapeCaldavText } from './escape-tools.js'

/** @typedef {import("../dto/task.js").default}  Task   */
/** @typedef {import("../dto/filter").default}   Filter */
/** @typedef {import("../cache/cache-manager.js").default}   CacheManager */

import { config }       from '../../config.js';
import { cacheManager } from '../../cache/cache-manager.js'

const reader  = new Reader(config)
const creator = new Creator(config)
const updater = new Updater(config)
const deleter = new Deleter(config, cacheManager)

export const caldavClient = {
    /**
     * Создает задачи
     * @param {Task|Task[]} tasks
     * @returns {Promise<boolean>}
     */
    async create(tasks) {
        return Array.isArray(tasks)
            ? creator.createTasks(tasks)
            : creator.createTask(tasks)
    },

    /**
     * Читает задачи с фильтром
     * @param {Filter} [filter]
     * @returns {Promise<Task[]>}
     */
    read(filter) {
        return reader.readTasks(filter)
    },

    /**
     * Обновляет задачу на сервере
     * @param {Task} task
     * @returns {Promise<Response>} - ответ сервера
     */
    async update(task) {

        const escapedTask = {
            ...task,
            summary: task.summary ? escapeCaldavText(task.summary) : '',
            description: task.description ? escapeCaldavText(task.description) : ''
        }

        return await updater.updateTask(escapedTask)
    },

    /**
     * @param {string[]} fullUidsOrHrefs
     * @param {'uid'|'href'} type
     */
    async delete(fullUidsOrHrefs, type) {
        return await deleter.deleteTasks(fullUidsOrHrefs, type)
    }
}
