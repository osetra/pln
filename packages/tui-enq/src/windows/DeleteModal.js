import Enquirer from 'enquirer'
import { Window } from './Window/index.js'
import { state } from '../state.js'
import { tasksService } from '@pln/core/services/tasks.js'

/**
 * Модальное окно подтверждения удаления задачи (одной или нескольких).
 * Если state.selectedTasks непуст — bulk-режим, иначе удаляет currentTask.
 */
export default class DeleteModal extends Window {
    constructor() {
        super()
        this.open()
    }

    /** @returns {{ uids: string[], message: string } | null} */
    _getTarget() {
        if (state.selectedTasks.length > 0) {
            const uids = state.selectedTasks.map(t => t.uid)
            const names = state.selectedTasks.map(t => t.summary).join(', ')
            const preview = names.length > 60 ? names.slice(0, 57) + '…' : names
            return { uids, message: `🗑️ Delete ${uids.length} tasks: ${preview}?` }
        }
        if (state.currentTask) {
            return { uids: [state.currentTask.uid], message: `🗑️ Delete "${state.currentTask.summary}"?` }
        }
        return null
    }

    open() {
        const target = this._getTarget()
        if (!target) { this.close(); return }

        this.prompt = new Enquirer.Confirm({
            name: 'confirm',
            message: target.message,
            initial: false
        })

        this.prompt.run()
            .then(confirmed => this.onConfirm(confirmed, target.uids))
            .catch(() => this.close())
    }

    /**
     * @param {boolean} confirmed
     * @param {string[]} uids
     */
    async onConfirm(confirmed, uids) {
        if (!confirmed) return this.close()

        try {
            await tasksService.delete(uids, 'uid')

            const deletedSet = new Set(uids)
            state.tasks = state.tasks.filter(t => !deletedSet.has(t.uid))
            state.selectedTasks = []

            const remaining = state.tasks
            state.currentTask = remaining.length > 0 ? remaining[0] : null
        } catch (error) {
            console.debug('Ошибка при удалении задач:', error)
        } finally {
            this.close()
        }
    }
}
