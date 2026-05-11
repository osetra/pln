export const commandFactory = {
    /**
     * Создает команду на основе параметров команды
     * @param {import("../dto/command-params/command-params.js").default} commandParams 
     * @returns {import("./command.js").default} Command
     */
    async create(commandParams) {
        // --ink подразумевает команду tui (флаг имеет смысл только там)
        const inkAsTui = commandParams.controlParams?.ink && !commandParams.command
        const commandName = inkAsTui ? 'tui' : (commandParams.command || 'list')

        try {
            const CommandModule = await import(`./${commandName}.js`)
            const CommandClass = CommandModule.default
            
            return new CommandClass(commandParams)
            
        } catch (error) {
            console.debug(`Command ${commandName} not found, falling back to list:`, error)
            const ListCommand = (await import('./list.js')).default;
            return new ListCommand(commandParams)
        }
    }

}
