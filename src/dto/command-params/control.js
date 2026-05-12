import BaseParams from "./base.js"

/**
 * Класс, содержащий флаги, влияющие на поведение команды, вывод, мета-информацию.
 */
export default class ControlParams extends BaseParams {
    static PROPERTY_TYPES = {
        count: 'number',
        hide: 'boolean',
        raw: 'boolean',
        verbose: 'boolean',
        clientFilter: 'boolean',
        backendFilter: 'boolean',
        showDescription: 'boolean',
        fullUid: 'boolean',
        flowchart: 'boolean',
        ink: 'boolean',
        vue: 'boolean',
        blessed: 'boolean',
        //levelAll: 'boolean',
        //withParent: 'boolean',
    }
    /**
     * @param {Object} [flags={}] - Разобранный объект флагов.
     */
    constructor(flags = {}) {
        super(flags)
        /** @type {number|undefined} Количество задач для удаления (для команды delete) */
        this.count = flags.count

        /** @type {true|undefined} Флаг: Не печатать сами задачи (для команды list) */
        this.hide = flags.hide
        
        /** @type {true|undefined} Флаг: Вывод "сырых" задач (raw) */
        this.raw = flags.raw
        
        /** @type {true|undefined} Флаг: Вывод отладки (verbose) */
        this.verbose = flags.verbose

        /** @type {true|undefined} Флаг: Фильтрация на фронте (clientFilter) */
        this.clientFilter = flags.clientFilter

        /** @type {true|undefined} Флаг: Фильтрация на фронте (clientFilter) */
        this.backendFilter = flags.backendFilter

        /** @type {true|undefined} Флаг: Показывать описание задач под каждой строкой */
        this.showDescription = flags.showDescription

        /** @type {true|undefined} Флаг: Печатать полные uid вместо shortUid */
        this.fullUid = flags.fullUid

        /** @type {true|undefined} Флаг: Вывести ASCII-flowchart по DEPENDS-ON для текущего scope */
        this.flowchart = flags.flowchart

        /** @type {true|undefined} Флаг: Запустить экспериментальный TUI на ink (--ink) */
        this.ink = flags.ink

        /** @type {true|undefined} Флаг: Запустить TUI на vue-termui (--vue) */
        this.vue = flags.vue

        /** @type {true|undefined} Флаг: Запустить TUI на neo-blessed + @vue/reactivity (--blessed) */
        this.blessed = flags.blessed

        //this.levelAll = flags.levelAll
        //this.withParent = flags.withParent
    }
}
