import chalk from 'chalk'

import { Command } from './command.js'
import { tagsService } from '@pln/core/services/tags.js'

/**
 * `pln tags` — выводит все уникальные теги и количество задач.
 * Зачем: быстрый обзор используемых категорий в задачнике.
 */
export default class TagsCommand extends Command {

    async execute() {
        const sorted = await tagsService.list()

        if (sorted.length === 0) {
            console.log(chalk.gray('Тегов нет'))
            return []
        }

        const nameMax  = Math.max(...sorted.map(([n]) => n.length))
        const countMax = Math.max(...sorted.map(([, c]) => String(c).length))
        const gutter   = 2
        const cellLen  = nameMax + 1 + countMax + gutter

        const termWidth = process.stdout.columns || 80
        const cols = Math.max(1, Math.floor(termWidth / cellLen))
        const rows = Math.ceil(sorted.length / cols)

        for (let r = 0; r < rows; r++) {
            const parts = []
            for (let c = 0; c < cols; c++) {
                const i = c * rows + r
                if (i >= sorted.length) break
                const [name, count] = sorted[i]
                const cell = `${chalk.cyan(name.padEnd(nameMax))} ${chalk.gray(String(count).padStart(countMax))}`
                parts.push(cell + ' '.repeat(gutter))
            }
            console.log(parts.join(''))
        }
        console.log(chalk.gray(`\nВсего тегов: ${sorted.length}`))

        return sorted
    }
}
