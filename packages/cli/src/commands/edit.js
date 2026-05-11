import { Command } from './command.js';

import { tasksService }   from '@pln/core/services/tasks.js'
import { cacheManager }   from '@pln/core/cache/cache-manager.js'

/** @typedef {import("./dto/task").TaskProps} TaskProps */

export default class EditCommand extends Command {
    async execute() {
        if (!this.commandParams.taskParams.uid) {
            throw new Error('UID required for edit command (-u flag)');
        }

        const taskProps = this.parseTaskParams2TaskProps(this.commandParams.taskParams)
        await this.updateTask(taskProps, 'cache')
    }


    /**
     * Обновляет задачу, используя taskProps.uid
     * @param {TaskProps} taskProps - обновляемые параметры
     * @param {'cache'|'server'} [from='cache']
     * @returns {Task} - обновлённая задача
     */
    async updateTask(taskProps, from = 'cache') {
        taskProps.uid = this.short2FullUid(taskProps.uid.toString())

        const tp = taskProps.parent
        taskProps.parent = tp !== undefined && tp !== null
            ? this.short2FullUid(taskProps.parent)
            : taskProps.parent

        let originalTask
        if (from === 'cache') {
            originalTask = cacheManager.tasks.find(task => task.uid === taskProps.uid)
            if (!originalTask) originalTask = await tasksService.getByUid(taskProps.uid)
        } else if (from === 'server') {
            originalTask = await tasksService.getByUid(taskProps.uid)
        }

        if (!originalTask) {
            const q = taskProps.uid.toLowerCase()
            const suggestions = cacheManager.tasks
                .filter(t => t.uid.toLowerCase().includes(q))
                .slice(0, 5)
            const hint = suggestions.length
                ? `\nВозможно имелось в виду:\n` + suggestions.map(t => `  pln edit -u ${t.uid}  # ${t.summary}`).join('\n')
                : ''
            throw new Error(`С uid "${taskProps.uid}" задач не найдено.${hint}`)
        }

        return tasksService.update(originalTask, taskProps)
    }
}
