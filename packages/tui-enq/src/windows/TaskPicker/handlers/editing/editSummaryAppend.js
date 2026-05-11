import SummaryEditor from '#tui/windows/editors/SummaryEditor.js'

export default {
    keys: ['A', 'Ф'],
    description: 'Редактировать название (добавить)',
    action() {
        new SummaryEditor('append')
    }
}
