import BaseParams from "./base.js"

/**
 * Класс, содержащий флаги, специфичные для логики фильтрации.
 */
export default class FilterParams extends BaseParams {
    static PROPERTY_TYPES = {
        all: 'boolean',
        add: 'array',
        and: 'array',
        del: 'array',
        only: 'array',

        //level: 'number',
        childrensLevel: 'number',
        parentsLevel:    'number',
        levelAll:       'boolean',
        parentsAll:     'boolean',

        withActiveSessions: 'boolean',
    };
    /**
     * @param {Object} [flags={}] - Разобранный объект флагов.
     */
    constructor(flags = {}) {
        super(flags)
        /** @type {true|undefined} Флаг: Все задачи (отменяет дефолтный фильтр) */
        this.all = flags.all
        
        /** @type {string[]|undefined} Сложный фильтр с типом 'add' (поле:значение) */
        this.add = flags.add
        
        /** @type {string[]|undefined} Сложный фильтр с типом 'and' (поле:значение) */
        this.and = flags.and
        
        /** @type {string[]|undefined} Сложный фильтр с типом 'del' (поле:значение) */
        this.del = flags.del

        /** @type {string[]|undefined} Сложный фильтр с типом 'only' (поле:значение) */
        this.only = flags.only

        /** @type {number|undefined} Уровень вложенности задач */
        this.childrensLevel = flags.levelAll ? -1 : flags.childrensLevel

        /** @type {number|undefined} Уровень вложенности задач */
        this.parentsLevel = flags.parentsAll ? -1 : flags.parentsLevel

        /** @type {true|undefined} Флаг: только задачи с активной (начатой) сессией */
        this.withActiveSessions = flags.withActiveSessions
    }
}
