/**
 * @v4
 * Как просто возвращающий строку
 * А не extends Window
 */
// visible
import analizeTasks                 from '@pln/core/services/analizeTasks.js'
import { consolePrinter }           from '@pln/core/printer/console-printer.js'

// underhood
import { config }                   from "@pln/core/config.js"
import { render as renderTimeline } from './render.js'


export default class Timeline {
    constructor() {
        this.tools = [
            { emoji: '🚩', name: 'start' },
            { emoji: '📅', name: 'due' },
            { emoji: '🏁', name: 'completed' },
            { emoji: '🌱', name: 'created' }
        ]
        
        this.state = {
            cursorX: 0,
            cursorY: 0,
            hoursStep: config.hoursStep,
            rowsOnTimeline: config.rowsOnTimeline,
            cellWidth: config.cellWidth,
            daysOnTimeline: config.daysOnTimeline,
            activeTool: this.tools[0],
            currentMarkerIndex: 0
        }
        
        this.grid = null
    }
    
    /**
     * Рендерит таймлайн со статистикой и инструментами
     * @param {Object} tasks - задачи для отображения
     * @returns {string} - отрендеренный таймлайн
     */
    render(tasks) {
        //const stats = this.#showAnalitics(tasks)
        const timeline = this.#renderTimeline(tasks)
        const tools = this.#renderTools()
        
        return ''
            //+ stats + '\n'
            + timeline
            + '\n' + tools
    }
    
    /**
     * Рендерит только таймлайн (без статистики и инструментов)
     * @param {Object} tasks - задачи
     * @returns {string}
     */
    #renderTimeline(tasks) {
        const activeCell = {x: this.state.cursorX, y: this.state.cursorY}
        const [ renderedTimeline, grid ] = renderTimeline({
            tasks,
            activeCell,
            cellWidth: this.state.cellWidth,
            rowsOnTimeline: this.state.rowsOnTimeline,
            daysOnTimeline: this.state.daysOnTimeline,
        })
        this.grid = grid
        return renderedTimeline
    }
    
    /**
     * Рендерит строку инструментов
     * @returns {string}
     */
    #renderTools() {
        const {x, y} = this.getLimitedXY()
        const cell = this.grid?.[y]?.[x]
        
        const toolsStr = this.tools.map(t => {
            return t.name === this.state.activeTool.name
                ? `[${t.emoji}${t.name}]`
                : ` ${t.emoji}${t.name} `
        }).join('  ')
        
        const markerInfo = cell?.markers?.[this.state.currentMarkerIndex]
            ? `[${markerInfo.label} ${this.state.currentMarkerIndex+1}/${cell.markers.length}]`
            : ''
            
        return toolsStr + markerInfo
    }
    
    /**
     * Показывает статистику
     * @param {Object} tasks
     * @returns {string}
     */
    #showAnalitics(tasks) {
        const metrics = analizeTasks(tasks)
        return consolePrinter.printAnalitics(metrics, {print: false})
    }
    
    /**
     * Ограничивает координаты курсора
     * @returns {{x: number, y: number}}
     */
    getLimitedXY() {
        const y = this.state.cursorY < 0 
            ? 0 
            : this.state.cursorY >= this.state.rowsOnTimeline
                ? (this.state.rowsOnTimeline - 1)
                : this.state.cursorY

        const x = this.state.cursorX < 0 
            ? 0 
            : this.state.cursorX >= this.state.daysOnTimeline - 1 
                ? this.state.daysOnTimeline 
                : this.state.cursorX
                
        return {x, y}
    }
    
    /**
     * Устанавливает активный инструмент
     * @param {number} num - номер инструмента
     */
    setActiveTool(num) {
        if (num >= 0 && num < this.tools.length) {
            this.state.activeTool = this.tools[num]
        }
    }
}
