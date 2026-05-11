export default class QueryBuilder {

    /**
     * Строит XML запрос для CalDAV
     * @version 2
     *
     * @param {Filter} filter 
     * @returns {string}
     */
    static buildXmlQuery(filter = {}) {
        const builder = new QueryBuilder()

        const conditions = filter.conditions || []

        // Сначала обрабатываем все условия add и and
        for (const cond of conditions) {
            if (cond.combineType === 'add' || cond.combineType === 'only') {
                if (cond.value === undefined) {
                    builder.withUndefinedCondition(cond.field)
                } else {
                    builder.withAndCondition(cond.field, cond.value)
                }
            }
        }

        // Затем обрабатываем все условия del
        for (const cond of conditions) {
            if (cond.combineType === 'del') {
                builder.withNegateCondition(cond.field, cond.value)
            }
        }

        return builder.build();
    }


    constructor() {
        this.xmlFilters = []
    }

    /**
     * Добавляет AND-условие
     * @param {FieldName} field
     * @param {string} value
     * @returns {QueryBuilder}
     */
    withAndCondition(field, value) {
        const propName = this.#getPropName(field)
        const lastIdx = this.xmlFilters.length - 1

        // Ищем последний фильтр для этого свойства
        for (let i = this.xmlFilters.length - 1; i >= 0; i--) {
            if (this.xmlFilters[i].includes(`name="${propName}"`)) {
                // Добавляем условие в существующий фильтр
                this.xmlFilters.splice(i + 1, 0, 
                `    <C:text-match collation="i;unicode-casemap">${value}</C:text-match>`
                )
                return this;
            }
        }

        // Если не нашли - создаем новый фильтр
        this.xmlFilters.push(`<C:prop-filter name="${propName}">`)
        this.xmlFilters.push(`    <C:text-match collation="i;unicode-casemap">${value}</C:text-match>`)
        this.xmlFilters.push(`</C:prop-filter>`)
        return this
    }

    /**
     * Добавляет NOT-условие
     * @param {FieldName} field
     * @param {string} value
     * @returns {QueryBuilder}
     */
    withNegateCondition(field, value) {
        const propName = this.#getPropName(field)

        this.xmlFilters.push(
            `<C:prop-filter name="${propName}">`,
            `    <C:text-match negate-condition="yes">${value}</C:text-match>`,
            `</C:prop-filter>`,
        )
        return this;
    }
    /**
     * Добавляет условие для неопределенного поля
     * @param {FieldName} field
     * @param {'only'|'del'} [type='only'] 
     * @returns {QueryBuilder}
     */
    withUndefinedCondition(field, type='only') {
        const propName = this.#getPropName(field);
        if (type === 'only') {
            this.xmlFilters.push(
                `<C:prop-filter name="${propName}">`,
                `    <C:is-not-defined/>`,
                `</C:prop-filter>`
            )
        } else if (type === 'del') {
                // это нужно, потому что по факту включение любого text-match
                // убирает все is-not-defined в ответе
                `<C:prop-filter name="CATEGORIES">`
                    `<C:text-match negate-condition="yes">void</C:text-match>`
                `</C:prop-filter>`
        }
        return this;
    }

    /**
     * Добавляет фильтр для подзадач
     * @param {string} parentUid
     * @returns {QueryBuilder}
     */
    withSubTasks(parentUid) {
        this.xmlFilters.push(
            `<C:prop-filter name="RELATED-TO">`,
            `    <C:text-match>${parentUid}</C:text-match>`,
            `</C:prop-filter>`
        );
        return this;
    }


    /**
     * Собирает финальный XML запроса
     * @returns {string}
     */
    build() {
        //this.withSubTasks();
        const FILTER_INDENT = '                '  // 16 пробелов, подвиньте по вкусу

        const xmlFilters = this.xmlFilters
            .map(line => FILTER_INDENT + line)
            .join('\n')

        const xmlTest = `<?xml version="1.0" encoding="utf-8"?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
<D:prop>
<C:calendar-data/>
</D:prop>
<C:filter>
<C:comp-filter name="VCALENDAR">
<C:comp-filter name="VTODO">
<C:prop-filter name="UID">

<C:text-match match-type="equals">ltab-1750469243080-5</C:text-match>
</C:prop-filter>
<C:prop-filter name="UID">
<C:text-match match-type="equals">ltab-1751161842498-5</C:text-match>
</C:prop-filter>
</C:comp-filter>
</C:comp-filter>
</C:filter>
</C:calendar-query>
`
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<C:calendar-query
    xmlns:D="DAV:"
    xmlns:C="urn:ietf:params:xml:ns:caldav">
    <D:prop>
        <C:calendar-data/>
    </D:prop>
    <C:filter>
        <C:comp-filter name="VCALENDAR">
            <C:comp-filter name="VTODO">
                <!-- ФИЛЬТРЫ -->
${xmlFilters}
            </C:comp-filter>
        </C:comp-filter>
    </C:filter>
</C:calendar-query>
`
        //console.timeLog('timer')
        //console.debug('➡️🌐 XML-Request:\n' + xml)
        return xml
    }

    /**
     * Преобразует короткое имя поля в CalDAV-свойство
     */
    #getPropName(field) {
        const map = {
            'categories': 'CATEGORIES',
            'status': 'STATUS',
            'uid':       'UID',
            'parent': 'RELATED-TO',
            'parentUid': 'RELATED-TO',
            //'parent': 'RELATED-TO;RELTYPE=PARENT',
            //'parentUid': 'RELATED-TO;RELTYPE=PARENT',

            // даты
            'dtstamp':    'DTSTAMP',
            'dateRange':  'DATERANGE',
            'uid':        'UID',
            'start':      'DTSTART',
            'due':        'DUE',
            'modified':   'LAST-MODIFIED',
            'dcompleted': 'COMPLETED',

        }
        return map[field] || field
    }
}
