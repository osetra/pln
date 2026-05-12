import uuidv4 from "../utils/uuidv4.js"

/**
 * @typedef {Object} CustomProperties
 * @property {[Date, Date][]} [sessions]
 * @property {string} [cleanDescription]
 */

export default class Task {
    /**
     * @param {Object}        data
     * @param {string}            [data.uid]
     * @param {string}            [data.summary]
     * @param {string}            [data.description]
     * @param {string}            [data.status]
     * @param {string[]}          [data.categories]
     * @param {number}            [data.priority]
     *
     * @param {Date}              [data.created]
     * @param {Date}              [data.dtstamp]
     * @param {Date}              [data.start]
     * @param {Date}              [data.due]
     * @param {Date}              [data.modified]
     * @param {Date}              [data.completed]
     *
     * @param {string}            [data.parent]
     * @param {string[]}          [data.dependsOn] - uid задач, которых нужно дождаться (RELTYPE=DEPENDS-ON)
     * @param {string[]}          [data.blocks]    - uid задач, которые блокирует эта (RELTYPE=BLOCKS)
     * @param {string}            [data.href]
     *
     * @param {CustomProperties}  [data.customProperties]
     //* @param {Boolean}           [data.isHideSubtasks]
     */
    constructor({
        uid,
        summary,
        description,
        status,
        categories,
        priority,

        created,
        dtstamp,
        start,
        due,
        modified,
        completed,

        parent,
        dependsOn,
        blocks,
        href,

        customProperties = {},
        //isHideSubtasks = false,
    } = {}) {
        this.uid         = uid         || uuidv4()
        //this.uid         = uid         || `pln${Date.now()}_${Math.floor(Math.random() * 10)}`
        this.summary     = summary     || ''
        this.description = description || ''
        this.status      = status      || 'NEEDS-ACTION'
        this.categories  = categories  || []
        this.priority    = priority    || 0

        this.parent      = parent      || undefined
        this.dependsOn   = Array.isArray(dependsOn) ? dependsOn : []
        this.blocks      = Array.isArray(blocks)    ? blocks    : []
        this.href        = href        || undefined

        this.created     = created     || new Date()
        this.dtstamp     = dtstamp     || undefined
        this.start       = start       || undefined
        this.due         = due         || undefined
        this.modified    = modified    || undefined
        this.completed   = completed   || undefined

        this.customProperties = customProperties
        //this.isHideSubtasks   = isHideSubtasks
    }

    /**
     * Возвращает true, если задача завершена
     * @returns {boolean}
     */
    isCompleted() {
        return this.status === 'COMPLETED';
    }

}

export class TaskProps extends Task {

    /**
     * @param {{ [K in keyof Task]: 
     *     Task[K] 
     *     | undefined 
     *     | null 
     * } & { uid: string }} data - nullable версия Task с обязательным uid
     */
    constructor(data) {
        if (!data.uid) { throw new Error('UID is required for TaskProps') }
        super(data)
    }
}


export class TaskWithShortUid extends Task {
    /**
     * @param {Task & { shortUid: string }} data - все свойства Task + shortUid
     */
    constructor(data) {
        if (!data.shortUid) { throw new Error('shortUid is required for TaskWithShortUid') }
        super(data)
        this.shortUid = data.shortUid
    }
}

export class TaskAnalized extends Task {
    /**
     * @param {Task & { customProperties: Object }} data - все свойства Task + customProperties
     */
    constructor(data) {
        if (!data.customProperties) { throw new Error('customProperties is required for TaskWithShortUid') }
        super(data)
        this.customProperties = data.customProperties
    }
}

export class TaskWithTreeLine extends Task {
    /**
     * @param {Task & { treeLine: string }} data - все свойства Task + treeLine
     */
    constructor(data) {
        if (!data.treeLine) { throw new Error('shortUid is required for TaskWithTreeLine') }
        super(data)
        this.treeLine = data.treeLine
    }
}


