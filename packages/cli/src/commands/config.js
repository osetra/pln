import { Command } from './command.js'

import { config } from '@pln/core/config.js'
import { externalEditor } from '@pln/core/utils/external-editor.js'

export default class ConfigCommand extends Command {
    execute() {
        externalEditor.openFileInEditor(config.configPath)
    }
}
