import DateParams from './date.js'

/**
 * Класс, содержащий флаги, соответствующие свойствам VTODO/Task.
 * Используется для команд add, edit и как фильтр в list/delete.
 */
export default class TaskParams extends DateParams {
    static PROPERTY_TYPES = {
        uid:           'string',
        summary:       'string',
        categories:    'array',
        addCategories: 'array',
        status:        'string',
        description:   'string',
        priority:      'number',
        x:             'boolean',
        o:             'boolean',
        cancel:        'boolean',
        parent:        'string',
        href:          'string',
        ...DateParams.PROPERTY_TYPES,
    }
    /**
     * @param {Object} [flags={}] - Разобранный объект флагов, где значения могут быть строками, массивами или true.
     */
    constructor(flags = {}) {
        /** dates */
        super(flags)

        /** @type {string|undefined} Краткое содержание задачи (SUMMARY) */
        this.summary     = flags.summary
        
        /** @type {string[]|undefined} Категории задач (CATEGORIES) — заменяет существующие */
        this.categories  = flags.categories

        /** @type {string[]|undefined} Категории для дозаписи к существующим (edit) */
        this.addCategories = flags.addCategories
        
        /** @type {string|undefined} Статус задачи (STATUS) */
        this.status      = flags.status
        
        /** @type {string|undefined} Описание (DESCRIPTION) */
        this.description = flags.description
        
        /** @type {number|undefined} Приоритет  (PRIORITY) */
        this.priority    = flags.priority
        
        /** @type {boolean} Флаг: STATUS === COMPLETED (сокращенно '-x') */
        this.x           = flags.x
        
        /** @type {boolean} Флаг: STATUS === NEEDS-ACTION (сокращенно '-o') */
        this.o           = flags.o
        
        /** @type {boolean} Флаг: STATUS === CANCELLED */
        this.cancel      = flags.cancel
        
        /** @type {string|undefined} Полные UID задачи */
        this.uid         = flags.uid
        
        /** @type {string|undefined} UID родителя */
        this.parent      = flags.parent
        
        /** @type {string|undefined} Ссылка на задачу */
        this.href        = flags.href

        if (!this.href && this.uid) this.href = this.uid + '.ics'
    }
}
