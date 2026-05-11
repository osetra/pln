import Enquirer from 'enquirer'
import { Window } from '../Window/index.js'
import { state } from '../../state.js'

export default class StatusEditor extends Window {
    constructor() {
        super()

        this.keyHandlers = {
            'l': () => { this.prompt.submit()},
            'д': () => { this.prompt.submit()},

            /* navigation */
            'j': this.down.bind(this),
            'о': this.down.bind(this),
            'k': this.up.bind(this),
            'л': this.up.bind(this),

            'q': () => { this.prompt.keypress('\x1b', { name: 'escape' }) },
            'й': () => { this.prompt.keypress('\x1b', { name: 'escape' }) },

            /* help */
            '?': this.showHelp.bind(this),
        }

        this.property = 'status'
        //state.windows.statusEditor = this
        this.open()
    }

    open() {
        if (!state.currentTask) {
            this.close()
            return
        }

        const statusChoices = [
            { message: '[ ] NEEDS-ACTION', value: 'NEEDS-ACTION' },
            { message: '[x] COMPLETED',    value: 'COMPLETED'    },
            { message: '[-] CANCELLED',    value: 'CANCELLED'    }
        ]

        this.prompt = new Enquirer.Select({
            message: 'Select status:',
            choices: statusChoices,
            initial: statusChoices.findIndex(choice => choice.value === state.currentTask.status),
            footer: (' '.repeat(100)+'\n').repeat(10)
        })

        console.log('\n'.repeat(state.tasks.length))
        this.prompt.run()
            .then(newStatus => this.onSave(newStatus))
            .catch(() => this.close())
    }

    /**
     * @param {string} newStatus
     */
    onSave(newStatus) {
        if (!state.currentTask || newStatus === state.currentTask.status) {
            return this.close()
        }

        this.updateTaskProp({ status: newStatus })
        return this.close()
    }

}
