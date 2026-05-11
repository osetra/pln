import SummaryEditor from '#tui/windows/editors/SummaryEditor.js'

export default {
    keys: ['I', 'Ш'],
    description: 'Редактировать название (вставить)',
    action() {
        new SummaryEditor('insert')
    }
}
