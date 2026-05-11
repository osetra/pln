import QueryBuilder from './reader-tools/query-builder.js'
import ResponseParser from './reader-tools/response-parser.js'

import { Filter, Condition } from "../../../dto/filter.js"

import Requester from './requester.js';

/**
 * Модуль для чтения задач по CalDAV.
 * @module
 *
 * Переписан deepseek
 * @version 2
 */

/** @typedef {import("../dto/task").default} Task */
/** @typedef {import("../dto/filter").default} Filter */


export default class Reader extends Requester {

    /**
     * Выполняет CalDAV запрос с фильтрацией
     * @version 3
     *
     * @param {Filter | {}} [filter={}]
     * @returns {Promise<Task[]> | null}
     * @throws {Error} При ошибке HTTP запроса или парсинга
     */
    async readTasks(filter = {}) {
        //console.log('❗filter')
        //console.log(filter)
        //filter.level = +filter.level[0]
        //console.time('requestTimer')
        const conditions = filter.conditions || []
        
        // Разделяем условия по типам
        const addConditions = conditions.filter(c => c.combineType === 'add')
        const onlyConditions = conditions.filter(c => c.combineType === 'only')
        const delConditions = conditions.filter(c => c.combineType === 'del')
        const undefinedConditions = []

        if (addConditions.length === 0) {
            return await this.#fetchTasks(conditions)
        }

        if (delConditions.length > 0) {
            for (const delCond of delConditions) {
                const condit =  new Condition({
                    field: delCond.field,
                    combineType: 'only',
                    value: undefined
                })
                undefinedConditions.push(condit)
            }
        }

        const tasks = await this.#processConditions(addConditions, onlyConditions, delConditions, undefinedConditions)
        
        // Удаляем дубликаты по UID
        /** @type {Task[]|[]} */
        const uniqueTasks = []
        const seenUids = new Set()
        for (const task of tasks) {
            if (!seenUids.has(task.uid)) {
                seenUids.add(task.uid)
                uniqueTasks.push(task)
            }
        }

        //console.log('❗ filter.level')
        //console.log(filter.level)
        if (filter.childrensLevel >= 2) {
            let currentParents = uniqueTasks
            let levelsToFetch = filter.childrensLevel - 1  // Сколько уровней детей нужно загрузить

            while (levelsToFetch > 0) {

                const levelNum = filter.childrensLevel - levelsToFetch + 1
                //console.time(`⬇️ Level ${levelNum} fetch`);

                const childTasksArrays = await Promise.all(
                    currentParents.map(async parent => {
                        const condition = new Condition({
                            field: 'parentUid',
                            value: parent.uid,
                            combineType: 'add'
                        })

                        let childs = []
                        const childsTasks = await this.#fetchTasks([
                            condition,
                            ...onlyConditions,
                            ...delConditions
                        ])
                        childs.push(...childsTasks)

                        // чтобы найти задачи с undefined полем
                        if (undefinedConditions.length < 1) return childs
                        for (const undefinedCondition of undefinedConditions) {
                            let undefinedFilter = {
                                conditions: [
                                    undefinedCondition,
                                    ...(condition.field !== undefinedCondition.field ? [condition] : []),
                                    ...onlyConditions.filter(onlyc => onlyc.field !== undefinedCondition.field),
                                    ...delConditions.filter(dc => dc.field !== undefinedCondition.field),
                                ]
                            }
                            const undefinedTasks = await this.#fetchTasks(undefinedFilter.conditions)
                            childs.push(...undefinedTasks)
                        }
                        return childs
                    })
                )

                const newChildren = [];
                for (const tasks of childTasksArrays) {
                    for (const task of tasks) {
                        if (!seenUids.has(task.uid)) {
                            seenUids.add(task.uid);
                            uniqueTasks.push(task);
                            newChildren.push(task);
                        }
                    }
                }

                currentParents = newChildren;
                levelsToFetch--;

                if (newChildren.length === 0) break;
                //console.timeEnd(`⬇️ Level ${levelNum} fetch`);
            }
        }

        console.debug(`🔍 Found ${tasks.length} tasks, ${uniqueTasks.length} unique`)
        return uniqueTasks
    }

    /**
     * Обрабатывает условия фильтра и возвращает задачи
     * @private
     * @param {Condition[]} addConditions 
     * @param {Condition[]} onlyConditions 
     * @param {Condition[]} delConditions 
     * @param {Condition[]} undefinedConditions 
     * @returns {Promise<Task[]>}
     */
    async #processConditions(addConditions, onlyConditions, delConditions, undefinedConditions) {
        const tasks = [];
        
        for (const addCondition of addConditions) {
            const addTasks = await this.#fetchTasks([
                addCondition,
                ...onlyConditions,
                ...delConditions
            ]);
            tasks.push(...addTasks);

            for (const undefinedCondition of undefinedConditions) {
                const undefinedFilter = {
                    conditions: [
                        undefinedCondition,
                        ...(addCondition.field !== undefinedCondition.field ? [addCondition] : []),
                        ...onlyConditions.filter(onlyc => onlyc.field !== undefinedCondition.field),
                        ...delConditions.filter(dc => dc.field !== undefinedCondition.field),
                    ]
                };
                const undefinedTasks = await this.#fetchTasks(undefinedFilter.conditions);
                tasks.push(...undefinedTasks);
            }
        }
        
        return tasks;
    }

    /**
     * Подготавливает параметры HTTP запроса
     * @param {Filter} filter - Параметры фильтрации
     * @returns {Object} Конфигурация запроса {url, method, headers, body}
     */
    #prepareRequest(filter = {}) {
        return {
            url: this._todoUrl,
            method: 'REPORT',
            headers: {
                ...this._getAuthHeaders(),
                'Depth': '1'
            },
            body: QueryBuilder.buildXmlQuery(filter)
        }
    }
    /**
     * Выполняет HTTP запрос к CalDAV серверу
     * @private
     * @param {Object} request - Конфигурация запроса
     * @returns {Promise<Response>} Ответ сервера
     */
    async #executeRequest(request) {
        //console.timeLog('requestTimer', 'Before fetch')

        return await this._fetch(request.url, {
            method: request.method,
            headers: request.headers,
            body: request.body
        })
    }

    /**
     * Выполняет один запрос для получения задач
     * @private
     * @param {Condition[]} conditions 
     * @returns {Promise<Task[]>}
     */
    async #fetchTasks(conditions) {
        //console.timeLog('requestTimer', 'before prepareRequest')
        const request = this.#prepareRequest({ conditions })
        const response = await this.#executeRequest(request)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        //console.timeLog('requestTimer', 'After fetch')
        const tasks = await new ResponseParser().parse(await response.text())
        return tasks
    }

}
