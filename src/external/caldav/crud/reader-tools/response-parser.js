import { XMLParser } from 'fast-xml-parser';
import vparser from 'vdata-parser';
import yaml from '@zkochan/js-yaml'

import { unescapeCaldavText } from '../../escape-tools.js';
import Task from "../../../../dto/task.js"

export default class ResponseParser {
    /**
     * Парсит XML ответ в массив задач
     * @param {string} xmlText 
     * @returns {Task[]}
     */
    parse(xmlText) {
        const rawData  = this.#parseXml2Intermediate(xmlText)
        const icsTasks = this.#extractIcs(rawData)
        const hrefs    = this.#extractHrefs(rawData)
        
        return icsTasks.map((ics, i) => this.#parseIcs2Task(ics, hrefs[i]))
    }

    #parseXml2Intermediate(xmlText) {
        const parser = new XMLParser()
        const result = parser.parse(xmlText);
        
        if (!result || typeof result.multistatus === 'undefined') {
            console.debug('Raw XML response:', xmlText);
            throw new Error('Invalid CalDAV response: missing multistatus');
        }
        
        return result
    }

    #extractIcs(rawData) {
        const response = rawData.multistatus.response
        if (!response) return [];
        if (!Array.isArray(response)) return [response.propstat.prop['C:calendar-data']];
        return response.map(r => r.propstat.prop['C:calendar-data']);
    }

    #extractHrefs(rawData) {
        const response = rawData.multistatus.response
        if (!response) return []

        if (!Array.isArray(response)) {
            return [response.href.replace(/^.*\//, '')]
            return [response.href]
        } else {
            return response.map(r => r.href.replace(/^.*\//, ''))
            return response.map(r => r.href)
        }
    }

    #parseIcs2Task(icsText, href) {
        const parsed = vparser.fromString(icsText)
        const vtodo = parsed.VCALENDAR?.VTODO
        //console.log(vtodo)
        
        if (!vtodo) throw new Error('Invalid ICS format: VTODO not found')

        const { parentUid, dependsOn, blocks } = this.#parseRelations(vtodo['RELATED-TO'])

        const {
            created,
            dtstamp,
            start,
            due,
            modified,
            completed
        } = this.#parseCalDavDates(vtodo)
        
        const dates = [ 
            'created: '   + created,
            'dtstamp: '   + dtstamp,
            'start: '     + start,
            'due: '       + due,
            'modified: '  + modified,
            'completed: ' + completed
        ]
        //console.debug('Dates:')
        //console.debug(dates)

        const escapedDescription = unescapeCaldavText(vtodo.DESCRIPTION) || ''
        // DEV
        //const { yamlProps, cleanDescription } = this.#parseYamlHeader(escapedDescription)

        const task = new Task({
            uid: vtodo.UID,
            summary: unescapeCaldavText(vtodo.SUMMARY) || '',
            description: escapedDescription,
            status: vtodo.STATUS || 'NEEDS-ACTION',
            categories: this.#normalizeCategories(vtodo),
            priority: parseInt(vtodo.PRIORITY) || 0,

            created,
            dtstamp,
            start,
            due,
            modified,
            completed,

            parent: parentUid,
            dependsOn,
            blocks,
            href,

            //customProperties: yamlProps
        })

        return task
    }

    /**
     * Разбирает RELATED-TO по RELTYPE: PARENT/DEPENDS-ON/BLOCKS.
     * RELTYPE отсутствует → PARENT (по RFC 5545).
     * @param {*} related - значение vtodo['RELATED-TO']: строка, объект или массив
     * @returns {{ parentUid: string|undefined, dependsOn: string[], blocks: string[] }}
     */
    #parseRelations(related) {
        const out = { parentUid: undefined, dependsOn: [], blocks: [] }
        if (!related) return out

        const list = Array.isArray(related) ? related : [related]
        for (const r of list) {
            const value = typeof r === 'string' ? r : r?.value
            if (!value) continue
            const params = Array.isArray(r?.params) ? r.params : []
            const reltype = (params.map(p => p?.RELTYPE).find(Boolean) || 'PARENT').toUpperCase()
            if (reltype === 'DEPENDS-ON')   out.dependsOn.push(value)
            else if (reltype === 'BLOCKS')  out.blocks.push(value)
            else                            out.parentUid = value
        }
        return out
    }

    /**
     * Нормализует категории из объекта VTODO.
     * Если категории представлены в виде строки, преобразует их в массив.
     * Если категории отсутствуют, возвращает пустой массив.
     *
     * @param {Task} task - Объект VTODO из ICS формата.
     * @param {string|string[]} task.CATEGORIES - Категории задачи, могут быть строкой или массивом.
     * @returns {string[]} Массив категорий.
     */
    #normalizeCategories(task) {
        if (Array.isArray(task.CATEGORIES)) {
            return task.CATEGORIES;
        } else if (typeof task.CATEGORIES === 'string') {
            return task.CATEGORIES.split(',').map(category => category.trim());
        } else {
            return [];
        }
    }

    /**
     * Парсит все даты из объекта VTODO
     * @param {Object} vtodo - объект VTODO
     * @returns {Object} - объект с распарсенными датами
     */
    #parseCalDavDates(vtodo) {
        // Специфичные имена полей VTODO
        const dateFields = [
            { key: 'CREATED',       dest: 'created' },
            { key: 'DTSTAMP',       dest: 'dtstamp' },
            { key: 'DTSTART',       dest: 'start' },
            { key: 'DUE',           dest: 'due' },
            { key: 'LAST-MODIFIED', dest: 'modified' },
            { key: 'COMPLETED',     dest: 'completed' }
        ]
        
        const result = {}
        for (const {key, dest} of dateFields) {
            if (vtodo[key]) {
                const dateValue = typeof vtodo[key] === 'string' 
                    ? vtodo[key] 
                    : vtodo[key].value
                result[dest] = this.#parseCalDavDate(dateValue)
            }
        }
        
        return result
    }

    /**
     * Парсит строку даты из CalDAV в объект Date
     * @param {string} dateString - строка с датой в формате CalDAV
     * @returns {Date | null}
     */
    #parseCalDavDate(dateString) {
        //console.count("parseCalDavDate дёрнуто c")
        //console.log(dateString)
        if (!dateString) return null;
        
        // Формат YYYYMMDD (только дата)
        if (/^\d{8}$/.test(dateString)) {
            const year = parseInt(dateString.substring(0, 4), 10);
            const month = parseInt(dateString.substring(4, 6), 10) - 1;
            const day = parseInt(dateString.substring(6, 8), 10);
            return new Date(Date.UTC(year, month, day));
        }
        
        // Формат ISO с временем (YYYYMMDDTHHMMSSZ)
        if (/^\d{8}T\d{6}Z$/.test(dateString)) {
            const datePart = dateString.substring(0, 8);
            const timePart = dateString.substring(9, 15);
            return new Date(
                `${datePart.substring(0, 4)}-${datePart.substring(4, 6)}-${datePart.substring(6, 8)}T${timePart.substring(0, 2)}:${timePart.substring(2, 4)}:${timePart.substring(4, 6)}Z`
            )
        }

        return null
    }
}
