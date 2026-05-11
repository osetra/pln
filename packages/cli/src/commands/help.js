import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

import { Command } from './command.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Выводит справку из doc/help/cli-usage.md
 */
export default class HelpCommand extends Command {
  /** @returns {void} */
  execute() {
    const helpPath = join(__dirname, '../../../../doc/help/cli-usage.md')
    console.log(readFileSync(helpPath, 'utf8'))
  }
}
