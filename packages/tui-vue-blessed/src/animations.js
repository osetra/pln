/**
 * Лёгкие UI-анимации поверх blessed.screen.
 * Зачем: ненавязчивые подсказки об успехе/прогрессе действий.
 */
import blessed from 'neo-blessed'

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

let _activeToast = null

/**
 * Короткое уведомление в углу. Старый toast тут же уничтожается.
 * @param {object} screen - blessed.screen
 * @param {string} message
 * @param {object} [opts]
 * @param {number} [opts.ms=1500] - длительность показа
 * @param {string} [opts.color='green'] - цвет рамки/текста
 * @returns {void}
 */
export function toast(screen, message, opts = {}) {
  const { ms = 1500, color = 'green' } = opts
  if (_activeToast) { _activeToast.destroy(); _activeToast = null }

  const text = ` ${message} `
  const box = blessed.box({
    parent: screen,
    top: 2, right: 4,
    width: Math.min(text.length + 2, 50),
    height: 3,
    border: 'line',
    tags: true,
    content: text,
    shadow: true,
    style: { fg: color, border: { fg: color }, bg: 'black' },
  })
  box.setFront()
  _activeToast = box
  screen.render()

  setTimeout(() => {
    if (_activeToast === box) {
      box.destroy()
      _activeToast = null
      screen.render()
    }
  }, ms)
}

/**
 * Стартует крутилку. Возвращает функцию остановки.
 * @param {object} screen - blessed.screen
 * @param {string} [label='Загрузка']
 * @returns {() => void} stopFn
 */
export function startSpinner(screen, label = 'Загрузка') {
  let i = 0
  const box = blessed.box({
    parent: screen,
    top: 2, right: 4,
    width: label.length + 6,
    height: 3,
    border: 'line',
    tags: true,
    shadow: true,
    style: { fg: 'cyan', border: { fg: 'cyan' }, bg: 'black' },
  })
  box.setFront()
  const update = () => {
    box.setContent(` {cyan-fg}${SPINNER_FRAMES[i]}{/} ${label} `)
    screen.render()
    i = (i + 1) % SPINNER_FRAMES.length
  }
  update()
  const id = setInterval(update, 80)
  return () => {
    clearInterval(id)
    box.destroy()
    screen.render()
  }
}

/**
 * Pulse-уведомление о прыжке курсора (используется в /-поиске).
 * Дешёвая «подсветка» через короткий toast с другим цветом.
 * @param {object} screen
 * @param {string} summary
 * @returns {void}
 */
export function pulseFound(screen, summary) {
  const trimmed = summary.length > 30 ? summary.slice(0, 30) + '…' : summary
  toast(screen, `→ ${trimmed}`, { ms: 1800, color: 'magenta' })
}
