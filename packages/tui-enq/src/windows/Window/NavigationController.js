import { state } from '../../state.js'

export default class NavigationController {
    // навигация
    down() {
        if (this.prompt.focused.value.uid === state.tasks[state.tasks.length - 1].uid) return
        this.prompt.down()  

        if (['TaskPicker', 'Timeline'].includes(this.constructor.name) && this.prompt?.focused?.value) {
            // 📌 ОБНОВЛЯЕМ currentTask ТОЛЬКО ДЛЯ TaskPicker
            state.currentTask = this.prompt.focused.value
        }
    }
    up() {
        if (this.prompt.focused.value.uid === state.tasks[0].uid) return
        this.prompt.up()

        if (['TaskPicker', 'Timeline'].includes(this.constructor.name) && this.prompt?.focused?.value) {
            // 📌 ОБНОВЛЯЕМ currentTask ТОЛЬКО ДЛЯ TaskPicker
            state.currentTask = this.prompt.focused.value
        }
    }
    left() { this.prompt.left() }
    right() { this.prompt.right() }
    jumpTop() {
        while (this.prompt.focused.value.uid !== state.tasks[0].uid) {
            this.prompt.up()  
        }
        state.currentTask = state.tasks[0]
    }
    jumpEnd() {
        while (this.prompt.focused.value.uid !== state.tasks.at(-1).uid) {
            this.prompt.down()  
        }
        state.currentTask = state.tasks.at(-1)
    }
    pageDown() {
        const rows = Math.max(1, process.stdout.rows || 24)
        const step = Math.floor(rows / 2)
        const lastUid = state.tasks.at(-1)?.uid

        for (let i = 0; i < step; i++) {
            if (!this.prompt?.focused?.value || this.prompt.focused.value.uid === lastUid) break
            this.prompt.down()
        }
        if (this.constructor.name === 'TaskPicker' && this.prompt?.focused?.value) {
            state.currentTask = this.prompt.focused.value
        }
    }
    pageUp() {
        const rows = Math.max(1, process.stdout.rows || 24)
        const step = Math.floor(rows / 2)
        const firstUid = state.tasks[0]?.uid
        for (let i = 0; i < step; i++) {
            if (!this.prompt?.focused?.value || this.prompt.focused.value.uid === firstUid) break
            this.prompt.up()
        }
        if (this.constructor.name === 'TaskPicker' && this.prompt?.focused?.value) {
            state.currentTask = this.prompt.focused.value
        }
    }

    goTo(index) {
        this.prompt.home()
        //this.down()
        for (let i = 0; i < index; i++) this.down()
    }

    /**
     * Показывает справку по горячим клавишам текущего окна
     */
    showHelp() {
        console.clear()
        console.log('\n' + '='.repeat(40))
        console.log(`📋 Hotkeys for ${this.constructor.name}:`)
        console.log('='.repeat(40))
        
        Object.entries(this.keyHandlers).forEach(([key, handler]) => {
            console.log(`  ${key.padEnd(3)} → ${handler.name}`)
        })
        
        console.log('='.repeat(40) + '\n')
    }
}
