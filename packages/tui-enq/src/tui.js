import { config } from '@pln/core/config.js'

import { state } from './state.js'
import { collapseAllSubtasks } from './subtasks.js'

import TaskPicker from './windows/TaskPicker/index.js'
//import Timeline from './windows/Timeline/Timeline.js'

/**
 * Включить alternate screen buffer и гарантировать откат при любом выходе.
 * Зачем: enquirer мусорит header/footer в скроллбэк (см. clear()/render()
 * в node_modules/enquirer/lib/prompts/select.js) — alt-screen изолирует tui
 * от основной истории терминала, на выходе экран возвращается как был.
 */
function enterAltScreen() {
  process.stdout.write('\x1b[?1049h')
  const exit = () => process.stdout.write('\x1b[?1049l')
  process.on('exit', exit)
  process.on('SIGINT', () => process.exit(130))
  process.on('SIGTERM', () => process.exit(143))
  process.on('uncaughtException', err => { exit(); console.error(err); process.exit(1) })
}

export const tui = {
  run(initTasks) {
    if (initTasks.length === 0) console.log('Нет задач')
    enterAltScreen()
    state.tasks = initTasks

    if (config.tuiCollapseSubtasks) collapseAllSubtasks()

    new TaskPicker()
    //new Timeline().open()
  },
}
