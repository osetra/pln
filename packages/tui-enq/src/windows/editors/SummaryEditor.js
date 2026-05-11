import Enquirer from 'enquirer'
import { Window } from '../Window/index.js'
import { state } from '../../state.js'

//import EditCommand from '@pln/core/commands/edit.js'
//import CommandParams from '@pln/core/dto/command-params/command-params.js'
//import TaskParams from '@pln/core/dto/command-params/task.js'
//import { consolePrinter } from '@pln/core/printer/console-printer.js'

export default class SummaryEditor extends Window {
    /**
     * @param {'replace'|'insert'|'append'} editMode
     */
    constructor(editMode = 'replace') {
        super()
        this.editMode = editMode
        this.open()
    }

    open() {
        if (!state.currentTask) {
            this.close()
            return
        }

        let initial = state.currentTask.summary || ''
        
        if (this.editMode === 'insert') {
            initial = ''
        }

        this.prompt = new Enquirer.Input({
            message: 'Summary:',
            initial: initial
        })

        // модификация для редактирования с конца / с начала
        if (this.editMode === 'append') {
            this.prompt.once('run', () => {
                this.prompt.append(state.currentTask.summary || '')
            })
        } else if (this.editMode === 'insert') {
            this.prompt.once('run', () => {
                this.prompt.append(state.currentTask.summary || '')
                this.prompt.first()
            })
        }

        // run
        this.prompt.run()
            .then(newSummary => {
                this.onSave(newSummary)
                this.close()
            })
            .catch((error) => {
                console.log(error)
                this.close()
            })
    }

    /**
     * @param {string} newSummary
     */
    onSave(newSummary) {
        if (!newSummary || !state.currentTask || newSummary === state.currentTask.summary) {
            return this.close()
        }

        this.updateTaskProp({summary: newSummary})
        //return this.close()
    }

}
