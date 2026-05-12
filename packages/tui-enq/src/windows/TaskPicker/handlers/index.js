// navigation
import down from './navigation/down.js'
import up from './navigation/up.js'
import jumpTop from './navigation/jumpTop.js'
import jumpEnd from './navigation/jumpEnd.js'
import pageUp from './navigation/pageUp.js'
import pageDown from './navigation/pageDown.js'
import close from './navigation/close.js'

// filters
import toggleShowOnlyActiveTasks from './filters/toggleShowOnlyActiveTasks.js'
import toggleSubtasks from './filters/toggleSubtasks.js'

// search
import openSearch from './search/openSearch.js'

// editing
import editDescription from './editing/editDescription.js'
import toggleSessionTimer from './editing/toggleSessionTimer.js'
import editSummary from './editing/editSummary.js'
import editSummaryInsert from './editing/editSummaryInsert.js'
import editSummaryAppend from './editing/editSummaryAppend.js'
import editStatus from './editing/editStatus.js'
import editPriority from './editing/editPriority.js'
import editCategories from './editing/editCategories.js'
import editDate from './editing/editDate.js'
import changeParent from './editing/changeParent.js'
import changePredecessor from './editing/changePredecessor.js'

// tasks
import addTask from './tasks/addTask.js'
import addSubtask from './tasks/addSubtask.js'
import deleteTask from './tasks/deleteTask.js'

// selection
import toggleSelection from './selection/toggleSelection.js'
import clearSelection from './selection/clearSelection.js'

// system
import showHelp from './system/showHelp.js'
import showReport from './system/showReport.js'
import toggleTimeline from './system/toggleTimeline.js'
import timelineCursor from './system/timelineCursor.js'
import refresh from './system/refresh.js'
import openSettings from './system/openSettings.js'

const handlers = [
    down, up, jumpTop, jumpEnd, pageUp, pageDown, close,
    toggleShowOnlyActiveTasks, toggleSubtasks,
    openSearch,
    editDescription, toggleSessionTimer, editSummary, editSummaryInsert, editSummaryAppend,
    editStatus, editPriority, editCategories, editDate, changeParent, changePredecessor,
    toggleSelection, clearSelection,
    addTask, addSubtask, deleteTask,
    showHelp, showReport, toggleTimeline, timelineCursor, refresh, openSettings
]

/** @type {Object.<string, Function>} */
export const keyHandlers = {}

for (const handler of handlers) {
    if (!handler?.keys || !handler?.action) continue
    
    for (const key of handler.keys) {
        keyHandlers[key] = handler.action
    }
}
