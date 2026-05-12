import CommandParams from '@pln/core/dto/command-params/command-params.js'

import TaskParams from '@pln/core/dto/command-params/task.js'
import FilterParams from '@pln/core/dto/command-params/filter.js'
import ControlParams from '@pln/core/dto/command-params/control.js'

export const parser = {

    flagShortMap: {
        'f': 'clientFilter', 'b': 'backendFilter',
        'sd': 'showDescription', 'showdescription': 'showDescription',
        'fu': 'fullUid', 'fulluid': 'fullUid',
        'F': 'flowchart', 'flowchart': 'flowchart',

        'a': 'all', 't': 'summary', 'c': 'categories', 's': 'status',
        'd': 'description', 'e': 'due',
        'n': 'count', 'v': 'verbose', 'r': 'raw',
        'h': 'hide', 'u': 'uid', 'P': 'parent', 'pr': 'priority',

        'l': 'childrensLevel', 'p': 'parentsLevel', 'L': 'levelAll' , 'up': 'parentsAll',

        'del': 'del',

        'ink': 'ink',
        'vue': 'vue',
        'blessed': 'blessed',

        'was': 'withActiveSessions',
        'withactivesessions': 'withActiveSessions',

        'ac': 'addCategories',
        'addcategory': 'addCategories',
        'addcategories': 'addCategories',

        'pre': 'predecessors',
        'predecessors': 'predecessors',
        'after': 'predecessors',
    },

    /**
     * @param {string[]} rawArgs
     * @returns {CommandParams}
     */
    parse(rawArgs) {
        const tempResult = new CommandParams()

        for (let index = 0; index < rawArgs.length; index++) {
            const rawArg = rawArgs[index]

            // list  -c  inbox -l 6 -t 'описание'
            // 👆cmd  👆flag 👆value

            const fullArg = this.flagShortMap[rawArg.replaceAll('-', '')] || rawArg.replaceAll('-', '')
            const argumentType = this.checkArgumentType(rawArg, index)

            switch (argumentType) {
                case 'command':
                    tempResult.command = fullArg
                    break
                case 'flagName':
                    const { category, type } = this.checkFlagType(fullArg)
                    if (type === 'boolean') {
                        tempResult[category][fullArg] = true
                    } else if (type === 'array') {
                        (tempResult[category][fullArg] ||= []).push(rawArgs[++index])
                    } else {
                        tempResult[category][fullArg] = rawArgs[++index]
                    }
                    break
                case 'positional':
                    if (!tempResult.command) { tempResult.command = fullArg; break }
                    tempResult.positional.push(rawArg)
                    break
            }
        }
        return new CommandParams(tempResult) 
    },
    /**
     * Определит тип аргумента cli
     * @param {string} rawArg
     * @param {number} index - индекс текущего элементы
     * @returns {'value'|'command'|'flag'|'positional'}
     */
    checkArgumentType(rawArg, index) {
        if (rawArg.startsWith('-')) {
            return 'flagName'
        }
        if (index === 0) {
            return 'command'
        }
        if (true) {
            return 'positional'
        }
    },

    /**
     * @param {string} flagName - полное имя флага
     * @returns {{ category: 'taskParams' | 'filterParams' | 'controlParams', valueType: boolean | string | number | Array }}
     */
    checkFlagType(flagName) {
        if (TaskParams.PROPERTY_TYPES[flagName]) {
            return { category: 'taskParams', type: TaskParams.PROPERTY_TYPES[flagName] }
        }
        if (FilterParams.PROPERTY_TYPES[flagName]) {
            return { category: 'filterParams', type: FilterParams.PROPERTY_TYPES[flagName] }
        }
        if (ControlParams.PROPERTY_TYPES[flagName]) {
            return { category: 'controlParams', type: ControlParams.PROPERTY_TYPES[flagName] }
        }
    }
}
