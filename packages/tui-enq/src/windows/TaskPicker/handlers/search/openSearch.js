import SearchWindow from '#tui/windows/SearchWindow.js'

export default {
    keys: ['/', '.'],
    description: 'Поиск задач',
    action() {
        new SearchWindow()
    }
}
