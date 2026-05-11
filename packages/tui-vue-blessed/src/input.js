/**
 * Обёртки над blessed-виджетами для интерактивных промптов.
 * Зачем: хэндлеры вызывают promptText/Number/Select/Confirm не зная про blessed —
 * это позволяет переиспользовать логику редакторов из @pln/tui-vue.
 */
import blessed from 'neo-blessed'

/**
 * Однострочный текстовый ввод поверх screen.
 * Лочит глобальные screen.on('key …') обработчики на время ввода.
 * @param {object} screen - blessed.screen
 * @param {string} label - подсказка
 * @param {string} [initial] - начальное значение
 * @returns {Promise<string|null>} строка или null если отмена
 */
export function promptText(screen, label, initial = '') {
  return new Promise(resolve => {
    const p = blessed.prompt({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 'half',
      height: 'shrink',
      border: 'line',
      label: ` ${label} `,
      tags: true,
      keys: true,
      mouse: false,
    })
    const prevGrab = screen.grabKeys
    screen.grabKeys = true
    p.input(label, initial, (err, value) => {
      p.destroy()
      screen.grabKeys = prevGrab
      screen.render()
      if (err || value === undefined || value === null) { resolve(null); return }
      const trimmed = String(value).trim()
      resolve(trimmed === '' ? (initial || null) : trimmed)
    })
  })
}

/**
 * Однострочный числовой ввод (parseFloat от promptText).
 * @param {object} screen
 * @param {string} label
 * @param {number} [initial]
 * @returns {Promise<number|null>} число или null
 */
export async function promptNumber(screen, label, initial) {
  const s = await promptText(screen, label, initial != null ? String(initial) : '')
  if (s == null) return null
  const n = Number(s)
  return Number.isNaN(n) ? null : n
}

/**
 * Модальный список выбора. Использует встроенные events list:
 *  - 'select' (Enter / l) — выбор;
 *  - 'cancel' (Esc / q)   — отмена.
 * Глобальные screen-key подписки лочатся через screen.lockKeys на время промпта.
 * @param {object} screen
 * @param {string} label
 * @param {{ label: string, value: any }[]} choices
 * @param {*} [current] - текущее value для preselect
 * @returns {Promise<any|null>} выбранное value или null
 */
export function promptSelect(screen, label, choices, current) {
  return new Promise(resolve => {
    const idx = Math.max(0, choices.findIndex(c => c.value === current))
    const maxH = Math.max(8, (screen.height || 24) - 4)
    const height = Math.min(choices.length + 4, maxH)
    const list = blessed.list({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 'half',
      height,
      border: 'line',
      label: ` ${label} `,
      items: choices.map(c => c.label),
      keys: true,
      vi: true,
      mouse: false,
      scrollable: true,
      tags: false,
      style: {
        selected: { bg: 'blue', fg: 'white' },
        border: { fg: 'cyan' },
      },
    })

    list.select(idx)
    const prevGrab = screen.grabKeys
    screen.grabKeys = true
    screen.saveFocus()
    list.focus()
    screen.render()

    /**
     * Закрыть список, восстановить фокус и lockKeys.
     * @param {*} value
     */
    function close(value) {
      list.destroy()
      screen.restoreFocus()
      screen.grabKeys = prevGrab
      screen.render()
      resolve(value)
    }

    list.once('select', (_item, i) => close(choices[i]?.value ?? null))
    list.once('cancel', () => close(null))
  })
}

/**
 * Подтверждение y/n через blessed.question.
 * @param {object} screen
 * @param {string} label
 * @returns {Promise<boolean>} true для y/Enter, false для n/Esc/Cancel
 */
export function promptConfirm(screen, label) {
  return new Promise(resolve => {
    const q = blessed.question({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 'half',
      height: 'shrink',
      border: 'line',
      keys: true,
      mouse: false,
      style: { border: { fg: 'yellow' } },
    })
    const prevGrab = screen.grabKeys
    screen.grabKeys = true
    q.ask(label + ' (y/n)', (err, ok) => {
      q.destroy()
      screen.grabKeys = prevGrab
      screen.render()
      resolve(!!ok)
    })
  })
}
