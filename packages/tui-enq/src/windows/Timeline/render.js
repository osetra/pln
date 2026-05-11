import { config } from "@pln/core/config.js"
import Task from "@pln/core/dto/task.js"
import chalk from "chalk"

/**
 * @param {CellData | string} cell 
 * @returns {string} - отрендеренная ячейка
 */
function renderCell(cell, cellWidth = 9) {
    let emptyCell
    if (cellWidth % 2 === 0) {

        const sideLength = (cellWidth - 2) / 2
        emptyCell = ('  ·').repeat(sideLength).slice(-sideLength) + ('  ') + ('·  ').repeat(sideLength).slice(0, sideLength)
    } else {
        const sideLength = (cellWidth-1) / 2

        if (sideLength <= 1) 
            emptyCell = (' ').repeat(sideLength) + '.' + (' ').repeat(sideLength)

        emptyCell = (' .').repeat(sideLength) + (' ')
    }

    const cellContent = typeof cell === 'string' 
        ? cell 
        : cell.markers && cell.markers.length > 0
            ? cell.markers.map(m => m.label)
                .sort((a, b) => (a.includes('░') ? -1 : 1))
                .join('') + ' ' 
                + (cell.markers.find(m => ['start', 'due', 'completed'].includes(m.type))?.task.summary || '')
                //+ cell.markers[0].task?.summary || ''
                //+ cell.markers?.find(m => m.label !== 'duration')?.label + ' ' + (cell.markers[0]?.task?.summary || '')
                //+ cell.markers[0].task?.summary || ''
            : ''

    let render = emptyCell.slice(0, 1) + cellContent.slice(0, cellWidth-1) + emptyCell.slice(cellContent.length + 1)
    if (cell.isActive) render = chalk.yellow(`[${render.slice(1, -1)}]`)
    if (cell.isCurrentTime) render = chalk.blue(render)//(`[${render.slice(1, -1)}]`)
    return render
}

function getNearestMonday(date = new Date()) {
    const day = date.getDay()
    const monday = new Date(date)
    const diff = day === 0 ? -6 : 1 - day // Если воскресенье, откатываем на 6 дней назад
    monday.setDate(date.getDate() + diff)
    monday.setHours(0, 0, 0, 0)
    return monday
}

/**
 * Создает сетку временной шкалы с заданным количеством дней и строк.
 * Каждая ячейка содержит время, начиная с указанного часа и с заданным шагом.
 *
 * @param {Object} params - Параметры временной шкалы.
 * @param {number} params.daysOnTimeline - Количество дней на временной шкале (например, 2: Пн, Вт).
 * @param {number} params.rowsOnTimeline - Количество строк в сетке.
 * @param {'today'|'monday'|Date} params.dateStart - Первый день на таймлайне.
 * @param {number} params.hoursStart - Начальный час для отображения.
 * @param {number} params.hoursStep - Интервал между часами в строках.
 * @returns {Date[][]} - Двумерный массив, представляющий временную шкалу.
 *
 *
 * @example
 * ['09:00', '09:00', '09:00', '09:00']
 * ['12:00', '12:00', '12:00', '12:00']
 */
function DateGrid({daysOnTimeline, rowsOnTimeline, hoursStart, hoursStep, dateStart = 'monday'}) {
    const grid = []
    
    const startDate = dateStart === 'today'
        ? new Date()
        : dateStart === 'monday'
            ? getNearestMonday(new Date())
            : new Date(dateStart)
    
    startDate.setHours(0, 0, 0, 0)

    for (let rowNumber = 0; rowNumber < rowsOnTimeline; rowNumber++) {
        grid[rowNumber] = []
        const hour = hoursStart + rowNumber * hoursStep
        
        for (let day = 0; day < daysOnTimeline; day++) {
            const date = new Date(startDate)
            date.setDate(startDate.getDate() + day)
            date.setHours(hour, 0, 0, 0)
            grid[rowNumber][day] = date
        }
    }
    
    return grid
}

class CellMarker {
    /**
     * @param {Task} task - задача
     * @param {string} label - метка ('🚩', '🟧', etc)
     * @param {Date} timestamp - временная метка
     * @param {string} type - тип метки ('start', 'due', 'completed', 'duration')
     */
    constructor(task, label, timestamp, type) {
        this.task = task
        this.label = label
        this.timestamp = timestamp
        this.type = type
    }
}

class CellData {
    /**
     * @param {CellMarker[]} markers  - метки в ячейке
     * @param {Date} date             - дата
     * @param {boolean} isActive      - активна ли ячейка
     * @param {boolean} isCurrentTime - ячейка текущего времени
     */
    constructor(markers = [], date, isActive = false, isCurrentTime) {
        this.markers       = markers
        this.date          = date
        this.isActive      = isActive
        this.isCurrentTime = isCurrentTime
    }
    
    /**
     * @returns {Task[]} уникальные задачи из меток
     */
    get tasks() {
        return [...new Set(this.markers.map(marker => marker.task))]
    }
}

/**
 * @param {Date[][]} dateGrid 
 * @param {Task[]} tasks
 * @param {{x: number, y: number}} activeCell
 * @returns {CellData[][]}
 */
