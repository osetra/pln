import { tasksService } from './tasks.js'
import { Filter } from '../dto/filter.js'

/** @typedef {import('../dto/task.js').default} Task */

/**
 * Сервис работы с тегами (categories) — общий слой для CLI/TUI/web.
 * Зачем: вся логика над тегами в одном месте, без дублирования между слоями.
 */
export const tagsService = {

    /**
     * Собрать все уникальные теги и их количество по всем задачам.
     * @returns {Promise<Array<[string, number]>>} массив пар [tag, count],
     *   отсортирован по убыванию count, затем по имени
     */
    async list() {
        const tasks = await tasksService.list(new Filter())

        const counts = new Map()
        for (const task of tasks) {
            const cats = Array.isArray(task.categories) ? task.categories : []
            for (const cat of cats) counts.set(cat, (counts.get(cat) || 0) + 1)
        }
        return [...counts.entries()].sort(
            (a, b) => a[0].localeCompare(b[0])
            //(a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
        )
    },

    /**
     * Bulk-переименование тега во всех задачах: from → to.
     * Если у задачи уже есть `to` — дедуп. Фильтрация в памяти, потому что
     * серверный text-match по CATEGORIES делает iCal-unescape `\\` → `\`,
     * а наш ридер сохраняет raw — сравнения расходятся при тегах со слэшами.
     * @param {string} from
     * @param {string} to
     * @returns {Promise<{updated: Task[], from: string, to: string}>}
     */
    async rename(from, to) {
        if (!from || !to) throw new Error('rename: нужны from и to')
        if (from === to) return { updated: [], from, to }

        const tasks = await tasksService.list(new Filter())

        const updated = []
        for (const task of tasks) {
            const cats = Array.isArray(task.categories) ? task.categories : []
            if (!cats.includes(from)) continue

            const next = []
            const seen = new Set()
            for (const c of cats) {
                const v = c === from ? to : c
                if (seen.has(v)) continue
                seen.add(v)
                next.push(v)
            }

            const merged = await tasksService.update(task, { categories: next })
            updated.push(merged)
        }

        return { updated, from, to }
    },
}
