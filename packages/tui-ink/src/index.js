/**
 * Точка входа TUI-прототипа на ink.
 * Зачем: альтернативный фронт TUI рядом со старым enquirer-based `tui`,
 * чтобы визуально оценить возможности ink без вмешательства в боевой tui.
 */
import React from 'react'
import { render } from 'ink'

import { TaskPicker } from './TaskPicker.js'

export const tuiInk = {
    /**
     * Запустить ink-прототип c заданным списком задач.
     * @param {import('../../dto/task.js').default[]} tasks - задачи для отображения
     */
    run(tasks) {
        if (!tasks || tasks.length === 0) {
            console.log('Нет задач')
            return
        }
        const { waitUntilExit } = render(React.createElement(TaskPicker, { tasks }))
        waitUntilExit().catch(() => {})
    },
}
