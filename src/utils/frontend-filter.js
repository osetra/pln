import { Filter } from '../dto/filter.js'
/**
 * @typedef {import('../dto/task.js').default} Task
 */

/**
 * Модуль для фильтрации задач на фронтенде по объекту Filter.
 * Поддерживает режимы add/only/del и раскрытие детей/родителей по уровню.
 */
export const frontendFilter = {

    /**
     * Применяет фильтр к массиву задач
     * @param {Task[]} tasks - массив задач
     * @param {Filter} filter - фильтр с условиями
     * @returns {Task[]} отфильтрованные задачи
     */
    applyFilter(tasks, filter = new Filter()) {

        let filteredTasks = []

        // add: группируем по field → внутри группы OR, между группами AND
        const addConditions = filter.conditions.filter(c => c.combineType === 'add')
        const byField = Map.groupBy(addConditions, c => c.field)

        for (const [field, conditions] of byField) {
            const values = conditions.map(c => c.value)
            const matched = tasks.filter(t => values.some(v => t[field]?.includes(v)))
            filteredTasks = filteredTasks.length > 0
                ? filteredTasks.filter(t => matched.includes(t))
                : matched
        }

        filter.conditions
            .filter(c => c.combineType === 'only')
            .forEach(({field, value}) => {
                filteredTasks.length > 0
                    ? filteredTasks = filteredTasks.filter(task => task[field].includes(value))
                    : filteredTasks = tasks.filter(task => task[field].includes(value))
            })

        filter.conditions
            .filter(c => c.combineType === 'del')
            .forEach(({field, value}) => {
                filteredTasks = filteredTasks.filter(task => !task[field].includes(value))
            })

        if (filter.parentsLevel)
            filteredTasks = this._addParentsByLevel(filteredTasks, tasks, filter.parentsLevel, filter)
        filteredTasks = this._addChildrenByLevel(filteredTasks, tasks, filter.childrensLevel, filter)

        return filteredTasks;
    },

    /**
     * Добавляет дочерние задачи до указанного уровня, фильтруя по del/only условиям
     * @param {Task[]} filteredTasks - уже отфильтрованные задачи
     * @param {Task[]} allTasks - все задачи
     * @param {number} childrensLevel - глубина (-1 = без ограничений)
     * @param {Filter} filter - фильтр с условиями
     * @returns {Task[]}
     */
    _addChildrenByLevel(filteredTasks, allTasks, childrensLevel, filter) {
        const result = [...filteredTasks]
        const delConditions = filter.conditions.filter(c => c.combineType === 'del')
        // uid — корневое условие (выбор стартовой задачи), на детей не накладываем,
        // иначе ребёнок с другим uid всегда отсеивается и поддерево пустеет.
        const onlyConditions = filter.conditions
            .filter(c => c.combineType === 'only' && c.field !== 'uid')

        const addChildren = (parent, currentLevel) => {
            if (childrensLevel !== -1 && currentLevel > childrensLevel) return
            const children = allTasks.filter(t => t.parent === parent.uid)
            children.forEach(child => {
                if (result.includes(child)) return
                if (delConditions.some(({field, value}) => child[field]?.includes(value))) return
                if (onlyConditions.some(({field, value}) => !child[field]?.includes(value))) return
                result.push(child)
                addChildren(child, currentLevel + 1)
            })
        }

        filteredTasks.forEach(task => addChildren(task, 1))
        return result
    },

    /**
     * Добавляет родителей до указанного уровня (del/only-фильтры на родителей не применяются —
     * они являются контекстом для отображения детей).
     * @param {Task[]} filteredTasks - уже отфильтрованные задачи
     * @param {Task[]} allTasks - все задачи
     * @param {number} parentsLevel - глубина (-1 = без ограничений)
     * @param {Filter} _filter - фильтр (зарезервирован)
     * @returns {Task[]}
     */
    _addParentsByLevel(filteredTasks, allTasks, parentsLevel, _filter) {
        const taskMap = new Map(allTasks.map(t => [t.uid, t]))
        const result = [...filteredTasks]
        const seen = new Set(filteredTasks.map(t => t.uid))

        for (const task of filteredTasks) {
            let current = task
            let level = 0
            while (current.parent && taskMap.has(current.parent)) {
                if (parentsLevel !== -1 && ++level > parentsLevel) break
                const parent = taskMap.get(current.parent)
                if (!seen.has(parent.uid)) {
                    seen.add(parent.uid)
                    result.push(parent)
                }
                current = parent
            }
        }
        return result
    }
}
