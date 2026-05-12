import { Command } from './command.js';
import Task from '@pln/core/dto/task.js';

import { tasksService }   from '@pln/core/services/tasks.js'
import { consolePrinter } from '@pln/core/printer/console-printer.js'

/** @typedef {import("../dto/command-params/command-params.js").default} CommandParams */
/** @typedef {import("../dto/command-params/task.js").default} TaskParams */
/** @typedef {import("../dto/task.js").TaskProps} TaskProps */

/**
 * Команда для создания задачи
 */
export default class AddCommand extends Command {

    async execute() {
        const defaultTask = new Task({created: new Date()})
        const taskProps = this.parseTaskParams2TaskProps(this.commandParams.taskParams)

        // позиционные аргументы → summary, если -t/--summary не задан
        if (!taskProps.summary && this.commandParams.positional?.length) {
            taskProps.summary = this.commandParams.positional.join(' ')
        }

        const task = {
            ...defaultTask,
            ...taskProps
        }

        if (task.parent) {
            task.parent = this.short2FullUid(task.parent.toString())
        }

        await tasksService.create(task)
        consolePrinter.print([task])

        return task
    }
}
