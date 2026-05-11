import { state } from '#tui/state.js'

/**
 * Создаёт Proxy для state, который при любой записи синхронизирует курсор
 * Enquirer-prompt'a с позицией state.currentTask в state.tasks.
 *
 * Зачем: при mutation (изменение фильтра, выделения, задачи) хотим оставить
 * курсор на той же задаче, на которой он был. Если задачи нет в видимом
 * scope — оставляем курсор на 0 и просто перерисовываем.
 *
 * @param {() => Object} getPrompt - геттер актуального enquirer-prompt
 * @returns {Proxy}
 */
export function createCursorSyncProxy(getPrompt) {
    return new Proxy(state, {
        get: (obj, prop) => obj[prop],
        set: (obj, prop, newValue) => {
            obj[prop] = newValue
            const prompt = getPrompt()
            if (!prompt) return true

            prompt.home()

            const countDown = state.tasks.findIndex(t => t.uid === state.currentTask?.uid)
            if (countDown < 0) {
                prompt.render()
                return true
            }
            for (let i = 0; i < countDown; i++) prompt.down()

            prompt.render()
            return true
        },
    })
}
