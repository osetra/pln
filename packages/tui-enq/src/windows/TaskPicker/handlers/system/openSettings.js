import SettingsWindow from '#tui/windows/SettingsWindow.js'

export default {
    keys: [','],
    description: 'Открыть настройки',
    action() {
        new SettingsWindow()
    }
}
