/**
 * Окно настроек: Select по списку SETTINGS, по submit открывает sub-editor
 * (Toggle/Numeral/Select/Input) под тип значения. Запись идёт через
 * configRef — мутация .value автоматически сохраняет config.json.
 *
 * Экспортирует:
 *   - default SettingsWindow — класс окна, открывается из TaskPicker по `,`.
 */

import Enquirer from 'enquirer'

import { configRef } from '@pln/core/services/getConfigRef.js'

import { Window } from './Window/index.js'
import { state } from '../state.js'

/**
 * Описание каждой настройки.
 * type определяет, какой sub-editor открыть на submit.
 * `path` — точечный путь в configRef.value.
 * @type {Array<{path: string, type: 'input'|'numeral'|'toggle'|'select'|'list'|'json', label: string, values?: Array<any>}>}
 */
const SETTINGS = [
    { path: 'showingTaskFields.uid',             type: 'select',  label: 'Uid: режим',    values: [false, 'short', 'full'] },
    { path: 'tagPrefix',                         type: 'input',   label: 'Тег: префикс' },
    { path: 'tagColor',                          type: 'input',   label: 'Тег: цвет' },
    { path: 'parentDisplayLen',                  type: 'numeral', label: 'Длина блока parent' },
    { path: 'sort.liftTags',                     type: 'list',    label: 'Sort: lift-теги (вверх)' },
    { path: 'sort.dropTags',                     type: 'list',    label: 'Sort: drop-теги (вниз)' },
    { path: 'sort.by',                           type: 'select',  label: 'Sort: ключ',           values: [null, 'created'] },
    { path: 'sort.dir',                          type: 'select',  label: 'Sort: направление',    values: ['asc', 'desc'] },
    { path: 'tagStatuses',                       type: 'json',    label: 'Кастомные статусы для тегов' },
    { path: 'showingTaskFields.parent',          type: 'select',  label: 'Parent: режим', values: [false, 'uid', 'summary'] },
    { path: 'showingTaskFields.categories',      type: 'toggle',  label: 'Показывать теги' },
    { path: 'showingTaskFields.priority',        type: 'toggle',  label: 'Показывать приоритет' },
    { path: 'showingTaskFields.timer',           type: 'toggle',  label: 'Показывать таймер' },
    { path: 'showingTaskFields.hasDescription',  type: 'toggle',  label: 'Иконка описания' },
    { path: 'showingTaskFields.activeSession',   type: 'toggle',  label: 'Активная сессия' },
    { path: 'showingTaskFields.dateCreated',     type: 'toggle',  label: 'Дата created' },
    { path: 'showingTaskFields.dateDue',         type: 'toggle',  label: 'Дата deadline' },
    { path: 'showingTaskFields.dateStart',       type: 'toggle',  label: 'Дата start' },
    { path: 'showingTaskFields.dateCompleted',   type: 'toggle',  label: 'Дата completed' },
    { path: 'tuiCollapseSubtasks',               type: 'toggle',  label: 'Свёрнутые подзадачи на старте' },
]

export default class SettingsWindow extends Window {
    constructor() {
        super()
        this.keyHandlers = {
            'j': this.down.bind(this), 'о': this.down.bind(this),
            'k': this.up.bind(this),   'л': this.up.bind(this),
            'q': () => this.close(),   'й': () => this.close(),
        }
        this.open()
    }

    open() {
        console.clear()

        const choices = SETTINGS.map(s => ({
            name:    s.label,
            message: `${s.label.padEnd(36)} ${formatVal(getNested(configRef.value, s.path))}`,
            value:   s,
        }))

        this.prompt = new Enquirer.Select({
            message: 'Settings',
            choices,
            multiple: false,
        })

        this.prompt.run()
            .then(name => {
                const setting = SETTINGS.find(s => s.label === name)
                if (!setting) return this.close()
                this.editSetting(setting)
            })
            .catch(() => this.close())
    }

    /**
     * Открывает sub-editor под тип настройки, на submit пишет в configRef,
     * затем перезагружает свой Select с новыми значениями.
     * @param {object} setting
     */
    async editSetting(setting) {
        const current = getNested(configRef.value, setting.path)

        try {
            const newValue = await runEditor(setting, current)
            if (newValue !== undefined) setNested(configRef.value, setting.path, newValue)
        } catch {}

        // принудительно пересобираем treeLine для текущих задач, чтобы
        // изменение настройки сразу отразилось при возврате в TaskPicker
        if (state._tasks?.length) state.tasks = state._tasks

        // переоткрыть Settings: остаёмся в окне для серии правок
        this.open()
    }
}

/**
 * Запускает соответствующий enquirer-prompt для типа настройки.
 * @param {object} setting
 * @param {*} current
 * @returns {Promise<*>}
 */
function runEditor(setting, current) {
    if (setting.type === 'toggle') {
        return new Enquirer.Toggle({
            message:  setting.label,
            enabled:  'on',
            disabled: 'off',
            initial:  !!current,
        }).run()
    }
    if (setting.type === 'numeral') {
        return new Enquirer.NumberPrompt({
            message: setting.label,
            initial: Number(current) || 0,
        }).run()
    }
    if (setting.type === 'json') {
        const initial = JSON.stringify(current ?? {}, null, 0)
        return new Enquirer.Input({
            message: `${setting.label} (JSON)`,
            initial,
        }).run().then(s => {
            try { return JSON.parse(s) }
            catch (e) {
                console.error('JSON parse error:', e.message)
                return undefined
            }
        })
    }
    if (setting.type === 'list') {
        const initial = Array.isArray(current) ? current.join(', ') : ''
        return new Enquirer.Input({
            message: `${setting.label} (через запятую)`,
            initial,
        }).run().then(s => String(s || '').split(',').map(x => x.trim()).filter(Boolean))
    }
    if (setting.type === 'select') {
        const choices = setting.values.map(v => ({ message: formatVal(v), name: String(v), value: v }))
        const initialIdx = Math.max(0, setting.values.findIndex(v => v === current))
        return new Enquirer.Select({
            message: setting.label,
            choices,
            initial: initialIdx,
        }).run().then(name => choices.find(c => c.name === name)?.value)
    }
    return new Enquirer.Input({
        message: setting.label,
        initial: current ?? '',
    }).run()
}

/**
 * Преобразует значение в строку для отображения в Select-строке.
 * @param {*} v
 * @returns {string}
 */
function formatVal(v) {
    if (v === false) return 'false'
    if (v === true) return 'true'
    if (v === null || v === undefined) return '—'
    return String(v)
}

/**
 * Читает значение по точечному пути.
 * @param {object} obj
 * @param {string} path
 * @returns {*}
 */
function getNested(obj, path) {
    return path.split('.').reduce((cur, k) => cur?.[k], obj)
}

/**
 * Пишет значение по точечному пути (создаёт промежуточные объекты).
 * @param {object} obj
 * @param {string} path
 * @param {*} value
 */
function setNested(obj, path, value) {
    const parts = path.split('.')
    let cur = obj
    for (let i = 0; i < parts.length - 1; i++) {
        const k = parts[i]
        if (!cur[k] || typeof cur[k] !== 'object') cur[k] = {}
        cur = cur[k]
    }
    cur[parts.at(-1)] = value
}
