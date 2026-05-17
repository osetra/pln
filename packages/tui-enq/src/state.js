import { consolePrinter } from "@pln/core/printer/console-printer.js"
import { analizator } from "@pln/core/utils/analizator.js"
import { frontendFilter } from "@pln/core/utils/frontend-filter.js"
import { setCachedTasks } from "@pln/core/cache/query-client.js"
import { config } from "@pln/core/config.js"
import hideNotStartedTasks from "@pln/core/services/hideNotStartedTasks.js"

/**
 * Опции сортировки для проброса в consolePrinter.print.
 * Приоритет: state.sortOpts (флаг --sort при запуске) → config.sort.by.
 * @returns {{by:string, dir:string}|undefined}
 */
function getSortOpts() {
    if (state.sortOpts) return state.sortOpts
    return config.sort?.by
        ? { by: config.sort.by, dir: config.sort.dir || 'asc' }
        : undefined
}

/** @typedef {import("../../dto/task.js").default} Task */
/** @typedef {import("../../dto/filter.js").Filter} Filter */

export const state = {
    /** 
     * Текущая выбранная в tui задача
     * @type {Task|null} 
     */
    currentTask: null,

    /**
     * Выделенные задачи (для массовых операций)
     * @type {Task[]}
     */
    selectedTasks: [],

    /**
     * Все текущие задачи
     * @type {Task[]} 
     */
    _tasks: [],

    _hiddenSubtasks: {},
    /**
     * @type {Filter | undefined}
     */
    _currentFilter: undefined,

    /**
     * Filter, с которым были изначально загружены задачи (для R-refresh).
     * @type {Filter | undefined}
     */
    loadFilter: undefined,
    /**
     * Отфильтрованные задачи, возвращаемые, если таковые есть
     * @type {Task[]} 
     */
    _filteredTasks: [],

    /**
     * массив для хранения активных окон, с целью разморозки
     */
    activeWindows: [],

    set tasks(rawTasks) {
        const visible = config.hideNotStarted ? hideNotStartedTasks(rawTasks) : rawTasks
        const analizedTasks = analizator.analize(visible)

        const tasksWithThreeLines = consolePrinter.print(analizedTasks, {print: false, sort: getSortOpts()})
        this._tasks = tasksWithThreeLines

        setCachedTasks(this._tasks)
        this._recalculateFilteredTasks()
    },
    get tasks() {
        return this.filteredTasks.length > 0 ? this.filteredTasks : this._tasks
    },

    set filteredTasks(rawTasks) {
        const visible = config.hideNotStarted ? hideNotStartedTasks(rawTasks) : rawTasks
        const analizedTasks = analizator.analize(visible)
        const tasksWithThreeLines = consolePrinter.print(analizedTasks, {print: false, sort: getSortOpts()})
        this._filteredTasks = tasksWithThreeLines
    },
    get filteredTasks() { 
        return this._filteredTasks
    },

    /**
     * @param {Filter|undefined} filter
     */
    set currentFilter(filter) {
        this._currentFilter = filter
        this._recalculateFilteredTasks()
    },
    get currentFilter() { return this._currentFilter },

    _recalculateFilteredTasks() {
        if (!this._currentFilter) {
            this._filteredTasks = []
            return
        }

        // через setter — он сортирует и пересобирает treeLine, иначе порядок
        // ломается на _addChildrenByLevel (push в хвост) и теряется sortTasks.
        this.filteredTasks = frontendFilter.applyFilter(this._tasks, this._currentFilter)
    },
    
    isFirstExecute: true
}

//global.state = state
