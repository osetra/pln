/** @typedef {import("../cache/cache-manager.js").default}   CacheManager */

/**
 * переписан deepseek
 * @module
 * @version 2
 */

export default class Requester {
    /** @type {string} */
    _todoUrl
    /** @type {string} */
    _authHeader
    /** @type {CacheManager} */
    _cacheManager

    /**
     * @param {Config} config 
     * @param {CacheManager} cacheManager 
     */
    constructor(config, cacheManager) {
        //console.warn("Вот он!")
        //console.log(config)
        this._cacheManager = cacheManager 
        this._todoUrl = config.todoUrl
        this._authHeader = this._createAuthHeader(config);
    }

    /**
     * Создает заголовок авторизации
     * @param {Config} config 
     * @returns {string}
     */
    _createAuthHeader(config) {
        const auth = typeof btoa === 'function'
            ? btoa(`${config.login}:${config.password}`)
            : Buffer.from(`${config.login}:${config.password}`).toString('base64')
        return `Basic ${auth}`;
    }

    /**
     * Возвращает заголовки для запросов
     * @returns {Object}
     */
    _getAuthHeaders() {
        return {
            'Authorization': this._authHeader,
            'Content-Type': 'application/xml'
        };
    }

    /**
     * Выполняет HTTP запрос
     * @param {string} url 
     * @param {Object} options 
     * @returns {Promise<Response>}
     */
    async _fetch(url, options = {}) {
        return await fetch(url, {
            ...options,
            headers: {
                ...this._getAuthHeaders(),
                ...(options.headers || {})
            }
        });
    }

    /**
     * @param {string[]} uids - идентификатор/ы задач: uid или shortUid
     * @returns {string[]} - полные urls задач
     */
    _getTaskUrls(uids) {
        const cacheTasks = this._cacheManager.loadCache().tasks
        const uidsArray = Array.isArray(uids)
            ? uids
            : [ uids ]

        //console.log(cacheTasks)
        //console.log('uidsArray:')
        //console.log(uidsArray)

        let urls = []
        uidsArray.forEach((uid) => {
            const task = cacheTasks.find(item => {
                //console.log(item.shortUid, uid)
                //console.log(typeof item.shortUid, typeof uid)
                //console.log(item.shortUid === uid)
                //console.log(item.uid, uid, item.shortUid, uid)
                //console.log(''+item.uid === ''+uid || ''+item.shortUid === ''+uid)
                return item.uid === uid || item.shortUid === uid
            })
            //console.log(task)
            //console.log(`${this._todoUrl}/${task.href}`)
            const url = `${this._todoUrl}/${task.href}`
            urls.push(url)
        })

        return urls
    }
}
