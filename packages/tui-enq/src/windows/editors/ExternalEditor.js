import { Window } from '../Window/index.js'
import { state } from '../../state.js'
import { externalEditor } from '@pln/core/utils/external-editor.js'

/**
 * Окно для редактирования свойств задачи через внешний редактор
 */
export default class ExternalEditor extends Window {
    /**
     * @param {string} property - имя свойства для редактирования
     * @param {string} filenamePrefix - префикс для временного файла
     */
    constructor(property = 'description', filenamePrefix = 'pln-edit-') {
        super()
        this.property = property
        this.filenamePrefix = filenamePrefix
        this.prompt = `externalEditor`
        this.open()
    }

    open() {
        if (!state.currentTask) {
            this.close()
            return
        }

        const currentValue = state.currentTask[this.property] || ''
        
        externalEditor.openTextInEditor(currentValue, this.filenamePrefix)
            .then(newValue => { this.onSave(newValue.trim()); this.close()})
            .catch(() => { this.close() })
    }

    /**
     * @param {string} newValue
     */
    onSave(newValue) {
        if (!state.currentTask || newValue === state.currentTask[this.property]) {
            return this.close()
        }

        this.updateTaskProp({[this.property]: newValue})
    }
}
