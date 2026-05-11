/**
 * Кеш задач: in-memory Map<uid, Task> + сохранение в JSON-файл.
 * Сохраняется в config.tempDirectory или os.tmpdir() как pln-cache.json.
 *
 * Принцип: addTask/putTask/removeTask только меняют Map, диск пишется
 * явным вызовом saveCache() (обычно после батча в tasksService.list или
 * после mutation). Никаких таймеров — поведение читается линейно.
 *
 * @module cache-manager
 */
import { fs, path, os } from '../utils/platform.js'

import { config } from '../config.js'

let tmpFilePath
if (config.tempDirectory) {
    tmpFilePath = path.join(config.tempDirectory, 'pln-cache.json')
} else {
    tmpFilePath = path.join(os.tmpdir(), 'pln-cache.json')
}

export const cacheManager = {

    /** @type {Map<string, Task>} */
    _byUid: new Map(),

    /**
     * Возвращает задачи массивом (для совместимости — find/filter снаружи)
     * @returns {Task[]}
     */
    get tasks() {
        return [...this._byUid.values()]
    },

    /**
     * Возвращает задачу по uid (для рендера parent.summary и т.п.).
     * @param {string} uid
     * @returns {Task|undefined}
     */
    getByUid(uid) {
        return this._byUid.get(uid)
    },

    /**
     * Получает fullUid по shortUid (последние 4 символа uid)
     * @param {string} shortUid
     * @returns {string|undefined}
     */
    getFullUid(shortUid) {
        for (const t of this._byUid.values()) {
            if (t.shortUid === shortUid) return t.uid
        }
    },

    /**
     * Загружает кеш с диска в _byUid
     * @returns {cacheManager}
     */
    loadCache() {
        try {
            if (fs.existsSync(tmpFilePath)) {
                const { tasks = [] } = JSON.parse(fs.readFileSync(tmpFilePath, 'utf8'))
                this._byUid = new Map(tasks.map(t => [t.uid, t]))
            }
        } catch (e) {
            console.error('❌ Ошибка загрузки кэша:', e)
        }
        return this
    },

    /**
     * Сохраняет кеш на диск (один write на весь Map)
     */
    saveCache() {
        try {
            const data = JSON.stringify({ tasks: [...this._byUid.values()] })
            fs.writeFileSync(tmpFilePath, data)
        } catch (e) {
            console.error('❌ Ошибка сохранения кэша:', e)
        }
    },

    /**
     * Кладёт задачу в кеш (без записи на диск). Назначает shortUid.
     * Дубли по uid перезаписываются (Map.set).
     * @param {Task} task
     * @returns {string} shortUid
     */
    addTask(task) {
        task.shortUid = task.uid.slice(-4)
        this._byUid.set(task.uid, task)
        return task.shortUid
    },

    /**
     * Зеркалирует mutation: добавляет/обновляет задачу в кеше + сохраняет
     * @param {Task} task
     */
    putTask(task) {
        if (!task.shortUid) task.shortUid = task.uid.slice(-4)
        this._byUid.set(task.uid, task)
        this.saveCache()
    },

    /**
     * Удаляет задачу из кеша по uid + сохраняет
     * @param {string} uid
     */
    removeTask(uid) {
        this._byUid.delete(uid)
        this.saveCache()
    },

    /**
     * Очищает кеш и удаляет файл
     */
    clearCache() {
        this._byUid = new Map()
        try {
            fs.unlinkSync(tmpFilePath)
        } catch (e) { /* нет файла — ок */ }
    }
}

cacheManager.loadCache()
