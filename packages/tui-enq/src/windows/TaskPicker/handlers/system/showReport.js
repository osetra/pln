import ReportWindow from '#tui/windows/Report.js'

export default {
    keys: ['!'],
    description: 'Показать отчёт',
    action() {
        new ReportWindow()
    }
}
