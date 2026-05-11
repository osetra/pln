import Enquirer from 'enquirer'
import { Window } from './Window/index.js'
import { state } from '../state.js'

import TaskParams from '@pln/core/dto/command-params/task.js'
import Task from '@pln/core/dto/task.js'
import { tasksService } from '@pln/core/services/tasks.js'

/**
 * Форма для создания новой задачи с автогенерацией полей из PROPERTY_TYPES
 */
export default class TaskForm extends Window {
    /**
     * @param {string} parentUid - UID родительской задачи (null для корневой)
     */
    constructor(parentUid = null) {
        super()
        this.parentUid = parentUid
        this.open()
    }

    open() {
        const formFields = this.#generateFormFields()
        
        this.prompt = new Enquirer.Form({
            name: 'task',
            message: 'Create new task:',
            choices: formFields,
            //footer: (' '.repeat(100)+'\n').repeat(10)
            //margin: [10, 0, 0, 0]
            //margin: [0, 0, 5, 2]
        })

        //console.log('\n'.repeat(state.tasks.length))
        this.prompt.run()
            .then(values => this.onCreate(values))
            .catch(() => this.close())
    }

    /**
     * Генерирует поля формы на основе PROPERTY_TYPES
     * @returns {Array}
     */
    #generateFormFields() {
        const excludedFields = ['uid', 'href', 'x', 'o', 'cancel'] // служебные поля
        const fieldConfigs = {
            summary: { message: '📝 Summary', initial: '' },
            description: { message: '📄 Description', initial: '' },
            categories: { message: '🏷️ Categories (comma separated)', initial: '' },
            status: { message: '📊 Status', initial: 'NEEDS-ACTION' },
            priority: { message: '🎯 Priority (0-9)', initial: '0' },
            parent: { message: '📂 Parent UID', initial: this.parentUid || '' },
            created: { message: '📅 Created date', initial: '' },
            dtstamp: { message: '🕒 Timestamp', initial: '' },
            start: { message: '🚩 Start date', initial: '' },
            due: { message: '⏰ Due date', initial: '' },
            modified: { message: '✏️ Modified date', initial: '' },
            completed: { message: '✅ Completed date', initial: '' }
        }

        return Object.entries(TaskParams.PROPERTY_TYPES)
            .filter(([fieldName]) => !excludedFields.includes(fieldName))
            .map(([fieldName, fieldType]) => ({
                name: fieldName,
                message: fieldConfigs[fieldName]?.message || this.#formatFieldName(fieldName),
                initial: fieldConfigs[fieldName]?.initial || this.#getDefaultValue(fieldType)
            }))
    }

    /**
     * Форматирует имя поля для отображения
     * @param {string} fieldName 
     * @returns {string}
     */
    #formatFieldName(fieldName) {
        return fieldName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim()
    }

    /**
     * Возвращает значение по умолчанию для типа поля
     * @param {string} fieldType 
     * @returns {string}
     */
    #getDefaultValue(fieldType) {
        const defaults = {
            'string': '',
            'number': '0',
            'array': '',
            'boolean': 'false'
        }
        return defaults[fieldType] || ''
    }

    /**
     * @param {Object} values - значения формы
     */
    async onCreate(values) {
        if (!values.summary || !values.summary.trim()) {
            return this.close()
        }

        try {
            // Обрабатываем данные формы
            const taskData = this.#processFormValues(values)
            
            // Создаем задачу через бэкенд
            const task = { ...new Task({ created: new Date() }), ...taskData }
            const newTask = await tasksService.create(task)
            
            // Обновляем состояние
            if (newTask) {
                state.tasks = [...state.tasks, newTask]
                //await this.refreshTaskPicker()
            }
            
        } catch (error) {
            console.debug('Ошибка при создании задачи:', error)
        } finally {
            this.close()
        }
    }

    /**
     * Обрабатывает сырые значения формы в правильные типы
     * @param {Object} rawValues 
     * @returns {Object}
     */
    #processFormValues(rawValues) {
        const processed = { ...rawValues }

        // Обрабатываем специальные поля
        Object.entries(TaskParams.PROPERTY_TYPES).forEach(([fieldName, fieldType]) => {
            if (!(fieldName in rawValues)) return

            const value = rawValues[fieldName]

            switch (fieldType) {
                case 'number':
                    processed[fieldName] = value ? parseInt(value, 10) : undefined
                    break
                case 'array':
                    processed[fieldName] = value
                        ? value.split(',').map(item => item.trim()).filter(item => item)
                        : []
                    break
                case 'boolean':
                    processed[fieldName] = value === 'true'
                    break
                default:
                    processed[fieldName] = value || ''
            }
        })

        // Устанавливаем родителя
        processed.parent = this.parentUid

        return processed
    }

    ///**
    // * Обновляет TaskPicker после создания задачи
    // */
    //async refreshTaskPicker() {
    //    if (state.windows.taskPicker) {
    //        state.windows.taskPicker.refresh()
    //    }
    //}

    //close() {
    //    super.close()
    //    state.windows.taskPicker?.unfreeze()
    //}
}
