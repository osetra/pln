import BaseParams from "./base.js"
/**
 * Класс для временных свойств задачи
 */
export default class DateParams extends BaseParams {
    static PROPERTY_TYPES = {
        start:      'Date',
        due:        'Date',
        completed:  'Date',
        dtstamp:    'Date',
        modified:   'Date',
        created:    'Date',
    }
    /**
     * @param {Object} [flags={}]
     */
    constructor(flags = {}) {
        super(flags)
        /** @type {Date|undefined} Начало задачи (DTSTART) */
        this.start      = flags.start

        /** @type {Date|undefined} Срок выполнения (DUE) */
        this.due        = flags.due

        /** @type {Date|undefined} Время завершения задачи (COMPLETED) */
        this.dcompleted = flags.dcompleted

        /** @type {Date|undefined} Время создания/фиксирования изменения (DTSTAMP) */
        this.dtstamp    = flags.dtstamp
        
        /** @type {Date|undefined} Время последней модификации (LAST-MODIFIED) */
        this.modified   = flags.modified
        
        /** @type {Date|undefined} Время создания задачи (CREATED) */
        this.created    = flags.created
    }
}
