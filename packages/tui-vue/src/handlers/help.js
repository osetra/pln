/**
 * Хэндлер экрана помощи.
 * Зачем: показывает список всех биндингов, ждёт любой клавиши и возвращается.
 * @module handlers/help
 */

import chalk from 'chalk'

import { suspendKeypress, resumeKeypress } from '../input.js'

/**
 * Формирует и выводит экран помощи, затем ждёт любой клавиши для возврата.
 * @param {ReturnType<import('../state.js').createState>} state
 * @param {() => void} render
 * @returns {Record<string, import('./filters.js').Handler>}
 */
export function createHelpHandlers(state, render) {
  return {
    /**
     * Показывает экран помощи с биндингами, возврат по любой клавише.
     */
    '?': () => {
      // снимаем основной keypress, чтобы клавиша возврата не ушла хэндлерам
      suspendKeypress()
      process.stdout.write('\x1b[2J\x1b[H')
      process.stdout.write('pln tui — клавиши\n\n')

      const section = (title) => process.stdout.write('  ' + chalk.dim(title) + '\n')
      const bind = (keys, desc) =>
        process.stdout.write('  ' + chalk.cyan(keys.padEnd(14)) + desc + '\n')

      section('НАВИГАЦИЯ')
      bind('j / k',         'вниз / вверх')
      bind('g / G',         'верх / низ')
      bind('u / Space',     'страница вверх / вниз')
      bind('q / Esc',       'выход')
      process.stdout.write('\n')

      section('ФИЛЬТРЫ')
      bind('x',             'скрыть выполненные/someday/cancel')
      bind('h',             'свернуть/развернуть подзадачи')
      bind('/',             'поиск по summary')
      bind('r',             'обновить с сервера')
      process.stdout.write('\n')

      section('РЕДАКТОРЫ')
      bind('t',             'изменить название (replace)')
      bind('A',             'добавить к названию (append)')
      bind('I',             'вставить в начало (insert)')
      bind('S',             'статус (NEEDS-ACTION/COMPLETED/CANCELLED)')
      bind('l',             'описание (внешний редактор)')
      bind('p',             'приоритет (0-9)')
      bind(';',             'дата выполнения')
      bind('c',             'категории')
      bind('P',             'родитель')
      process.stdout.write('\n')

      section('ЗАДАЧИ')
      bind('a',             'новая задача (тот же уровень)')
      bind('s',             'новая подзадача')
      bind('D',             'удалить')
      bind('v / V',         'выделить / сбросить выделение')
      bind('T',             'таймер сессии')
      bind('!',             'отчёт по сессиям')
      process.stdout.write('\n')

      process.stdout.write(chalk.dim('  [любая клавиша — вернуться]\n'))

      process.stdin.once('keypress', () => { resumeKeypress(); render() })
    },
  }
}
