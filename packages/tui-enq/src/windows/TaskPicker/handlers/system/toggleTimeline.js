import TimelineWindow from '#tui/windows/Timeline/TimelineWindow.js'
import { state } from '#tui/state.js'

export default {
    keys: ['#'],
    description: 'Показать/скрыть таймлайн',
    action() {
        state.isActiveTimeline = !state.isActiveTimeline

        if (state.isActiveTimeline && !this.timeline) {
            this.timeline = new TimelineWindow()
            this.headerFunc = () => this.timeline.render(state.tasks)
        } else if (!state.isActiveTimeline && this.timeline) {
            this.timeline = null
            this.headerFunc = null
        }

        console.clear()
        this.prompt.render()
    }
}
