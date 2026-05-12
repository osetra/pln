import Requester from './requester.js';
import Task from '../../../dto/task.js';
import { escapeCaldavText } from '../escape-tools.js';

/**
 * Модуль для создания задач по CalDAV.
 * @module
 */
export default class Creator extends Requester {
    /**
     * Создает задачу на сервере
     * @param {Task} task - Объект задачи
     * @returns {Promise<string>} Ответ сервера
     * @throws {Error} При ошибке HTTP запроса
     */
    async createTask(task) {
        const icalData = this.#convertTaskToICS(task)
        console.debug('icalData:')
        console.debug(icalData)
        const taskUrl = `${this._todoUrl}/${task.uid}.ics`
        
        const response = await this._fetch(taskUrl, {
            method: 'PUT',
            headers: {
                ...this._getAuthHeaders(),
                'Content-Type': 'text/calendar; charset=utf-8'
            },
            body: icalData
        })
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка при создании задачи: ${response.status} - ${errorText}`);
        }
    }

    /**
     * Конвертирует задачу в формат ICS
     * @private
     * @param {Task} task - Объект задачи
     * @returns {string} Строка в формате ICS
     */
    #convertTaskToICS(task) {
        const escapedSummary = escapeCaldavText(task.summary || '');
        const escapedDescription = task.description 
            ? escapeCaldavText(task.description)
            : null;
        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//pln//EN',
            'BEGIN:VTODO',
            `UID:${task.uid}`,
            `SUMMARY:${escapedSummary}`,
            //`SUMMARY:${task.summary || ''}`,
        ];

        // Добавляем опциональные поля
        if (escapedDescription) lines.push(`DESCRIPTION:${escapedDescription}`);
        //if (task.description) lines.push(`DESCRIPTION:${task.description}`);
        if (task.status) lines.push(`STATUS:${task.status}`);
        if (task.categories?.length) lines.push(`CATEGORIES:${task.categories.join(',')}`);
        if (task.due) lines.push(`DUE:${this.#formatDate(task.due)}`);
        if (task.completed) lines.push(`COMPLETED:${this.#formatDate(task.completed)}`);
        if (task.created) lines.push(`CREATED:${this.#formatDate(task.created)}`);
        if (task.priority) lines.push(`PRIORITY:${task.priority}`);
        if (task.parent) lines.push(`RELATED-TO:${task.parent}`);
        for (const uid of (task.dependsOn || [])) lines.push(`RELATED-TO;RELTYPE=DEPENDS-ON:${uid}`);
        for (const uid of (task.blocks    || [])) lines.push(`RELATED-TO;RELTYPE=BLOCKS:${uid}`);

        // Завершающие строки
        lines.push('END:VTODO');
        lines.push('END:VCALENDAR');

        return lines.join('\n');
    }

    /**
     * Форматирует дату в формат CalDAV (YYYYMMDDTHHmmssZ)
     * @private
     * @param {Date} date - Объект даты
     * @returns {string} Отформатированная дата
     */
    #formatDate(date) {
        return date.toISOString()
            .replace(/[-:.]/g, '')
            .slice(0, 15) + 'Z';
    }
}
