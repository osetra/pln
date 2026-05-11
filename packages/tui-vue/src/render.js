/**
 * Рендер-функция TUI: строит кадр и пишет в stdout.
 * Зачем: изолирует отрисовку от логики, легко мокается в тестах.
 */
import chalk from 'chalk'

import { config } from '@pln/core/config.js'

const CLEAR = '\x1b[H\x1b[2J'
const FOOTER_LINES = 5
const HEADER_LINES = 2
const RIGHT_PANEL_MIN_COLS = 70
const RIGHT_PANEL_RATIO    = 0.6      // доля левой колонки
const ANSI_RE = /\x1b\[[0-9;]*m/g

/**
 * Видимая длина строки (без ANSI escape-кодов).
 * @param {string} s
 * @returns {number}
 */
function visLen(s) { return s.replace(ANSI_RE, '').length }

/**
 * Дополняет строку пробелами до видимой ширины.
 * @param {string} s
 * @param {number} width
 * @returns {string}
 */
function padVis(s, width) {
  const n = visLen(s)
  return n >= width ? s : s + ' '.repeat(width - n)
}

/**
 * Soft-wrap текста по ширине (без word-break — режет посимвольно).
 * @param {string} text
 * @param {number} width
 * @returns {string[]}
 */
function wrapText(text, width) {
  if (width <= 0) return []
  const out = []
  for (const para of text.split('\n')) {
    if (para.length === 0) { out.push(''); continue }
    let s = para
    while (s.length > width) { out.push(s.slice(0, width)); s = s.slice(width) }
    out.push(s)
  }
  return out
}

/**
 * @param {string} status
 * @returns {string}
 */
function statusChar(status) {
  const icons = config.taskStatusIcons
  if (status === 'COMPLETED')  return chalk.green(icons['COMPLETED'])
  if (status === 'IN-PROCESS') return chalk.yellow(icons['IN-PROGRESS'])
  return icons['NEEDS-ACTION']
}

/**
 * Форматирует due date задачи с цветом по срочности.
 * @param {string|undefined} due
 * @returns {string}
 */
function formatDue(due) {
  if (!due) return ''
  const date = new Date(due)
  if (isNaN(date.getTime())) return ''
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDay = new Date(date)
  dueDay.setHours(0, 0, 0, 0)
  const dateStr = date.toLocaleDateString('ru-RU', { month: '2-digit', day: '2-digit' })
  if (dueDay < today) return chalk.red(` ${dateStr}`)
  if (dueDay.getTime() === today.getTime()) return chalk.yellow(` ${dateStr}`)
  return chalk.dim(` ${dateStr}`)
}

/**
 * Возвращает маркер приоритета задачи.
 * @param {number|undefined} priority
 * @returns {string}
 */
function priorityMark(priority) {
  if (!priority || priority <= 0) return ''
  if (priority === 1) return chalk.red('!') + ' '
  if (priority <= 4) return chalk.yellow('!') + ' '
  return chalk.dim('!') + ' '
}

/**
 * Обрезает строку с ANSI до видимой ширины (с многоточием при усечении).
 * @param {string} line
 * @param {number} maxLen
 * @returns {string}
 */
function truncAnsi(line, maxLen) {
  if (visLen(line) <= maxLen) return line
  const cutAt = maxLen - 1
  let pos = 0, rawPos = 0
  while (rawPos < line.length) {
    if (line[rawPos] === '\x1b') {
      const m = line.slice(rawPos).match(/^\x1b\[[0-9;]*m/)
      if (m) { rawPos += m[0].length; continue }
    }
    if (pos >= cutAt) break
    pos++; rawPos++
  }
  return line.slice(0, rawPos) + '…'
}

/**
 * Строка задачи для списка.
 * @param {object} task
 * @param {number} depth
 * @param {boolean} isSelected
 * @param {number} hiddenChildren - число скрытых детей (0 если разворот)
 * @param {number} maxLen - максимальная видимая ширина строки
 * @returns {string}
 */
function taskLine(task, depth, isSelected, hiddenChildren, maxLen) {
  const indent   = '  '.repeat(depth)
  const s        = statusChar(task.status)
  const uid      = chalk.dim(task.shortUid || String(task.uid || '').slice(-4))
  const cats     = task.categories?.length ? chalk.dim(' #' + task.categories.join(' #')) : ''
  const pMark    = priorityMark(task.priority)
  const dueStr   = formatDue(task.due)
  const collapsed = hiddenChildren > 0 ? chalk.dim(` ▸${hiddenChildren}`) : ''
  const rawText  = (task.treeLine || `${pMark}${task.summary || ''}${dueStr}${cats}`) + collapsed
  const summary  = task.status === 'COMPLETED' ? chalk.dim(rawText) : rawText
  const marker   = isSelected ? chalk.yellow('● ') : '  '
  return truncAnsi(`${indent}${marker}${s} ${uid} ${summary}`, maxLen)
}

/**
 * Рисует кадр в stdout.
 * @param {object} state - реактивное состояние из createState()
 */
export function renderFrame(state) {
  const { flatTree, cursor, currentTask, tasks, selected, activeOnly } = state
  const termH = process.stdout.rows || 24
  const termW = process.stdout.columns || 80

  const useRightPanel = termW >= RIGHT_PANEL_MIN_COLS
  const leftWidth  = useRightPanel ? Math.floor(termW * RIGHT_PANEL_RATIO) - 1 : termW - 2
  const rightWidth = useRightPanel ? termW - leftWidth - 3 : 0  // ' │ '

  const visibleCount = Math.max(
    3,
    termH - HEADER_LINES - 2 - (useRightPanel ? 0 : FOOTER_LINES)
  )
  const half  = Math.floor(visibleCount / 2)
  let start   = cursor.value - half
  if (start < 0) start = 0
  if (start + visibleCount > flatTree.value.length) start = Math.max(0, flatTree.value.length - visibleCount)

  const total  = flatTree.value.length
  const done   = tasks.value.filter(t => t.status === 'COMPLETED').length
  const filter = activeOnly.value ? chalk.yellow(' [активные]') : ''
  const selStr = selected.value.length ? chalk.cyan(` sel:${selected.value.length}`) : ''
  const pos    = chalk.dim(`[${cursor.value + 1}/${total}]`)
  const header = chalk.cyan.bold(`pln tui │ ${done}/${total} │ ${pos}${filter}${selStr} │ j/k nav · x фильтр · ? помощь · q выход`)

  const slice = flatTree.value.slice(start, start + visibleCount)
  const rows = slice.map(({ task, depth, hiddenChildren }, i) => {
    const absIdx    = start + i
    const isCursor  = absIdx === cursor.value
    const isSelected = selected.value.includes(task.uid)
    const line      = taskLine(task, depth, isSelected, hiddenChildren || 0, leftWidth)
    return isCursor ? chalk.inverse(line) : line
  })

  const desc = currentTask.value?.customProperties?.cleanDescription || ''

  if (!useRightPanel) {
    const footerText = chalk.dim(desc.split('\n').slice(0, FOOTER_LINES).join('\n') || ' ')
    process.stdout.write([CLEAR, header, '', ...rows, '', footerText].join('\n'))
    return
  }

  const descLines = wrapText(desc, rightWidth).slice(0, visibleCount)
  const sep = chalk.dim('│')
  const composed = []
  for (let i = 0; i < visibleCount; i++) {
    const left  = padVis(rows[i] || '', leftWidth)
    const right = chalk.dim(descLines[i] || '')
    composed.push(`${left} ${sep} ${right}`)
  }
  process.stdout.write([CLEAR, header, '', ...composed].join('\n'))
}
