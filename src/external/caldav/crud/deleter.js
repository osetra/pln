import Requester from './requester.js';

export default class Deleter extends Requester {
    /**
     * Удаляет задачи по uid или href.
     * @param {string[]} uidsOrHrefs
     * @param {'uid'|'href'} type
     */
    async deleteTasks(uidsOrHrefs, type) {
        let taskUrls = []
        if (type === 'uid') {
            taskUrls = this._getTaskUrls(uidsOrHrefs)
        } else {
            taskUrls = uidsOrHrefs.map(href =>
                href.includes('/') ? href : `${this._todoUrl}/${href}`
            )
        }

        for (const taskUrl of taskUrls) {
            const response = await this._fetch(taskUrl, { method: 'DELETE' })
            if (!response.ok) {
                throw new Error(`Deleter error: ${await response.text()}`)
            }
        }
    }
}
