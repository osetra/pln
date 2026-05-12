import PredecessorEditor from '#tui/windows/editors/PredecessorEditor.js'
import { state } from '#tui/state.js'

export default {
  keys: ['b', 'и'],
  description: 'Изменить предшественника (DEPENDS-ON)',
  action() {
    if (state.currentTask) new PredecessorEditor()
  }
}
