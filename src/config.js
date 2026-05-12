/**
 * Конфиг приложения — читает config.json из корня проекта.
 * Невалидное содержимое даёт понятное сообщение, не stack trace.
 * В Node: полный URL, в браузере: обрезает origin → относительный путь.
 *
 * Статический import нужен ради сборки Vite (он не умеет dynamic JSON-import).
 * Если файл отсутствует — упадёт ESM-loader до этого модуля.
 *
 * @deprecated Для записи/реактивной подписки используй
 * `import { configRef } from '#src/services/getConfigRef.js'`.
 * Этот модуль остаётся как одноразовый снимок: подходит для read-only
 * мест, где реактивность не нужна (валидация, дефолты, миграции).
 */
import rawConfig from '../config.json' with { type: 'json' }

const isNode = typeof process !== 'undefined' && !!process.versions?.node

const configUrl = new URL('../config.json', import.meta.url)

const defaultConfig = {
    login: '',
    password: '',
    todoUrl: '',
    tempDirectory: '',
    commandAliases: {},
    configPath: '',

    daysOnTimeline: 7,
    rowsOnTimeline: 5,
    hoursStart: 9,
    hoursStep: 2,
    cellWidth: 9,
    timeCellWidth: 7,
    dateStart: 'monday',

    tuiCollapseSubtasks: true,

    /** Префикс перед каждым тегом при выводе задач (cli/tui). */
    tagPrefix: '@',

    /** Цвет тегов: chalk-имя ('gray','red',...) или hex '#RRGGBB'. */
    tagColor: 'gray',

    /** Длина блока parent при выводе (для 'summary' и 'uid'). */
    parentDisplayLen: 8,

    /** Сортировка задач: какие теги поднимают (вверх) / опускают (вниз). */
    sort: {
        liftTags: ['next', 'scheduled'],
        dropTags: ['trash', 'someday', 'cancel', 'stop'],
    },

    /**
     * Фильтр, применяемый к списку задач по умолчанию (когда юзер не указал
     * флагов фильтрации — то же поведение, что и при -o). Массив условий
     * формата Condition из src/dto/filter.js: { field, value, combineType }.
     * combineType: 'add' | 'only' | 'del'.
     */
    defaultFilter: [
        { field: 'status', value: 'NEEDS-ACTION', combineType: 'only' },
    ],

    /**
     * Кастомные визуальные статусы для тегов. Применяется только если
     * task.status === 'NEEDS-ACTION'. Каждая запись задаёт иконку и цвет
     * (chalk-имя или hex). При нескольких совпадениях побеждает последний
     * по порядку ключей.
     */
    tagStatuses: {
        cancel:  { icon: '[c]', color: 'gray' },
        trash:   { icon: '[t]', color: 'gray' },
        someday: { icon: '[s]', color: 'blue' },
        later:   { icon: '[l]', color: 'blue' },
        next:    { icon: '[>]', color: 'yellow' },
    },

    showingTaskFields: {
        summary: true,
        status: true,
        uid: false,
        dateDue: true,
        /** parent: false | 'uid' | 'summary' */
        parent: 'summary',
        dependsOn: true,
    },

    /** Иконки статусов задачи: ключ — VTODO STATUS (или внутренние группы). */
    taskStatusIcons: {
        'NEEDS-ACTION': '[ ]',
        'COMPLETED':    '[x]',
        'CANCELLED':    '[-]',
        'IN-PROGRESS':  '[.]',
        'TIMER':        '[o]',
        'SOMEDAY':      '[s]',
        'LATER':        '[l]',
    },
}

/**
 * Проверяет обязательные поля конфига; при ошибке валидации печатает
 * понятное сообщение и завершает процесс с кодом 1
 * @param {object} raw — распарсенный объект конфига
 */
function validate(raw) {
    if (!raw || typeof raw !== 'object') {
        failFriendly('Неправильный формат config.json', 'Ожидается объект')
    }

    const { login, password, todoUrl } = raw
    if (typeof login !== 'string' || !login.trim()) {
        failFriendly('config.json: "login" должен быть непустой строкой')
    }
    if (typeof password !== 'string' || !password.trim()) {
        failFriendly('config.json: "password" должен быть непустой строкой')
    }
    const urlPattern = /^https?:\/\/\S+[^\/]$/
    if (typeof todoUrl !== 'string' || !urlPattern.test(todoUrl)) {
        failFriendly(
            'config.json: "todoUrl" должен быть корректным URL без "/" на конце',
            `Например: http://127.0.0.1:5232/user/tasks-collection`,
        )
    }
}

/**
 * Печатает дружелюбное сообщение об ошибке конфига и выходит
 * @param  {...string} lines
 */
function failFriendly(...lines) {
    if (!isNode) throw new Error(lines.join('\n'))
    console.error('\n❌ Ошибка конфигурации pln:')
    for (const line of lines) console.error('   ' + line)
    console.error(`   путь к config.json: ${configUrl.pathname}`)
    console.error('')
    process.exit(1)
}

validate(rawConfig)
const fieldDefaults    = defaultConfig.showingTaskFields
const iconDefaults     = defaultConfig.taskStatusIcons
const sortDefaults     = defaultConfig.sort
const tagStatusDefaults = defaultConfig.tagStatuses
const defaultFilterDefaults = defaultConfig.defaultFilter
Object.assign(defaultConfig, rawConfig)
defaultConfig.showingTaskFields       = { ...fieldDefaults,    ...(rawConfig.showingTaskFields       || {}) }
defaultConfig.taskStatusIcons         = { ...iconDefaults,     ...(rawConfig.taskStatusIcons         || {}) }
defaultConfig.sort                    = { ...sortDefaults,     ...(rawConfig.sort                    || {}) }
defaultConfig.tagStatuses             = { ...tagStatusDefaults, ...(rawConfig.tagStatuses           || {}) }
defaultConfig.defaultFilter           = Array.isArray(rawConfig.defaultFilter) ? rawConfig.defaultFilter : defaultFilterDefaults

if (isNode) {
    defaultConfig.configPath = configUrl.pathname
} else {
    defaultConfig.todoUrl = new URL(defaultConfig.todoUrl).pathname
}

export { defaultConfig as config }