function fillGrid(dateGrid, tasks, activeCell = {x: 0, y: 0}) {
    const hoursStep = Math.abs(dateGrid[1]?.[0]?.getHours() - dateGrid[0]?.[0]?.getHours()) || 1
    const labels = {
        created:   '🌱',
        dtstamp:   '📌',
        start:     '🚩', 
        due:       '🟧',
        modified:  '🔧',
        completed: '🏁',
        duration:  '░ ', // для длительных задач
    }

    const filledGrid = dateGrid.map(row => {
        return row.map(cellDate => {
            const cellEnd = new Date(cellDate)
                  cellEnd.setHours(cellDate.getHours() + hoursStep)
            
            const markers = []

            tasks.forEach(task => {
                function checkDate(date, type) {
                    if (date && cellDate <= date && date < cellEnd) {
                        markers.push(new CellMarker(task, labels[type], date, type))
                    }
                }

                checkDate(task.created, 'created')
                checkDate(task.dtstamp, 'dtstamp') 
                checkDate(task.start, 'start')
                checkDate(task.due, 'due')
                checkDate(task.modified, 'modified')
                checkDate(task.completed, 'completed')

                // Проверяем длительные задачи
                if (task.start && task.due && 
                    task.start <= cellDate && task.due >= cellEnd) {
                        const hasStartOrDue = markers.some(marker => 
                            marker.task === task && (marker.type === 'start' || marker.type === 'due')
                        )
                        
                        if (!hasStartOrDue) {
                            markers.push(new CellMarker(task, labels.duration, null, 'duration'))
                        }
                }
            })

            const isCurrentTime = cellDate <= new Date() && new Date() < cellEnd;
            return new CellData(markers, cellDate, false, isCurrentTime)
        })
    })
    filledGrid[activeCell.y][activeCell.x].isActive = true

    return filledGrid
}

export let xOffset
export let yOffset
/**
 * @returns {[string, CellData[][]} 
 *     1. объединённые строки отрендеренного таймлайна,
 *     2. grid - двумерный массив
 */
export function render({
    daysOnTimeline = config.daysOnTimeline,
    rowsOnTimeline = config.rowsOnTimeline,
    hoursStart = config.hoursStart,
    hoursStep = config.hoursStep,
    cellWidth = config.cellWidth,
    timeCellWidth = config.timeCellWidth,
    dateStart = config.dateStart,
    activeCell = { x: 0, y: 0 },
    tasks = []
}) {
    // Offset для ВЛЕВО/ВВЕРХ (отрицательные)
    const xOffsetLeft = Math.min(0, activeCell.x)
    const yOffsetUp = Math.min(0, activeCell.y)
    
    // Offset для ВПРАВО/ВНИЗ (положительные)  
    const xOffsetRight = Math.max(0, activeCell.x - daysOnTimeline + 1)
    const yOffsetDown = Math.max(0, activeCell.y - rowsOnTimeline + 1)

    // Комбинируем offsets
    /*const*/ xOffset = xOffsetLeft + xOffsetRight
    /*const*/ yOffset = yOffsetUp + yOffsetDown

    // Вычисляем начальную дату и время
    let startDate = dateStart === 'today'
        ? new Date()
        : dateStart === 'monday'
            ? getNearestMonday(new Date())
            : new Date(dateStart)
    
    startDate.setDate(startDate.getDate() + xOffset)
    const adjustedHoursStart = hoursStart + (yOffset * hoursStep)

    const dateGrid = DateGrid({
        daysOnTimeline,
        rowsOnTimeline,
        dateStart: startDate,
        hoursStart: adjustedHoursStart,
        hoursStep,
    })

    // Корректируем активную ячейку
    const adjustedActiveCell = {
        x: activeCell.x - xOffset,
        y: activeCell.y - yOffset
    }

    const grid = fillGrid(dateGrid, tasks, adjustedActiveCell)

    /**
     * @returns {String[]}
     */
    function renderRows(grid) {
        return grid.map(cells => {
            const renderedCells = cells.map( cell => renderCell(cell, cellWidth) )

            const dt = new Date(cells[0].date)
            const timeString = dt.getHours().toString().padStart(2, '0') + ':' + dt.getMinutes().toString().padStart(2, '0')
            renderedCells.unshift(renderCell(timeString, timeCellWidth))

            return '│' + renderedCells.join('│') + '│'
        })
    }
    
    const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
    const daysHeader = dateGrid[0].map((date, index) => {
        const dayName = dayNames[date.getDay()] || '??'
        const dayNumber = date.getDate().toString().padStart(2, '0')
        const month = !index ? '-'+(date.getMonth() + 1) : ''
        return `${dayName} ${dayNumber}${month}`
    })

    const daysLine = ' '.repeat(timeCellWidth + 1) + daysHeader.map(day => 
        day.padEnd(cellWidth).slice(0, cellWidth)
    ).join(' ')
    const header = '╭' + ('─').repeat(timeCellWidth) + ('┬' + ('─').repeat(cellWidth)).repeat(daysOnTimeline) + '╮'
    const footer = '╰' + ('─').repeat(timeCellWidth) + ('┴' + ('─').repeat(cellWidth)).repeat(daysOnTimeline) + '╯'
    //const header = '┌' + ('─').repeat(timeCellWidth) + ('┬' + ('─').repeat(cellWidth)).repeat(daysOnTimeline) + '┐'
    //const footer = '└' + ('─').repeat(timeCellWidth) + ('┴' + ('─').repeat(cellWidth)).repeat(daysOnTimeline) + '┘'

    const renderedRows = renderRows(grid)
    renderedRows.unshift(header)
    renderedRows.unshift(daysLine)
    renderedRows.push(footer)

    return [ renderedRows.join('\n'), grid ]
}
