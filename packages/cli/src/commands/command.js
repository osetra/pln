/** @typedef {import("../dto/command-params/command-params.js").default} CommandParams */

import { cacheManager }   from '@pln/core/cache/cache-manager.js'

export class Command {
    /**
     * @param {CommandParams} commandParams
     */
    constructor(commandParams) {
        this.commandParams = commandParams
        
    }

    async execute() {
        throw new Error('Method not implemented');
    }

    /**
     * Преобразует короткий UID в полный
     * @param {string|number} shortUid
     * @returns {string} shortUid | uid если нет в карте
     */
    short2FullUid(shortUid) {
        return shortUid.length < 10 
            ? cacheManager.getFullUid(shortUid) || shortUid
            : shortUid
    }

    /**
     * Парсит переданные cli-аргументы в свойства Task
     * @param {TaskParams} taskParams 
     * @returns {TaskProps}
     */
    parseTaskParams2TaskProps(taskParams) {
        const taskProps = {}

        if (taskParams.uid) {
            taskProps.uid = taskParams.uid
        }
        if (taskParams.summary) {
            taskProps.summary = taskParams.summary
        }
        if (taskParams.description) {
            taskProps.description = taskParams.description
        }
        if (taskParams.cancel) {
            taskProps.status = 'CANCELLED';
        }
        if (taskParams.status || taskParams.x || taskParams.o) {
            if (taskParams.status)   taskProps.status = taskParams.status
            if (taskParams.x)        taskProps.status = 'COMPLETED'
            if (taskParams.o)        taskProps.status = 'NEEDS-ACTION'
            if (taskParams.cancel)   taskProps.status = 'CANCELLED'
        }
        if (taskParams.categories) {
            taskProps.categories = taskParams.categories
        }
        if (taskParams.priority || taskParams.priority === 0) {
            taskProps.priority = taskParams.priority
        }
        if (taskParams.parent) {
            taskProps.parent = taskParams.parent
        }
        if (taskParams.href) {
            taskProps.href = taskParams.href
        }
        if (taskParams.created !== undefined)   taskProps.created   = taskParams.created
        if (taskParams.dtstamp !== undefined)   taskProps.dtstamp   = taskParams.dtstamp
        if (taskParams.start !== undefined)     taskProps.start     = taskParams.start
        if (taskParams.due !== undefined)       taskProps.due       = taskParams.due
        if (taskParams.modified !== undefined)  taskProps.modified  = taskParams.modified
        if (taskParams.completed !== undefined) taskProps.completed = taskParams.completed

        return taskProps
    }
}
