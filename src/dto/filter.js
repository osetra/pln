/**
 * @typedef {'uids'|'statuses'|'categories'|'parentUid'|'dateRange'} FieldName
 * Возможные имена полей для фильтрации.
 *
 * @typedef {'add'|'only'|'del'} CombineType
 * Режим объединения условий:
 * - `add`  — расширяет результат: добавляет совпавшие задачи к уже найденным (∪ / OR)
 * - `only` — сужает результат: оставляет только те, что совпали (∩ / AND). Если результат пуст — берёт из всех задач
 * - `del`  — исключает: убирает совпавшие из результата
 */

/**
 * Одно условие фильтрации — связка поле/значение/режим объединения.
 *
 * @example
 * // Фильтровать по категориям 'next' или 'scheduled'
 * const cond = new Condition({
 *     field:       'categories',
 *     combineType: 'add',
 *     value:       'next',
 * })
 */
class Condition {
    /**
     * @param {Object}               params
     * @param {FieldName}            [params.field='']                   - имя поля для фильтрации
     * @param {string | undefined}   [params.value]                      - значение для сравнения
     * @param {CombineType}          [params.combineType='only']         - режим объединения
     */
    constructor({
        field                = '',
        value                = undefined,
        combineType          = 'only' 
    } = {}) {
        this.field                = field
        this.value                = value
        this.combineType          = combineType
    }
}

/**
 * Набор условий для фильтрации задач (add/only/del + уровни вложенности).
 */
class Filter {
    /**
     * @type {number} - глубина раскрытия дочерних задач (0 — не раскрывать, -1 — до конца)
     */
    childrensLevel = 0
    /** @type {number} - глубина раскрытия родителей (0 — не раскрывать, -1 — до конца) */
    parentsLevel = 0

    /**
     * @param {Condition[]} [conditions] - массив условий
     */
    constructor(conditions = []) {
        this.conditions = conditions
    }

    /**
     * Добавляет условие в фильтр
     * @param {Condition} condition
     */
    addCondition(condition) {
        this.conditions.push(condition);
        return this
    }
}

export { Filter }
export { Condition }
