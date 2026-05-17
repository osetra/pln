import ListCommand from './list.js'
import { loadTasks } from '@pln/core/cache/query-client.js'
import { parseSortFlag } from '@pln/core/services/sortTasks.js'

const SPIN_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

/**
 * Крутит текстовый спиннер в stdout пока promise не зарезолвится.
 * Если задан summary — печатает финальную строку и держит её 500мс
 * чтобы юзер успел прочитать перед открытием TUI.
 * @template T
 * @param {string} label
 * @param {Promise<T>} promise
 * @param {(value: T) => string} [summary]
 * @returns {Promise<T>}
 */
async function withCliSpinner(label, promise, summary) {
    if (!process.stdout.isTTY) return promise
    let i = 0
    const id = setInterval(() => {
        process.stdout.write(`\r\x1b[36m${SPIN_FRAMES[i]}\x1b[0m ${label}`)
        i = (i + 1) % SPIN_FRAMES.length
    }, 80)
    try {
        const value = await promise
        clearInterval(id)
        const msg = summary ? summary(value) : ''
        if (msg) {
            process.stdout.write(`\r\x1b[K\x1b[32m✓\x1b[0m ${msg}\n`)
            await new Promise(r => setTimeout(r, 500))
        } else {
            process.stdout.write('\r\x1b[K')
        }
        return value
    } catch (err) {
        clearInterval(id)
        process.stdout.write('\r\x1b[K')
        throw err
    }
}

export default class TuiCommand extends ListCommand {

    /**
     * Загружает задачи и запускает tui (динамически).
     * @pln/tui и @pln/tui-ink — опциональные пакеты (peerDeps),
     * импортируются только при выполнении команды.
     */
    async execute() {
        const filter = this._buildFilter()
        const tasks = await withCliSpinner(
            'Загрузка задач…',
            loadTasks(filter),
            (t) => `Загружено: ${t.length} задач`,
        )

        if (this.commandParams?.controlParams?.blessed === true) {
            try {
                const { tuiVueBlessed } = await import('@pln/tui-vue-blessed')
                await tuiVueBlessed.run(tasks, { loadFilter: filter })
            } catch (err) {
                console.error('❌ @pln/tui-vue-blessed не установлен или ошибка:', err.message)
            }
            return
        }

        if (this.commandParams?.controlParams?.vue === true) {
            try {
                const { tuiVue } = await import('@pln/tui-vue')
                await tuiVue.run(tasks, { loadFilter: filter })
            } catch (err) {
                if (err.message?.includes('Raw mode')) {
                    console.error('❌ tui-vue требует реальный терминал (raw mode). Запусти напрямую, не через pipe.')
                } else {
                    console.error('❌ @pln/tui-vue:', err.message)
                }
            }
            return
        }

        if (this.commandParams?.controlParams?.ink === true) {
            try {
                const { tuiInk } = await import('@pln/tui-ink')
                tuiInk.run(tasks)
            } catch (err) {
                console.error('❌ @pln/tui-ink не установлен. pnpm add -D @pln/tui-ink (или npm i ink react)')
            }
            return
        }

        try {
            const [{ tui }, { state }] = await Promise.all([
                import('@pln/tui-enq'),
                import('@pln/tui-enq/src/state.js'),
            ])
            state.loadFilter = filter
            tui.run(tasks, { sortOpts: parseSortFlag(this.commandParams?.controlParams?.sort) })
        } catch (err) {
            console.error('❌ @pln/tui-enq не установлен. pnpm install (или npm i enquirer)')
        }
    }
}
