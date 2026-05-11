import SummaryEditor from '#tui/windows/editors/SummaryEditor.js'

export default {
    keys: ['t', 'е'],
    description: 'Редактировать название (заменить)',
    action() {
        new SummaryEditor('replace')
    }
}
