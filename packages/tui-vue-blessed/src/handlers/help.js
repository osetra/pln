/**
 * Хэндлер экрана помощи: модальный blessed.box со списком биндингов.
 * Зачем: ? — оверлей со всеми клавишами, закрывается любой клавишей.
 * @module handlers/help
 */
import blessed from 'neo-blessed'

/**
 * @typedef {(str?: string, key?: object) => void | Promise<void>} Handler
 */

const HELP_TEXT = [
  '{bold}НАВИГАЦИЯ{/}',
  '  j / k         вниз / вверх',
  '  g / G         верх / низ',
  '  u / Space     страница вверх / вниз',
  '  q / Esc       выход',
  '',
  '{bold}ФИЛЬТРЫ{/}',
  '  x             скрыть выполненные/someday/cancel',
  '  h             свернуть/развернуть подзадачи',
  '  /             поиск по summary',
  '  r             обновить с сервера',
  '',
  '{bold}РЕДАКТОРЫ{/}',
  '  t             изменить название (replace)',
  '  A             добавить к названию (append)',
  '  I             вставить в начало (insert)',
  '  S             статус (NEEDS-ACTION/COMPLETED/CANCELLED)',
  '  l             описание (внешний редактор)',
  '  p             приоритет (0-9)',
  '  ;             дата выполнения',
  '  c             категории',
  '  P             родитель',
  '',
  '{bold}ЗАДАЧИ{/}',
  '  a             новая задача (тот же уровень)',
  '  s             новая подзадача',
  '  D             удалить',
  '  v / V         выделить / сбросить выделение',
  '  T             таймер сессии',
  '  !             отчёт по сессиям',
  '  Enter / e     toggle COMPLETED',
  '',
  '{gray-fg}(любая клавиша — закрыть){/}',
].join('\n')

/**
 * Возвращает map ключ → обработчик блока "помощь".
 * @param {ReturnType<import('../state.js').createState>} state
 * @param {() => void} render
 * @param {object} screen - blessed.screen
 * @returns {Record<string, Handler>}
 */
export function createHelpHandlers(state, render, screen) {
  return {
    /** Показывает оверлей с биндингами, закрывается любой клавишей. */
    '?': () => {
      const box = blessed.box({
        parent: screen,
        top: 'center',
        left: 'center',
        width: '70%',
        height: '90%',
        border: 'line',
        label: ' help ',
        tags: true,
        scrollable: true,
        alwaysScroll: true,
        keys: true,
        mouse: false,
        content: HELP_TEXT,
        style: { border: { fg: 'cyan' } },
      })

      const prevGrab = screen.grabKeys
      screen.grabKeys = true
      screen.saveFocus()
      box.focus()
      box.once('keypress', () => {
        box.destroy()
        screen.grabKeys = prevGrab
        screen.restoreFocus()
        screen.render()
      })
      screen.render()
    },
  }
}
