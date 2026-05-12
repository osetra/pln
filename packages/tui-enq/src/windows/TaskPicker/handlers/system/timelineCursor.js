import { state } from '#tui/state.js'

/**
 * Управление курсором/инструментом таймлайна, когда он активен.
 * Если таймлайн не активен — стрелки ↑/↓ ведут себя как обычная
 * навигация по списку задач, остальные клавиши пропускаются.
 */
export default {
  keys: ['up', 'down', 'left', 'right', '1', '2', '3', '4'],
  description: 'Курсор и инструмент таймлайна (когда открыт)',
  action(key) {
    const tl = this.timeline
    const active = state.isActiveTimeline && tl

    if (!active) {
      if (key?.name === 'up')   this.up()
      if (key?.name === 'down') this.down()
      return
    }

    switch (key?.name) {
      case 'up':    tl.state.cursorY-- ; break
      case 'down':  tl.state.cursorY++ ; break
      case 'left':  tl.state.cursorX-- ; break
      case 'right': tl.state.cursorX++ ; break
      case '1': case '2': case '3': case '4':
        tl.setActiveTool(Number(key.name) - 1); break
    }

    console.clear()
    this.prompt.render()
  }
}
