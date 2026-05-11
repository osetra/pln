import { Filter } from '@pln/core/dto/filter.js'
import { state } from '#tui/state.js'

export default {
    keys: ['x', 'ч'],
    description: 'Показать/скрыть выполненные задачи',
    action() {
        setTimeout(() => {}, 1000)

        state.currentFilter = state.currentFilter
            ? undefined
            : new Filter([
                { field: 'status', value: 'NEEDS-ACTION', combineType: 'only' },
                { field: 'categories', value: 'someday', combineType: 'del' },
                { field: 'categories', value: 'cancel', combineType: 'del' },
            ])

        this.freeze()
        this.open()
    }
}
