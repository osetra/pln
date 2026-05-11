import { tasksService } from '@pln/core/services/tasks.js'
import { state }        from '../../state.js'

import NavigationController from './NavigationController.js'

/**
 * Window расширяет NavigationController чтобы предоставить базовую навигацию
 * (up/down/jumpTop/jumpEnd/pageUp/pageDown) всем окнам по умолчанию.
 * 
 * Навигация - это общая функциональность для любого списка/меню в TUI.
 * Каждое окно (TaskPicker, StatusEditor, Search и т.д.) получает эти методы
 * автоматически и может переопределить их при необходимости.
 * 
 * @extends NavigationController
 */

/** @typedef {import('enquirer')} Enquirer */
/** @typedef {import('enquirer').Prompt} Prompt */
/** @typedef {Object.<string, function(Enquirer.KeyInfo)>} KeyHandlerMap */

export default class Window extends NavigationController{
    /** @type {KeyHandlerMap} */
    keyHandlers = {}

    /** @type {Prompt|null} */
    #prompt = null

    constructor() {
        super()
        this.freezeOtherWindows()
        state.activeWindows.push(this)
    }

    /** @param {Prompt|null} p */
    set prompt(p) {
        this.#prompt = p
        //this.keyHandlers.Q = () => {this.close(); process.exit(0)}
        this.#setupKeymaps()
    }
    /**
     * Возвращает текущий prompt.
     * @returns {Prompt|null}
     */
    get prompt() { return this.#prompt }

    open() { throw new Error('Надо переопределить метод открытия окна в наследнике') }

    #setupKeymaps() {
        if (!this.#prompt) return
        if (!this.keyHandlers || Object.values(this.keyHandlers).length === 0) return

        const originalKeypress = this.#prompt.keypress.bind(this.#prompt)

        this.#prompt.keypress = (input, key) => {
            const handler = this.keyHandlers[key.raw] ?? this.keyHandlers[key.name]
            if (handler) handler.call(this, key)
            else originalKeypress(input, key)
        }
    }

    freezeOtherWindows() {
        state.activeWindows.forEach(aw => {
            if (aw && aw !== this) { 
                aw.freeze()
            }
        })
    }

    freeze() {
        try { this.#prompt?.stop() } catch {}
    }
    unfreeze() { 
        console.clear()
        this.open() 
    }

    /**
     * Закрывает текущее окно и открывает предыдущее если есть
     */
    close() {
        if (!this.#prompt) return             // после cancel резолвится промис, если вызвали this.close() и на завершение промиса тоже повешены this.close()
                                              // this.close() тогда вызовется 2 раза, надо защититься от этого

        if (this.#prompt?.cancel) this.#prompt?.cancel()                // завершаем текущий промпт (запускает все then после, резолвит промис)
        this.#prompt = null

        if (state.activeWindows.length !== 1) {
            state.activeWindows.pop()             // удаляем текущее окно
            state.activeWindows.at(-1).unfreeze() // открываем предыдущее
            return
            
        } else {

            const termRows = process.stdout?.rows || 24
            if (state.tasks.length < termRows) {
                console.log('\n'.repeat(state.tasks.length))
            } else {
                process.stdout.write(`\u001b[${termRows};0H`) // CSI <row>;<col>H
            }
            process.exit(0)
        }
    }

    /**
     * Универсальный метод для обновления свойства задачи
     * @param {Object} updates - объект с обновлениями {property: newValue}
     */
    updateTaskProp(updates) {
        // Определяем к каким задачам применять - выделенным или текущей
        const tasksToUpdate = state.selectedTasks.length > 0 
            ? state.selectedTasks 
            : (state.currentTask ? [state.currentTask] : [])

        if (tasksToUpdate.length === 0) {
            return
        }

        for (const task of tasksToUpdate) {
            // Проверяем, есть ли реальные изменения
            const hasChanges = Object.entries(updates).some(([property, newValue]) => 
                newValue !== task[property]
            )

            if (!hasChanges) {
                continue
            }

            // Применяем все обновления
            Object.entries(updates).forEach(([property, newValue]) => {
                task[property] = newValue
            })
            
            // Обновляем задачи в состоянии
            state.tasks = state.tasks.map(t =>
                t.uid === task.uid ? task : t
            )
            
            // Сохраняем в бэкенд
            tasksService.update(task, { uid: task.uid, ...updates })
        }
    }

}
