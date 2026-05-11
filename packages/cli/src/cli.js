import { parser } from './parser.js'
import { commandFactory } from './commands/factory.js'

import overrideConsoleLogs from '@pln/core/utils/debug/debug.js';

export const cli = {
    handleInput(args) {
        if (args.includes('--help') || args.includes('-?')) {
            args = ['help']
        }
        const commandParams = parser.parse(args)

        commandParams.controlParams.verbose
            ? overrideConsoleLogs(true)
            : overrideConsoleLogs(false); console.debug('🐛 Запущено с режимом отладки, показаны все console.debug()')
        console.dir(commandParams, { depth: null, colors: true })

        commandFactory.create(commandParams).then(command => {
            executeCommand(command) 
        })
    }
}

function executeCommand(command) {
    try {
        command.execute()
    } catch (err) {
        if (err.message && err.message.includes('SIGINT') || err.length < 1) {
            console.log('\n❗️ Прервано пользователем (Ctrl+C).')
            process.exit(0)
        }
        console.error('❌:\n', err.message)
        console.log('🛠️ Вызовы:\n', err.stack)
        process.exit(1)
    }
}
