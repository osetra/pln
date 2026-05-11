/**
 * @v4
 * @ai
 */
import Enquirer from 'enquirer'
import { Window } from './Window/index.js'
import { state } from '../state.js'

export default class Search extends Window {
    constructor() {
        super()
        
        this.searchState = {
            searchField: 'summary',
            searchQuery: ''
        }

        this.keyHandlers = {
            'q': () => { this.close() },
            'й': () => { this.close() },
            '?': this.showHelp.bind(this),
            '!': () => { this.setField('summary') },
            '@': () => { this.setField('description') },
            '#': () => { this.setField('categories') },
        }

        this.open()
    }

    setField(field) {
        this.searchState.searchField = field
        if (this.prompt) {
            this.updatePrompt()
        }
    }

    /**
     * Подготавливает текст для поиска
     * @param {string} text
     * @returns {string}
     */
    prepareText(text) {
        if (!text) return ''
        // Убираем переносы строк и лишние пробелы
        return text
            .replace(/\n/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase()
    }

    /**
     * Получает текст для поиска из задачи
     * @param {Task} task
     * @returns {string}
     */
    getSearchText(task) {
        let text = ''
        
        if (this.searchState.searchField === 'summary') {
            text = task.treeLine || task.summary || ''
        } 
        else if (this.searchState.searchField === 'description') {
            text = task.description || ''
        }
        else if (this.searchState.searchField === 'categories') {
            text = Array.isArray(task.categories) 
                ? task.categories.join(' ') 
                : ''
        }
        
        return this.prepareText(text)
    }

    /**
     * Формирует красивую строку для отображения
     * @param {Task} task
     * @param {string} searchText
     * @returns {string}
     */
    formatDisplayText(task, searchText) {
        let display = ''
        const maxLength = 120
        
        if (this.searchState.searchField === 'summary') {
            display = searchText
        }
        else if (this.searchState.searchField === 'description') {
            // Обрезаем, но сохраняем читаемость
            if (searchText.length > maxLength) {
                display = `📄 ${searchText.substring(0, maxLength - 3)}...`
            } else {
                display = `📄 ${searchText}`
            }
        }
        else if (this.searchState.searchField === 'categories') {
            display = `🏷️  ${searchText}`
        }
        
        // Добавляем заголовок для контекста
        if (task.summary && this.searchState.searchField !== 'summary') {
            const shortSummary = task.summary.length > 40 
                ? task.summary.substring(0, 37) + '...' 
                : task.summary
            display += ` ← "${shortSummary}"`
        }
        
        return display || '(без данных)'
    }

    header() {
        const field = this.searchState.searchField
        const tools = [
            field === 'summary' ? '[!] summary' : '! summary',
            field === 'description' ? '[@] description' : '@ description',
            field === 'categories' ? '[#] categories' : '# categories'
        ]
        return `🔍 Search: ${tools.join(' | ')}`
    }

    /**
     * Получает отфильтрованные choices
     * @returns {Array}
     */
    getFilteredChoices() {
        const query = this.searchState.searchQuery.toLowerCase()
        
        return state.tasks
            .map(task => {
                const searchText = this.getSearchText(task)
                if (!searchText) return null
                
                // ✅ Фильтруем по запросу
                if (query && !searchText.toLowerCase().includes(query)) {
                    return null
                }
                
                const displayText = this.formatDisplayText(task, searchText)
                
                return {
                    name: displayText,
                    message: displayText,
                    value: task,
                    searchString: searchText.toLowerCase()
                }
            })
            .filter(choice => choice !== null)
    }

    /**
     * Обновляет prompt с текущими данными
     */
    updatePrompt() {
        if (this.prompt) {
            const choices = this.getFilteredChoices()
            this.prompt.choices = choices
            this.prompt.limit = Math.min(choices.length, process.stdout.rows - 4)
            this.prompt.render()
        }
    }

    open() {
        const initialChoices = this.getFilteredChoices()
        
        this.prompt = new Enquirer.AutoComplete({
            header: () => this.header(),
            message: () => `search in ${this.searchState.searchField}:`,
            limit: Math.min(initialChoices.length, process.stdout.rows - 4),
            choices: initialChoices,
            // ✅ Кастомная фильтрация при вводе
            suggest: (input, choices) => {
                this.searchState.searchQuery = input
                return this.getFilteredChoices()
            }
        })

        this.prompt.run()
            .then(selectedTask => this.onSelect(selectedTask))
            .catch(() => this.close())
    }

    onSelect(selectedTask) {
        if (selectedTask) {
            state.currentTask = selectedTask
            console.debug('Выбрана задача:', selectedTask.summary)
        }
        this.close()
    }
}
