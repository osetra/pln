/**
 * Инструменты для работы с CalDAV экранированием
 * @module
 */

/**
 * Убирает CalDAV экранирование из текста
 * @param {string} text - Исходный текст
 * @returns {string} Очищенный текст
 */
export function unescapeCaldavText(text) {
    if (!text) return '';
    return text
        .replace(/\\\\/g, '\\')   // \\ → \
        .replace(/\\n/g, '\n')    // \n → LF
        .replace(/\\,/g, ',')     // \, → ,
        .replace(/\\;/g, ';');    // \; → ;
}

/**
 * Добавляет CalDAV экранирование в текст
 * @param {string} text - Исходный текст
 * @returns {string} Экранированный текст
 */
export function escapeCaldavText(text) {
    if (!text) return '';
    // Нормализуем переводы строк
    let normalized = text.replace(/\r\n/g, '\n');
    return normalized
        .replace(/\\/g, '\\\\')   // \ → \\
        .replace(/\n/g, '\\n')    // LF → \n
        .replace(/,/g, '\\,')     // , → \,
        .replace(/;/g, '\\;');    // ; → \;
}

    /**
     * Форматирует дату в формат CalDAV (YYYYMMDDTHHmmssZ)
     * @private
     * @param {Date} date - Объект даты
     * @returns {string} Отформатированная дата
     */
export function js2CalDAVDate(date) {
    if ( !(date instanceof Date) ) date = new Date(date)
    return date.toISOString()
        .replace(/[-:.]/g, '')
        .slice(0, 15) + 'Z';
}
