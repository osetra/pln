import { Command }           from './command.js'
import { renderMermaidASCII } from 'beautiful-mermaid'
import { Filter, Condition } from '@pln/core/dto/filter.js'

import { config }         from '@pln/core/config.js'
import { tasksService }   from '@pln/core/services/tasks.js'
import { cacheManager }   from '@pln/core/cache/cache-manager.js'
import { consolePrinter } from '@pln/core/printer/console-printer.js'
import analizeTasks from '@pln/core/services/analizeTasks.js'
import { frontendFilter } from '@pln/core/utils/frontend-filter.js'
import { sessionsService } from '@pln/core/services/sessions.js'
import { buildMermaid } from '@pln/core/services/taskFlowchart.js'

export default class ListCommand extends Command {

    /**
     * @returns {TaskWithShortUid[]}
     */
    async execute() {
        const verbose = this.commandParams?.controlParams?.verbose
        if (verbose) console.time('fullTime')
        cacheManager.clearCache()
        const options = {
            isHideTasks: this.commandParams?.controlParams?.hide,
            isRawOutput: this.commandParams?.controlParams?.raw,
            /* в случае наличия принтер просто отдаст задачи с полем с отформатированной строкой */
            isThreeLines: this.commandParams?.controlParams?.three,
            isClientFilter: this.commandParams?.controlParams?.clientFilter,
            isBackendFilter: this.commandParams?.controlParams?.backendFilter,
            showDescription: this.commandParams?.controlParams?.showDescription,
            fullUid: this.commandParams?.controlParams?.fullUid,
        }

        const filter = this._buildFilter()
        let filteredTasksWithShortUid

        // Автоматическое определение типа фильтрации
        if (!this.commandParams?.filterParams?.childrensLevel &&
            !this.commandParams?.filterParams?.parentsLevel) {
            options.isBackendFilter = true
            options.isClientFilter = false
        }
        if (options.isClientFilter || !options.isBackendFilter) {
            // Фильтрация на фронтенде (-f)
            const allTasks = await tasksService.list(new Filter())
            filteredTasksWithShortUid = frontendFilter.applyFilter(allTasks, filter)

        } else {
            // Фильтрация на бэкенде (-b)
            filteredTasksWithShortUid = await tasksService.list(filter)
        }

        // Пост-фильтр: только задачи с активной сессией (--with-active-sessions / -was)
        if (this.commandParams?.filterParams?.withActiveSessions) {
            filteredTasksWithShortUid = sessionsService.withActive(filteredTasksWithShortUid)
        }

        const tasksAnalized = filteredTasksWithShortUid

        if (options.isHideTasks) return tasksAnalized

        if (options.isRawOutput) {
            console.log(filteredTasksWithShortUid.map(t=>t.customProperties?.sessions || t))
            return tasksAnalized
        }
        if (options.isThreeLines) {
            const tasksWithTreeLine = consolePrinter.print(filteredTasksWithShortUid, { print: false })
            return tasksWithTreeLine
        }

        if (this.commandParams?.controlParams?.flowchart) {
            const code = buildMermaid(filteredTasksWithShortUid, { onlyConnected: true })
            if (!code.includes('-->')) {
                console.log('⊘ В выборке нет связей DEPENDS-ON')
            } else {
                console.log(renderMermaidASCII(code, { colorMode: 'none', boxBorderPadding: 0 }))
            }
            if (verbose) console.timeEnd('fullTime')
            return tasksAnalized
        }

        consolePrinter.print(tasksAnalized, options)
        this.#showAnalitics(tasksAnalized)
        if (verbose) console.timeEnd('fullTime')
        return tasksAnalized
    }

    /**
     * Собирает фильтр из флагов
     * @returns {Filter}
     */
    _buildFilter() {
        const filterParams = { ...this.commandParams.filterParams, ...this.commandParams.taskParams }
        const filter = new Filter()

        if (filterParams.childrensLevel) {
            filter.childrensLevel = +filterParams.childrensLevel
        }
        if (filterParams.parentsLevel) {
            filter.parentsLevel = +filterParams.parentsLevel
        }
        
        // Простые фильтры по полям
        if (filterParams.summary) {
            filter.addCondition(new Condition({
                field: 'summary',
                value: filterParams.summary,
                combineType: 'add'
            }));
        }
        if (filterParams.categories) {
            for (const category of filterParams.categories) {
                filter.addCondition(new Condition({
                    field: 'categories',
                    value: category,
                    combineType: 'add'
                }));
            }
        }

        const isNoFlags = Object.keys(filterParams).length === 0
        if (filterParams.o || isNoFlags) {
            this._applyDefaultFilter(filter)
        } else if (filterParams.status) {
            filter.addCondition(new Condition({
                field: 'status',
                value: filterParams.status,
                combineType: 'only'
            }));
        } else if (filterParams.all) {
            // без фильтров - вывести всё
        } else if (filterParams.x) {
            filter.addCondition(new Condition({
                field: 'status',
                value: 'COMPLETED',
                combineType: 'only'
            }));
        }
        if (filterParams.uid) {
            filter.addCondition(new Condition({
                field: 'uid',
                matchType: '===',
                value: filterParams.uid,
                conjunction: 'only' // я хз, почему именно с этим работает уже...
                //combineType: 'and'
            }));
        }

        if (filterParams.parent) {
            filter.addCondition(new Condition({
                field: 'parent',
                matchType: '===',
                value: filterParams.parent,
                combineType: 'only'
                //conjunction: 'and'
            }));
        }

        if (filterParams.dtstamp) {
            filter.addCondition(new Condition({
                field: 'dtstamp',
                matchType: '===',
                value: filterParams.dtstamp,
                combineType: 'add'
            }));
        }

        // Сложные фильтры
        if (filterParams.add) {
            for (const arg of filterParams.add) {
                const [field, value] = arg.split(':');
                filter.addCondition(new Condition({
                    field: field,
                    value:  value,
                    combineType: 'add'
                }));
            }
        }

        if (filterParams.only) {
            for (const arg of filterParams.only) {
                const [field, value] = arg.split(':');
                filter.addCondition(new Condition({
                    field: field,
                    value:  value,
                    combineType: 'only'
                }));
            }
        }

        if (filterParams.del) {
            for (const arg of filterParams.del) {
                const [field, value] = arg.split(':');
                filter.addCondition(new Condition({
                    field: field,
                    value:  value,
                    combineType: 'del'
                }));
            }
        }

        if (this.commandParams?.controlParams?.verbose) {
            console.dir(filter, { depth: null, colors: true, showHidden: true, compact: false })
        }
        return filter
    }

    /**
     * Применяет к фильтру условия из config.defaultFilter — массива
     * объектов формата Condition: { field, value, combineType }.
     * @param {Filter} filter - фильтр, к которому дописываются условия
     */
    _applyDefaultFilter(filter) {
        const conditions = Array.isArray(config.defaultFilter) ? config.defaultFilter : []
        for (const c of conditions) {
            if (!c?.field) continue
            filter.addCondition(new Condition({
                field: c.field,
                value: c.value,
                combineType: c.combineType || 'only',
            }))
        }
    }

    #showAnalitics(tasks) {
        const metrics = analizeTasks(tasks)
        consolePrinter.printAnalitics(metrics, {print: true})
    }

}
