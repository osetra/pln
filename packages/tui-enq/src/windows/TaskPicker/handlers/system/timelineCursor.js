import { state } from '#tui/state.js'

/**
 * Управление курсором/инструментом/маркерами таймлайна (когда открыт).
 * Если таймлайн не активен — стрелки ↑/↓ ведут себя как обычная
 * навигация по списку задач, остальные клавиши пропускаются.
 */
export default {
  keys: ['up', 'down', 'left', 'right', '1', '2', '3', '4', 'o', 'щ'],
  description: 'Курсор, инструмент и листание маркеров таймлайна',
  action(key) {
    const tl = this.timeline
    const active = state.isActiveTimeline && tl
    const name = key?.name
    const raw  = key?.raw

    if (!active) {
      if (name === 'up')   this.up()
      if (name === 'down') this.down()
      return
    }

    if (name === 'up')         tl.state.cursorY--
    else if (name === 'down')  tl.state.cursorY++
    else if (name === 'left')  tl.state.cursorX--
    else if (name === 'right') tl.state.cursorX++
    else if (['1','2','3','4'].includes(raw)) tl.setActiveTool(Number(raw) - 1)
    else if (raw === 'o' || raw === 'щ') cycleMarker.call(this, tl)

    console.clear()
    this.prompt.render()
  }
}

/**
 * Листает маркеры в текущей ячейке и подсвечивает соответствующую задачу
 * в списке TaskPicker (через cursor-sync proxy).
 * @param {Object} tl - инстанс Timeline
 */
function cycleMarker(tl) {
  const {x, y} = tl.getLimitedXY()
  const cell = tl.grid?.[y]?.[x]
  if (!cell?.markers?.length) return

  const next = (tl.state.currentMarkerIndex + 1) % cell.markers.length
  tl.state.currentMarkerIndex = next

  const task = cell.markers[next]?.task
  if (task) this.state.currentTask = task
}
