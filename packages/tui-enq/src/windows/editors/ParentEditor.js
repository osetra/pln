import Enquirer from 'enquirer'
import { Window } from '../Window/index.js'
import { state } from '../../state.js'

/**
 * Окно для выбора родительской задачи через Select prompt
 */
export default class ParentEditor extends Window {
    constructor() {
        super()

        this.keyHandlers = {
            /* navigation */
            'j': this.down.bind(this),
            'о': this.down.bind(this),
            'k': this.up.bind(this),
            'л': this.up.bind(this),

            'q': () => { this.prompt.keypress('\x1b', { name: 'escape' }) },
            'й': () => { this.prompt.keypress('\x1b', { name: 'escape' }) },

            'l': () => { this.prompt.submit() },
            'д': () => { this.prompt.submit() },

            /* remove parent */
            'd': this.removeParent.bind(this),
            'в': this.removeParent.bind(this),

            /* help */
            '?': this.showHelp.bind(this),
        }

        //state.windows.parentSelector = this
        this.open()
    }

    open() {
        if (!state.currentTask) {
            this.close()
            return
        }

        // Создаем список задач, исключая текущую задачу и её подзадачи
        const availableTasks = this.#getAvailableTasks()
        
        // Добавляем опцию "No parent"
        const choices = [
            { 
                name: 'none', 
                message: '🚫 No parent (remove current parent)', 
                value: null 
            },
            ...availableTasks.map(task => ({
                name: task.uid,
                message: task.treeLine,
                value: task.uid
            }))
        ]

        this.prompt = new Enquirer.Select({
            message: '📂 Select parent task:',
            choices: choices,
            initial: this.#findInitialChoice(choices)
        })

        this.prompt.run()
            .then(selectedParentUid => this.onSelect(selectedParentUid))
            .catch(() => this.close())
    }

    /**
     * Получает доступные задачи для выбора в качестве родителя
     * @returns {Array}
     */
    #getAvailableTasks() {
        const currentTask = state.currentTask
        
        // Исключаем текущую задачу и все её подзадачи
        const excludedUids = this.#getExcludedUids(currentTask)
        
        return state.tasks.filter(task => 
            !excludedUids.includes(task.uid) && 
            task.uid !== currentTask.uid
        )
    }

    /**
     * Рекурсивно получает UID всех подзадач для исключения
     * @param {Object} task 
     * @returns {Array}
     */
    #getExcludedUids(task) {
        let uids = []
        
        const findSubtasks = (parentUid) => {
            const subtasks = state.tasks.filter(t => t.parent === parentUid)
            subtasks.forEach(subtask => {
                uids.push(subtask.uid)
                findSubtasks(subtask.uid)
            })
        }
        
        findSubtasks(task.uid)
        return uids
    }

    /**
     * Находит начальный выбор в списке
     * @param {Array} choices 
     * @returns {number}
     */
    #findInitialChoice(choices) {
        const currentParentUid = state.currentTask.parent
        if (!currentParentUid) return 0 // "No parent"
        
        const index = choices.findIndex(choice => choice.value === currentParentUid)
        return index >= 0 ? index : 0
    }

    /**
     * @param {string|null} selectedParentUid
     */
    async onSelect(selectedParentUid) {
        if (selectedParentUid === undefined || selectedParentUid === state.currentTask.parent) {
            return this.close() // Родитель не изменился
        }

        // Обновляем свойство parent через универсальный метод
        this.updateTaskProp({ parent: selectedParentUid })
        return this.close()
    }

    /**
     * Удаляет родителя у текущей задачи
     */
    async removeParent() {
        if (!state.currentTask.parent) {
            return this.close()
        }

        // Обновляем свойство parent через универсальный метод
        this.updateTaskProp({ parent: null })
        return this.close()
    }
}
