import Enquirer from 'enquirer'
import { Window } from '../Window/index.js'
import { state } from '../../state.js'

export default class PriorityEditor extends Window {
    constructor() {
        super()

        this.keyHandlers = {
            /* navigation */
            'q': () => { this.prompt.keypress('\x1b', { name: 'escape' }) },
            'й': () => { this.prompt.keypress('\x1b', { name: 'escape' }) },

            'h': this.left.bind(this),
            'р': this.left.bind(this),
            'l': this.right.bind(this),
            'д': this.right.bind(this),
        }

        this.property = 'priority'
        //state.windows.priorityEditor = this
        this.open()
    }

    open() {
        if (!state.currentTask) {
            this.close()
            return
        }

        const currentPriority = state.currentTask.priority || 0
        
        const scale = [
            { name: '0', message: '0 - No priority', value: 0 },
            { name: '1', message: '1 - Highest', value: 1 },
            { name: '2', message: '2 - High', value: 2 },
            { name: '3', message: '3 - Medium-High', value: 3 },
            { name: '4', message: '4 - Medium', value: 4 },
            { name: '5', message: '5 - Normal', value: 5 },
            { name: '6', message: '6 - Medium-Low', value: 6 },
            { name: '7', message: '7 - Low', value: 7 },
            { name: '8', message: '8 - Very Low', value: 8 },
            { name: '9', message: '9 - Lowest', value: 9 }
        ]

        this.prompt = new Enquirer.Scale({
            name: 'priority',
            message: 'Select priority (0-9):',
            scale: scale,
            margin: [0, 0, 2, 1],
            choices: [
                {
                    name: 'priority',
                    message: 'Priority level:',
                    initial: Math.min(Math.max(currentPriority, 0), 9)
                }
            ]
        })

        // 📌 Настраиваем обработку клавиш для Scale prompt
        const originalKeypress = this.prompt.keypress.bind(this.prompt)
        
        this.prompt.keypress = (input, key) => {
            // Обработка специфичных клавиш Scale prompt
            if (key.name === 'left' || key.raw === 'h' || key.raw === 'р') {
                this.prompt.left()
                return
            }
            if (key.name === 'right' || key.raw === 'l' || key.raw === 'д') {
                this.prompt.right()
                return
            }
            
            // Вызываем обработчики из keyHandlers
            const handler = this.keyHandlers[key.raw] ?? this.keyHandlers[key.name]
            if (handler) {
                handler.call(this, key)
                return
            }
            
            // Оригинальная логика для остальных клавиш
            if (originalKeypress) {
                return originalKeypress(input, key)
            }
        }

        console.log('\n'.repeat(state.tasks.length))
        this.prompt.run()
            .then(result => {
                const newPriority = parseInt(scale[result.priority].name, 10)
                this.onSave(newPriority)
            })
            .catch(() => this.close())
    }

    /**
     * @param {number} newPriority
     */
    onSave(newPriority) {
        if (!state.currentTask || newPriority === state.currentTask.priority) {
            return this.close()
        }

        this.updateTaskProp({ priority: newPriority })
        return this.close()
    }
}
