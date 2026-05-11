import chalk from 'chalk'

import { Command } from './command.js'
import { tagsService } from '@pln/core/services/tags.js'

/**
 * `pln retag <from> <to>` — bulk-переименование тега во всех задачах.
 * Зачем: быстро привести категории к единообразию без ручного редактирования.
 */
export default class RetagCommand extends Command {

    async execute() {
        const [from, to] = this.commandParams.positional

        if (!from || !to) {
            throw new Error('Использование: pln retag <from> <to>')
        }

        const { updated } = await tagsService.rename(from, to)

        if (updated.length === 0) {
            console.log(chalk.gray(`Задач с тегом "${from}" не найдено`))
            return updated
        }

        console.log(chalk.green(`Переименовано: ${updated.length}  ${chalk.cyan(from)} → ${chalk.cyan(to)}`))
        for (const t of updated) {
            console.log(chalk.gray(`  • ${t.shortUid || t.uid.slice(-4)}  ${t.summary}`))
        }
        return updated
    }
}
