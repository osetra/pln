import FlowchartWindow from '#tui/windows/Flowchart/FlowchartWindow.js'
import { state } from '#tui/state.js'

export default {
  keys: ['F'],
  description: 'ASCII-flowchart цепочки задач (DEPENDS-ON)',
  action() {
    if (state.currentTask) new FlowchartWindow()
  }
}
