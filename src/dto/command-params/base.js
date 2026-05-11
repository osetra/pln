export default class BaseParams {
    /**
     * Приводит значение к строке или возвращает undefined для null/undefined.
     * Если передан массив — склеивает элементы через запятую.
     * @param {any} val
     * @returns {string|undefined}
     */
    toString(val) {
        if (val == null) return undefined
        if (Array.isArray(val)) return val.map(String).join(',')
        return String(val)
    }

    /**
     * Приводит значение к массиву строк или возвращает undefined.
     * @param {any[]|string} val
     * @returns {string[]|undefined}
     */
    toStringArray(val) {
        if (val == null) return undefined
        if (Array.isArray(val)) return val.map(String)
        if (typeof val === 'string') return [val]
        return undefined
    }

    /**
     * Приводит значение к массиву чисел или возвращает undefined.
     * Фильтрует нечисловые элементы.
     * @param {any[]|number|string} val
     * @returns {number[]|undefined}
     */
    toNumberArray(val) {
        if (val == null) return undefined
        if (Array.isArray(val)) {
            return val.map(v => {
                const n = Number(v)
                return Number.isFinite(n) ? n : undefined
            }).filter(v => v !== undefined)
        }
        if (typeof val === 'number') return [val]
        const n = Number(val)
        return Number.isFinite(n) ? [n] : undefined
    }

    /**
     * Приводит значение к числу или возвращает undefined.
     * @param {any} val
     * @returns {number|undefined}
     */
    toNumber(val) {
        if (val == null) return undefined
        const n = Number(val)
        return Number.isFinite(n) ? n : undefined
    }

}
