import chalk from 'chalk'

import analizeTasks from '@pln/core/services/analizeTasks.js'
import { consolePrinter } from '@pln/core/printer/console-printer.js'

/**
 * Строка аналитики над списком (analizeTasks → printAnalitics).
 * @param {Task[]} tasks
 * @returns {string}
 */
export function analyticsString(tasks) {
    const metrics = analizeTasks(tasks)
    return consolePrinter.printAnalitics(metrics, { print: false })
}

/**
 * Полный заголовок: аналитика + опциональный headerFunc (Timeline и т.п.).
 * @param {Task[]} tasks
 * @param {Function|null} headerFunc
 * @returns {string}
 */
export function headerString(tasks, headerFunc) {
    return analyticsString(tasks) + (headerFunc ? '\n' + headerFunc() : '')
}

/**
 * Превратить задачи в choices для Enquirer.Select. Выделенные подсвечиваются.
 * @param {Task[]} tasks
 * @param {Task[]} selectedTasks
 * @returns {{name: string, value: Task}[]}
 */
export function buildChoices(tasks, selectedTasks) {
    return tasks.map(t => {
        const isSelected = selectedTasks.some(st => st.uid === t.uid)
        const name = isSelected ? chalk.yellow(t.treeLine) : t.treeLine
        return { name, value: t }
    })
}

/**
 * Описание (footer) под списком: первые footerHeight строк
 * cleanDescription текущей задачи.
 * @param {Task|null} currentTask
 * @param {number} footerHeight
 * @returns {string}
 */
export function footerString(currentTask, footerHeight) {
    const lines = currentTask?.customProperties?.cleanDescription?.split('\n') || []
    const isLong = lines.length > footerHeight ? '...' : ''
    return chalk.gray(lines.slice(0, footerHeight).join('\n') + isLong
        || '\n'.repeat(footerHeight))
}

/**
 * Сколько строк отдать под список задач (с учётом высоты терминала
 * и места под header/footer/служебные строки).
 * @param {Object} p
 * @param {number} p.terminalHeight
 * @param {number} p.consoleLinesToKeep
 * @param {number} p.headerHeight
 * @param {number} p.footerHeight
 * @param {number} p.tasksCount
 * @returns {number}
 */
export function calcTasksHeight({
    terminalHeight, consoleLinesToKeep, headerHeight, footerHeight, tasksCount,
}) {
    const minTasksHeight = 3
    const availableHeight = terminalHeight - consoleLinesToKeep
    const maxTasksHeight = Math.max(minTasksHeight, availableHeight - headerHeight - footerHeight)
    return Math.min(maxTasksHeight, tasksCount)
}

/**
 * Индекс currentTask в списке tasks или 0, если задачи нет.
 * @param {Task[]} tasks
 * @param {Task|null} currentTask
 * @returns {number}
 */
export function pickInitialIndex(tasks, currentTask) {
    if (!currentTask) return 0
    const idx = tasks.findIndex(t => t.uid === currentTask.uid)
    return idx === -1 ? 0 : idx
}
