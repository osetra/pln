import chalk from 'chalk';
import treeify from 'treeify';

import { configRef } from '../services/getConfigRef.js';
import { cacheManager } from '../cache/cache-manager.js';
import sortTasks from '../services/sortTasks.js';

/** @typedef {import("../dto/task").default} Task */
/** @typedef {import("../dto/task").TaskWithTreeLine} TaskWithTreeLine */
/** @typedef {import("../dto/metric.js").default} Metric */

const OFF_MS = 7 * 3600 * 1000;

/**
 * Маркер для уникальности label в treeify: иначе задачи с одинаковым
 * formatted-выводом (например когда uid скрыт) сливаются в один узел и
 * дерево «едет». Записываем uid между ZWSP (U+200B), после asLines срезаем.
 */
const ZWSP = '​';
const UID_MARK_RE = new RegExp(`${ZWSP}([^${ZWSP}]+)${ZWSP}`);
const wrapUid = uid => `${ZWSP}${uid}${ZWSP}`;

/**
 * Возвращает chalk-функцию по имени или hex.
 * Принимает '#RRGGBB' либо имя ('gray', 'red', ...). Дефолт — gray.
 * @param {string} [name]
 * @returns {Function}
 */
function chalkColor(name) {
    if (!name) return chalk.gray
    if (name.startsWith('#')) return chalk.hex(name)
    return typeof chalk[name] === 'function' ? chalk[name] : chalk.gray
}

/**
 * Рендерит блок parent в строке задачи. Режимы:
 *   'summary' — `↳<первые N символов summary родителя>` (из cacheManager);
 *     если в кэше нет — fallback на uid-режим
 *   'uid' / true — `↳<last min(N,4) символов uid родителя>`
 *   falsy — пусто
 * @param {Task} task
 * @param {string|boolean} mode
 * @returns {string}
 */
function renderParent(task, mode) {
    if (!mode || !task.parent) return ''
    const parentUid = typeof task.parent === 'string' ? task.parent : task.parent.value
    if (!parentUid) return ''

    const len = configRef.value.parentDisplayLen ?? 8
    const arrow = chalk.cyan('↳')

    if (mode === 'summary') {
        const parentTask = cacheManager.getByUid(parentUid)
        if (parentTask?.summary) {
            return chalk.gray(`${arrow}${parentTask.summary.slice(0, len)}`)
        }
    }
    return chalk.gray(`${arrow}${parentUid.slice(-Math.min(len, 4))}`)
}

/**
 * форматирует строки описания задач для вывода в консоль
 */
