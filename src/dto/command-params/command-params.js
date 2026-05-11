import TaskParams from './task.js'
import FilterParams from './filter.js'
import ControlParams from './control.js'

/**
 * Класс-DTO для передачи в фабрику команды
 */
export default class CommandParams {
    /**
     * @param {Object} params
     * @param {string}        [params.command]
     * @param {TaskParams}    [params.taskFlags]
     * @param {FilterParams}  [params.filterFlags]
     * @param {ControlParams} [params.controlFlags]
     * @param {string[]}      [params.positional]
     */
    constructor({ command, taskParams, filterParams, controlParams, positional } = {}) {
        this.command          = command
        this.taskParams       = new TaskParams(taskParams)
        this.filterParams     = new FilterParams(filterParams)
        this.controlParams    = new ControlParams(controlParams)
        this.positional       = positional || []

        this.#cleanUndefinedProperties()
    }

    #cleanUndefinedProperties() {

        deleteUndefinedProps(this.taskParams)
        deleteUndefinedProps(this.filterParams)
        deleteUndefinedProps(this.controlParams)

        function deleteUndefinedProps(params) {
            for (const key in params) { 
                if (params[key] === undefined) {
                    delete params[key] 
                } 
            }
        }
    }
}
