import Enquirer from 'enquirer'
import { Window } from '../Window/index.js'

/** Редактор числового значения (количество дней) */
export class NumberEditor extends Window {

    constructor(initialValue, onChange) {
        super()
        this.initialValue = initialValue
        this.onChange = onChange
        this.keyHandlers = {
            'q': () => this.prompt?.cancel(),
            'й': () => this.prompt?.cancel(),

            'j': this.down.bind(this),
            'о': this.down.bind(this),
            'k': this.up.bind(this),
            'л': this.up.bind(this),
        }
        this.open()
    }

    open() {
        const choices = [
            { name: '1', }, { name: '2', }, { name: '3', }, { name: '4', }, { name: '5', },
            { name: '6', }, { name: '7', }, { name: '8', }, { name: '9', }, { name: '10', }
        ]

        this.prompt = new Enquirer.Select({
            name: 'daysBack',
            message: 'Количество дней для отображения:',
            choices: choices,
            initial: this.initialValue - 1,
        })

        this.prompt.run()
            .then((answer) => {
                const newValue = parseInt(answer)
                if (this.onChange) {
                    this.onChange(newValue)
                }
                this.close()
            })
            .catch(() => {
                this.close()
            })
    }
}