export const consolePrinter = {

    /**
     * Выведет переданные задачи
     * @param {Task[]} tasks
     * @param {Object} [options] - Опциональный конфиг
     * @param {boolean} [options.print=true] - Выводить ли в консоль (по умолчанию true)
     * @returns {string} - строка с задачами
     */
    print(tasks, options = {}) {
        options = {...{
            print: true,
            fullUid: false,
        }, ...options}

        const sortedTasks = sortTasks(tasks)
        const [ tasksView, tasksWithTreeLine ] = this.getTasksTree(sortedTasks, options)

        if (!options.print) return tasksWithTreeLine

        console.log(tasksView)
        return tasksView
    },

    /**
     * @param {Object} [options] - Опциональный конфиг
     * @param {boolean} [options.print=true] - Выводить ли в консоль (по умолчанию true)
     */
    printAnalitics(metrics, options = {}) {
        const colors = [chalk.white, chalk.green, chalk.yellow, chalk.blue, chalk.magenta, chalk.cyan, chalk.red, chalk.gray]
        const formattedMetrics = metrics.map(
            (metric, id) => (colors[id] || chalk.white)(`${metric.label} ${metric.value}`)
        )

        const metricsString = formattedMetrics.join(' | ')

        //return metricsString
        return options.print
            ? console.log(metricsString)
            : metricsString
    },
    /**
     * Вывод статистики в компактном формате
     * @param {Metric[]} metrics
     */
    printAnalitics_v1(metrics) {

        const colors = [chalk.white, chalk.green, chalk.yellow, chalk.blue, chalk.magenta, chalk.cyan]
        const formattedMetrics = metrics.map(
            (metric, id) => colors[id](`${metric.label} ${metric.value}`)
        )

        console.log(formattedMetrics.join(' | '))
    },

    /**
     * Вывод информации о добавленной задаче
     * @param {TaskParams} taskParams
     */
    printAddedTaskInformation(taskParams) {
        console.log(taskParams)
    },

    /**
     * Выводит задачи деревом через treeify и возвращает задачи с treeLine
     * @param {Task[]} tasks
     * @param {Object} [options={}]
     * @param {boolean} [options.showDescription] - Показывать описание под строкой задачи
     * @returns {[string, TaskWithTreeLine[]]}
     */
    getTasksTree(tasks, options = {}) {
        tasks.forEach(task => {
            //const hasSubtasks = tasks.some(t => (t.parent?.value || t.parent) === task.uid);
            //task.formatted = this.formatTask(task, hasSubtasks);
            task.formatted = this.formatTask(task, options)
        })

        // Строим объект для treeify
        const treeObj = this.buildTreeObject(tasks)
        let treeStr = ''
        const tasksWithTreeLine = []

        treeify.asLines(treeObj, true, false, (line) => {
            line = line.replace('─ ', '─').replace('└','╰')
            const uidMatch = line.match(UID_MARK_RE)
            line = line.replace(UID_MARK_RE, '')
            treeStr += line + '\n'

            const task = uidMatch
                ? tasks.find(t => t.uid === uidMatch[1])
                : tasks.find(t => line.includes(t.summary))

            if (task) {
                task.treeLine = line

                if (task.isHiddenSubtasks) {
                    task.treeLine = task.treeLine.replace(/.(.)\]/g, '{$1}').replace(/\]/g, '}')
                    if (task.hiddenSubtasksCount > 0)
                        task.treeLine += chalk.dim(` ▸${task.hiddenSubtasksCount}`)
                }
                //task.treeLine = task.isHiddenSubtasks 
                //    ? task.treeLine.replace(/(.)(.)(?=\])/g, '$1{').replace(/\]/g, '}') 
                //    : task.treeLine;
                //task.treeLine = task.isHiddenSubtasks 
                //    ? task.treeLine.replace(/\[/,'(').replace(/\]/,')') 
                //    : task.treeLine

                tasksWithTreeLine.push(task)

                if (options.showDescription) {
                    const desc = task.customProperties.cleanDescription || task.description
                    if (desc && desc.trim()) {
                        const stripped = line.replace(/\x1B\[[0-9;]*m/g, '')
                        const bracketPos = stripped.search(/\[/)
                        const indentLen = (bracketPos >= 0 ? bracketPos : 0) + 2
                        const indent = ' '.repeat(indentLen)
                        const cols = (process.stdout.columns || 80) - indentLen

                        const rawLines = desc.trim().split('\n')
                        const wrapped = rawLines.flatMap(rawLine => {
                            const words = rawLine.split(' ')
                            const result = []
                            let current = ''
                            for (const word of words) {
                                if ((current + ' ' + word).trim().length > cols) {
                                    if (current) result.push(current)
                                    current = word
                                } else {
                                    current = current ? current + ' ' + word : word
                                }
                            }
                            if (current) result.push(current)
                            return result.length ? result : ['']
                        })
                        for (const wl of wrapped) {
                            treeStr += chalk.gray(indent + wl) + '\n'
                        }
                    }
                }
            }
        })

        return [treeStr, tasksWithTreeLine]
    },
    /**
     * Строит вложенный объект { "Task A": { ... } } для передачи в treeify
     * @param {Task[]} tasks
     * @returns {Object}
     */
    buildTreeObject(tasks) {
        const map = new Map();
        const roots = [];
        const visited = new Set();

        // Инициализация узлов. К label добавляем невидимый uid-маркер,
        // чтобы treeify не схлопывал задачи с одинаковым formatted-выводом.
        for (const task of tasks) {
            map.set(task.uid, {
                label: task.formatted + wrapUid(task.uid),
                children: [],
                uid: task.uid
            });
        }

        // Привязка к родителю или корню
        for (const task of tasks) {
            const node = map.get(task.uid);
            const parentUid = task.parent?.value || task.parent;
            
            if (parentUid && map.has(parentUid)) {
                map.get(parentUid).children.push(node);
            } else {
                roots.push(node);
            }
        }

        // Преобразуем в plain object с защитой от циклов
        const build = (nodes) => {
            const result = {};
            for (const node of nodes) {
                if (visited.has(node.uid)) {
                    result[node.label] = { '[CYCLE DETECTED]': {} };
                    continue;
                }
                
                visited.add(node.uid);
                result[node.label] = build(node.children);
                visited.delete(node.uid);
            }
            return result;
        };

        return build(roots);
    },

    /**
     * Оценка длины не-summary частей строки задачи (без ANSI), для расчёта
     * безопасной ширины summary. Учитывает fields — скрытые блоки не считаем.
     * @param {Task} task
     * @param {Object} fields — итоговый набор флагов из resolveFields()
     * @returns {number}
     */
    _estimateOtherParts(task, fields) {
        let n = 4 // запас на пробелы между блоками
        if (fields.status) n += 4
        if (fields.uid) n += 5
        if (fields.priority && task.priority) n += 4
        if (fields.parent && task.parent) {
            const len = configRef.value.parentDisplayLen ?? 8
            n += (fields.parent === 'summary' ? len : 4) + 2
        }
        if (fields.categories && task.categories?.length) {
            const cats = Array.isArray(task.categories) ? task.categories : [task.categories]
            n += cats.reduce((sum, c) => sum + c.length + 2, 0)
        }
        if (fields.hasDescription && task.customProperties?.cleanDescription) n += 2
        if (fields.timer && task.customProperties?.totalHours > 0) n += 8
        if (fields.activeSession && task.customProperties?.hasActiveSession) n += 2
        if (fields.dependsOn && task.dependsOn?.length) n += 7 * task.dependsOn.length
        const dateKeys = ['dateCreated','dateDtstamp','dateStart','dateDue','dateModified','dateCompleted']
        for (const k of dateKeys) if (fields[k]) n += 8
        n += 12 // запас на префикс дерева
        return n
    },

    /**
     * Форматирует задачу для вывода. Состав строки управляется флагами
     * `config.showingTaskFields` (мерж с FIELD_DEFAULTS); options.fullUid
     * принудительно ставит uid='full' (CLI-флаг).
     * @param {Task} task
     * @param {Object} [options]
     * @param {boolean} [options.fullUid]
     * @returns {string}
     */
    formatTask(task, options = {}) {
        const fields = { ...configRef.value.showingTaskFields }
        if (options.fullUid) fields.uid = 'full'

        const cols = process.stdout?.columns || 80
        const otherPartsReserve = this._estimateOtherParts(task, fields)
        const maxSummary = Math.max(15, cols - otherPartsReserve)
        const summary = task.summary?.length > maxSummary
            ? task.summary.slice(0, maxSummary - 1) + '…'
            : task.summary

        const icons = configRef.value.taskStatusIcons
        const STATUSES = {
            'NEEDS-ACTION': { icon: icons['NEEDS-ACTION'], color: chalk.white },
            'COMPLETED':    { icon: icons['COMPLETED'],    color: chalk.green },
            'CANCELLED':    { icon: icons['CANCELLED'],    color: chalk.gray },
            'IN-PROGRESS':  { icon: icons['IN-PROGRESS'],  color: chalk.yellow },
            'TIMER':        { icon: icons['TIMER'],        color: chalk.red },
            'SOMEDAY':      { icon: icons['SOMEDAY'],      color: chalk.blue },
            'LATER':        { icon: icons['LATER'],        color: chalk.blue },
        }
        function renderStatus(task) {
            let statusConfig = STATUSES[task.status] || { icon: '[?]', color: chalk.white }
            if (task.status === 'NEEDS-ACTION' && task.categories?.length) {
                const tagStatuses = configRef.value.tagStatuses || {}
                for (const [tag, def] of Object.entries(tagStatuses)) {
                    if (task.categories.includes(tag) && def) {
                        statusConfig = { icon: def.icon, color: chalkColor(def.color) }
                    }
                }
            }
            if (task.customProperties.hasActiveSession) statusConfig = STATUSES['TIMER']
            return statusConfig.color(statusConfig.icon)
        }

        const status = fields.status ? renderStatus(task) : ''

        const uid = fields.uid === 'full'  ? chalk.green(task.uid)
                  : fields.uid === 'short' ? chalk.green(task.shortUid || task.uid)
                  : ''

        let priority = ''
        if (fields.priority) {
            const p = Number(task.priority)
            const marks = p === 0 ? ''
                        : p <= 3 ? '!!!'
                        : p <= 6 ? '!!'
                        : '!'
            priority = marks ? chalk.yellow(marks) : ''
        }

        let categories = ''
        if (fields.categories && task.categories) {
            const cats = Array.isArray(task.categories) ? task.categories : [task.categories]
            const paint = chalkColor(configRef.value.tagColor)
            categories = cats.map(c => paint(`${configRef.value.tagPrefix}${c}`)).join(',')
        }

        const hasDesc = fields.hasDescription && task.customProperties.cleanDescription ? '📜' : ''

        const timer = fields.timer && task.customProperties.totalHours > 0
            ? chalk.cyan(`⏱ ${task.customProperties.totalHours}h`)
            : ''

        const activeSession = fields.activeSession && task.customProperties.hasActiveSession
            ? chalk.red('🔴')
            : ''

        let dependsOnMark = ''
        if (fields.dependsOn && task.dependsOn?.length) {
            const marks = task.dependsOn.map(uid => '⊘' + uid.slice(-4))
            dependsOnMark = chalk.red(marks.join(' '))
        }

        const parent = renderParent(task, fields.parent)

        let customProperties = ''
        if (fields.customProperties) {
            customProperties = Object.keys(task.customProperties)
                .filter(prop => prop !== 'sessions' && prop !== 'session-start' && prop !== 'session-end' && prop !== 'hasActiveSession')
                .filter(prop => prop !== 'cleanDescription')
                .map(prop => chalk.hex('#ffffff').bgHex('#282828')(
                    prop.replace('hours', 'h') + ' ' + task.customProperties[prop]
                )).join(' ')
        }

        const { list: dateList } = this.formatDates({
            created:   fields.dateCreated   ? task.created   : null,
            dtstamp:   fields.dateDtstamp   ? task.dtstamp   : null,
            start:     fields.dateStart     ? task.start     : null,
            due:       fields.dateDue       ? task.due       : null,
            modified:  fields.dateModified  ? task.modified  : null,
            completed: fields.dateCompleted ? task.completed : null,
        })

        const line = [
            status,
            uid,
            priority,
            summary,
            categories,
            hasDesc,
            timer,
            activeSession,
            dependsOnMark,
            parent,
            customProperties,
            ...dateList.map(dt => chalk.gray(dt))
        ].filter(Boolean).join(' ')
        return line
    },


    formatDates(data = {}) {
        const labels = {
            created:   '🌱',
            dtstamp:   '🏷️ ',
            start:     '🚩',
            due:       '🟧',
            modified:  '✏️ ',
            completed: '🏁'
        };

        const keys = Object.keys(data)
        //const keys = ['created','dtstamp','start','due','modified','completed'];
        const map = {};
        const list = [];

        for (const k of keys) {
            const v = fmtDate(data[k])
            map[k] = v;
            if (v) {
                const labeled = (labels[k] || '') + v;
                list.push(labeled);
            }
        }

        return { list, map }

        /**
         * Форматирует дату в формате MM/DD
         * @param {Date|string} d - Входная дата
         * @returns {string|null} Дата в формате "MM/DD", или null для недоступных дат
         */
        function fmtDate(d) {
            if (!d) return null;
            const dt = new Date(d instanceof Date ? d.getTime() + OFF_MS : new Date(d).getTime() + OFF_MS);
            const month = String(dt.getMonth() + 1).padStart(2, '0'); // Добавляем 1, чтобы получить месяц, и делаем двухзначным
            const day = String(dt.getDate()).padStart(2, '0'); // Делаем число двухзначным
            return `${month}/${day}`; // Возвращаем в нужном формате
        }
        /**
         * Форматирует дату в формате YYYY-MM-DD
         * @param {Date|string} d - Входная дата
         * @returns {string|null} Дата в формате "YYYY-MM-DD", или null для недоступных дат
         */
        function fmtDate1(d) {
            if (!d) return null;
            const dt = new Date(d instanceof Date ? d.getTime() + OFF_MS : new Date(d).getTime() + OFF_MS);
            return dt.toISOString().slice(0, 10).slice(5);
        }
    }
}
