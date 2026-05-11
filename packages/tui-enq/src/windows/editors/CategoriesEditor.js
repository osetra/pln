import Enquirer from 'enquirer'
import { Window } from '../Window/index.js'
import { state } from '../../state.js'

export default class CategoriesEditor extends Window {
    constructor() {
        super()
        this.property = 'categories'
        //state.windows.categoriesEditor = this
        this.open()
    }

    open() {
        if (!state.currentTask) {
            this.close()
            return
        }

        const currentCategories = Array.isArray(state.currentTask.categories) 
            ? state.currentTask.categories.join(', ')
            : ''

        this.prompt = new Enquirer.Input({
            message: 'Categories (comma separated):',
            initial: currentCategories
        })

        this.prompt.run()
            .then(newCategories => this.onSave(newCategories))
            .catch(() => this.close())
    }

    /**
     * @param {string} newCategories
     */
    onSave(newCategories) {
        if (!state.currentTask) {
            return this.close()
        }

        const categoriesArray = newCategories
            .split(',')
            .map(cat => cat.trim())
            .filter(cat => cat.length > 0)

        this.updateTaskProp({ categories: categoriesArray })
        return this.close()
    }

}
