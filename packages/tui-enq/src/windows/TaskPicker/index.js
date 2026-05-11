/**
 * @v3 — рефактор: helpers.js + cursor-sync.js
 */
import Enquirer from 'enquirer'

import { Window } from '#tui/windows/Window/index.js'
import { state } from '#tui/state.js'

import { keyHandlers } from './handlers/index.js'
import { createCursorSyncProxy } from './cursor-sync.js'
import {
    analyticsString,
    headerString,
    buildChoices,
    footerString,
    calcTasksHeight,
    pickInitialIndex,
} from './helpers.js'

const FOOTER_HEIGHT = 5

export default class TaskPicker extends Window {
    constructor() {
        super()
        this.isNoFirstExecute = false

        this.state = createCursorSyncProxy(() => this.prompt)

        this.headerFunc = null
        this.keyHandlers = { ...this.keyHandlers, ...keyHandlers }

        this.open()
    }

    open(headerFunc = null) {
        console.clear()
        this.headerFunc = headerFunc || this.headerFunc

        const choices = buildChoices(state.tasks, state.selectedTasks)
        const initialIndex = pickInitialIndex(state.tasks, state.currentTask)

        const consoleLinesToKeep = this.state.isFirstExecute ? 4 : 2
        state.isFirstExecute = false

        const tasksHeight = calcTasksHeight({
            terminalHeight: process.stdout.rows,
            consoleLinesToKeep,
            headerHeight: headerString(state.tasks, this.headerFunc).split('\n').length,
            footerHeight: FOOTER_HEIGHT,
            tasksCount: state.tasks.length,
        })

        this.prompt = new Enquirer.Select({
            limit: tasksHeight,
            choices,
            multiple: false,
            pointer: '⏿ ',
            header: () => headerString(this.state.tasks, this.headerFunc),
            message: '',
            footer: () => footerString(this.state.currentTask, FOOTER_HEIGHT),
        })

        // Патч enquirer.clear(): родной считает только высоту body и
        // поднимается cursor.prevLine() — при контенте выше экрана
        // (например, после G) prevLine упирается в верх и старый
        // header/body оседают в скроллбэке. Чистим экран целиком.
        this.prompt.clear = function() {
            this.state.buffer = ''
            process.stdout.write('\x1b[H\x1b[2J')
        }

        this.prompt.once('run', () => {
            this.goTo(initialIndex)
            if (this.prompt.focused && this.prompt.focused.value) {
                state.currentTask = this.prompt.focused.value
            }
        })

        this.prompt.run().then().catch()
    }
}
