import Requester from './requester.js';
//import { escapeCaldavText } from '../escape-tools.js';

/** @typedef {import("../../dto/task").default} Task */

export default class Updater extends Requester {
    /**
     * Обновляет задачу через PUT-запрос
     * @param {Task} task - Объект задачи с новыми данными
     * @returns {Promise<Response>}
     */
    async updateTask(task) {
        if (!task.href) {
            throw new Error('Task href is required for update');
        }
        // Экранируем данные перед отправкой
        const escapedTask = task

        const icsData = IcalBuilder.forTask(escapedTask);

        const response = await this._fetch(this._todoUrl + '/' + task.href, {
            method: 'PUT',
            headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
            body: icsData
        });
        
        if (!response.ok) {
            throw new Error('Bad server answer:\n' + await response.text()) 
        }
        
        return response;
    }
}


/**
 * Генерирует iCalendar строку для задач
 */
class IcalBuilder {
    /**
     * Форматирует дату в CalDAV формат
     * @param {Date} date 
     * @returns {string}
     */
    static #formatDate(date) {
        let d
        if (typeof date !== 'object') { d = new Date(date) } else { d = date }

        return d.toISOString()
            .replace(/[-:]/g, '')
            .replace(/\.\d{3}Z/, 'Z');
    }

    /**
     * @version 2
     *
     * Создает iCalendar строку для задачи
     * @param {Task} task 
     * @returns {string}
     */
    static forTask(task) {
        const categoriesStr = task.categories?.join(',') || '';
        const dueStr = task.due ? `DUE:${this.#formatDate(task.due)}\n` : '';
        const completedStr = task.completed ? `COMPLETED:${this.#formatDate(task.completed)}\n` : '';
        const createdStr = task.created ? `CREATED:${this.#formatDate(task.created)}\n` : '';
        const dtstampStr = task.dtstamp ? `DTSTAMP:${this.#formatDate(task.dtstamp)}\n` : '';
        const startStr = task.start ? `DTSTART:${this.#formatDate(task.start)}\n` : '';
        const modifiedStr = task.modified ? `LAST-MODIFIED:${this.#formatDate(task.modified)}\n` : '';
        
        return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//pln//CalDAV Client//EN
BEGIN:VTODO
UID:${task.uid}
SUMMARY:${task.summary}
${task.description ? `DESCRIPTION:${task.description}\n` : ''}\
STATUS:${task.status}
${categoriesStr ? `CATEGORIES:${categoriesStr}\n` : ''}\
PRIORITY:${task.priority}
${dueStr}\
${completedStr}\
${createdStr}\
${dtstampStr}\
${startStr}\
${modifiedStr}\
${task.parent ? `RELATED-TO:${task.parent}\n` : ''}\
END:VTODO
END:VCALENDAR`;
    }

    /**
     * @version 1
     *
     * Создает iCalendar строку для задачи
     * @param {Task} task 
     * @returns {string}
     */
    static forTask_v1(task) {
        const categoriesStr = task.categories?.join(',') || '';
        const dueStr = task.due ? `DUE:${this.#formatDate(task.due)}\n` : '';
        const completedStr = task.completed ? `COMPLETED:${this.#formatDate(task.completed)}\n` : '';
        
        return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//pln//CalDAV Client//EN
BEGIN:VTODO
UID:${task.uid}
SUMMARY:${task.summary}
${task.description ? `DESCRIPTION:${task.description}\n` : ''}\
STATUS:${task.status}
${categoriesStr ? `CATEGORIES:${categoriesStr}\n` : ''}\
PRIORITY:${task.priority}
${dueStr}\
${completedStr}\
${task.parent ? `RELATED-TO:${task.parent}\n` : ''}\
END:VTODO
END:VCALENDAR`;
    }
}
