/**
 * Модуль для переопределения методов консоли для улучшенного вывода отладочной информации с использованием ANSI-кодов.
 * 
 * Этот модуль предоставляет переопределенные версии методов `console.debug`, `console.warn`, `console.time` и `console.timeEnd`,
 * которые окрашивают вывод в цвет для лучшей читаемости. 
 * 
 * @module overrideConsoleLogs
 */

/**
 * Переопределяет методы консоли для улучшенного вывода отладочной информации с использованием ANSI-кодов.
 * 
 * Этот метод переопределяет следующие методы консоли:
 * - `console.debug`: выводит сообщения в светло-зеленом цвете, что позволяет легко отличать отладочную информацию.
 * - `console.warn`: выводит предупреждения в оранжевом цвете, что помогает выделить потенциальные проблемы.
 * - `console.time`: запускает таймер с заданным меткой и выводит сообщение о его запуске.
 * - `console.timeEnd`: завершает таймер с заданной меткой, вычисляет продолжительность и выводит результат в формате 
 *   `default: X.XXXms`, где X.XXX — это время в миллисекундах, окрашенное в зеленый цвет.
 * 
 * 
 * @example
 * overrideConsoleLogs(); // Инициализация переопределенных методов
 * 
 * console.time('myTimer'); // Запуск таймера с меткой 'myTimer'
 * // ... код, который нужно измерить ...
 * console.timeEnd('myTimer'); // Завершение таймера и вывод времени
 * 
 * @param {boolean} [enableDebug=false] - Включает или отключает вывод отладочной информации.
 * @returns {void}
 */
export default function overrideConsoleLogs(enableDebug = false) {
    const originalDebug = console.debug.bind(console);
    //const originalWarn = console.warn.bind(console);
    //const originalTime = console.time.bind(console);
    //const originalTimeEnd = console.timeEnd.bind(console);
    const originalDir   = console.dir.bind(console);
    const green = '\x1b[92m';
    const orange = '\x1b[38;5;208m';
    const reset = '\x1b[0m';
    const timers = new Map(); // Хранит время для каждого таймера

    /**
     * Выводит сообщение в светло-зеленом цвете.
     * 
     * @param {...*} args Аргументы, которые будут выведены в консоль.
     */
    console.debug = function(...args) {
        if (enableDebug) {
            const coloredArgs = args.map(arg =>
                typeof arg === 'string' ? `${green}${arg}${reset}` : arg
            );
            originalDebug(...coloredArgs);
        }
    };


    ///**
    // * Выводит предупреждение в оранжевом цвете.
    // * 
    // * @param {...*} args Аргументы, которые будут выведены в консоль.
    // */
    //console.warn = function(...args) {
    //    const coloredArgs = args.map(arg =>
    //        typeof arg === 'string' ? `${orange}${arg}${reset}` : arg
    //    );
    //    originalWarn(...coloredArgs);
    //};

    ///**
    // * Запускает таймер с заданным меткой и выводит сообщение о его запуске.
    // * 
    // * @param {string} label Метка таймера.
    // */
    //console.time = function(label) {
    //    timers.set(label, performance.now()); // Сохраняем текущее время
    //    originalDebug(`${green}Таймер "${label}" запущен.${reset}`);
    //};
    //
    ///**
    // * Завершает таймер с заданной меткой, вычисляет продолжительность и выводит результат.
    // * 
    // * @param {string} label Метка таймера.
    // */
    //console.timeEnd = function(label) {
    //    const startTime = timers.get(label); // Получаем сохраненное время
    //    if (startTime !== undefined) {
    //        const duration = (performance.now() - startTime).toFixed(3);
    //        originalDebug(`${green}default: ${duration}ms${reset}`); // Выводим только одно сообщение
    //        timers.delete(label); // Удаляем таймер после использования
    //    }
    //};

    console.dir = function(...args) {
        if (enableDebug) {
            originalDir(...args);
        }
    };
}
