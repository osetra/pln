import { Command } from './command.js';

import { tasksService } from '@pln/core/services/tasks.js'

export default class DeleteCommand extends Command {
    async execute() {
        const deleteParams = this.commandParams.taskParams
        try {
            if (deleteParams.uid) {
                const fullUid = this.short2FullUid(deleteParams.uid)
                await tasksService.delete([fullUid], 'uid')
                console.log(`✅ Задачи с UID ${fullUid} удалены`)

            } else if (deleteParams.href) {
                await tasksService.delete(deleteParams.href, 'href')
                console.log(`✅ Задачи с href ${deleteParams.href} удалены`)
            }
        } catch (err) {
            console.warn('кажется, нет такой задачи\n', err);
        }
    }
}
