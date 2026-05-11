/**
 * Утилиты для интерактивного ввода в raw-mode терминале.
 * Зачем: редакторы полей (summary, status и т.п.) требуют временно выйти из
 * raw-mode или нарисовать мини-меню поверх основного списка.
 */
import readline from 'readline'
import chalk from 'chalk'

const CLEAR = '\x1b[H\x1b[2J'

let _savedKeypressListeners = []

/**
 * Снимает все keypress-слушатели stdin, сохраняя их для восстановления.
 * Зачем: предотвращает двойную обработку клавиш во вложенных меню.
 * @returns {void}
 */
export function suspendKeypress() {
  _savedKeypressListeners = process.stdin.listeners('keypress').slice()
  process.stdin.removeAllListeners('keypress')
}

/**
 * Восстанавливает сохранённые keypress-слушатели.
 * @returns {void}
 */
export function resumeKeypress() {
  for (const fn of _savedKeypressListeners) process.stdin.on('keypress', fn)
  _savedKeypressListeners = []
}

/**
 * Полная пауза stdin: снимает keypress-слушатели, отключает raw mode, ставит stdin на паузу.
 * Зачем: безопасная передача stdin внешнему редактору или readline.
 * @returns {void}
 */
export function suspendInput() {
  suspendKeypress()
  if (process.stdin.isTTY) process.stdin.setRawMode(false)
  process.stdin.pause()
}

/**
 * Восстанавливает stdin после suspendInput: возобновляет поток, включает raw mode и keypress.
 * @returns {void}
 */
export function resumeInput() {
  process.stdin.resume()
  if (process.stdin.isTTY) process.stdin.setRawMode(true)
  readline.emitKeypressEvents(process.stdin)
  resumeKeypress()
}

/**
 * Однострочный текстовый ввод (аналог enquirer Input).
 * Временно выключает raw mode и keypress, читает строку, восстанавливает.
 * @param {string} label - подсказка
 * @param {string} [initial] - начальное значение
 * @returns {Promise<string|null>} null если пользователь отменил (пустой ввод при initial)
 */
export async function promptText(label, initial = '') {
  suspendInput()
  process.stdout.write(CLEAR + chalk.cyan(label) + (initial ? chalk.dim(` [${initial}]`) : '') + '\n> ')

  return new Promise(resolve => {
    let resolved = false
    const done = (value) => {
      if (resolved) return
      resolved = true
      rl.close()
      resumeInput()
      resolve(value)
    }

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.once('line', answer => done(answer.trim() || initial || null))
    rl.once('close', () => done(null))
  })
}

/**
 * Однострочный числовой ввод.
 * @param {string} label
 * @param {number} [initial]
 * @returns {Promise<number|null>}
 */
export async function promptNumber(label, initial) {
  const str = await promptText(label, initial !== undefined ? String(initial) : '')
  const n = Number(str)
  return isNaN(n) ? null : n
}

/**
 * Мини-меню выбора одного варианта (j/k + Enter).
 * Снимает основной keypress-слушатель на время меню.
 * @param {string} label
 * @param {{ label: string, value: string }[]} choices
 * @param {string} [current] - текущее value для preselect
 * @returns {Promise<string|null>} выбранный value или null при отмене
 */
export function promptSelect(label, choices, current) {
  suspendKeypress()
  return new Promise(resolve => {
    let idx = Math.max(0, choices.findIndex(c => c.value === current))

    function draw() {
      const rows = choices.map((c, i) => {
        const line = `  ${c.label}`
        return i === idx ? chalk.inverse(line) : line
      })
      process.stdout.write([CLEAR, chalk.cyan(label), '', ...rows, '', chalk.dim('j/k: выбор · Enter/l: ОК · q/Esc: отмена')].join('\n'))
    }

    draw()

    function onKey(str, key) {
      if (!key) return
      const k = key.name
      if (k === 'j' || k === 'down')     { idx = Math.min(choices.length - 1, idx + 1); draw(); return }
      if (k === 'k' || k === 'up')       { idx = Math.max(0, idx - 1); draw(); return }
      if (k === 'return' || str === 'l') { cleanup(); resumeKeypress(); resolve(choices[idx].value); return }
      if (k === 'escape' || str === 'q') { cleanup(); resumeKeypress(); resolve(null); return }
    }

    function cleanup() { process.stdin.removeListener('keypress', onKey) }
    process.stdin.on('keypress', onKey)
  })
}

/**
 * Подтверждение (y/n).
 * Снимает основной keypress-слушатель на время диалога.
 * @param {string} label
 * @returns {Promise<boolean>}
 */
export function promptConfirm(label) {
  suspendKeypress()
  return new Promise(resolve => {
    process.stdout.write(CLEAR + chalk.yellow(label) + chalk.dim('  [y/n]\n'))

    function onKey(str) {
      if (str === 'y' || str === 'Y')                       { cleanup(); resumeKeypress(); resolve(true) }
      else if (str === 'n' || str === 'N' || str === 'q')   { cleanup(); resumeKeypress(); resolve(false) }
    }

    function cleanup() { process.stdin.removeListener('keypress', onKey) }
    process.stdin.on('keypress', onKey)
  })
}
