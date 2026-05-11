import Metric from '../dto/metric.js'
import { configRef } from './getConfigRef.js'

/** @typedef {import('../dto/task.js').default} Task */

/**
 * Сервис агрегатной аналитики по списку задач.
 * Зачем: единый источник метрик (total, статусы, ∑ часы, ∑ ₫, # тегов)
 *   для CLI/TUI/web — чтобы шапка списка всюду показывала то же самое.
 *
 * @param {Task[]} tasks
 * @returns {Metric[]}
 */
export default function analizeTasks(tasks) {
  return [
    new Metric('⤓', 'total', tasks.length),
    ...statusMetrics(tasks),
    sumByField(tasks, 'dong',  '∑ ₫', 'amount_d_sum'),
    sumByFieldHours(tasks),
    ...tagMetrics(tasks),
  ].filter(Boolean)
}

/**
 * Метрики по каждому статусу: иконка из config.taskStatusIcons + count.
 * @param {Task[]} tasks
 * @returns {Metric[]}
 */
function statusMetrics(tasks) {
  const counts = tasks.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1
    return acc
  }, {})
  const labels = configRef.value.taskStatusIcons || {}
  return Object.entries(counts).map(([status, count]) =>
    new Metric(labels[status], `status_${status.toLowerCase()}`, count)
  )
}

/**
 * Сумма числового поля customProperties[field], только если есть валидные значения.
 * @param {Task[]} tasks
 * @param {string} field
 * @param {string} label
 * @param {string} name
 * @returns {Metric|null}
 */
function sumByField(tasks, field, label, name) {
  let sum = 0, hasAny = false
  for (const t of tasks) {
    const v = parseNumber(t.customProperties?.[field])
    if (!isNaN(v)) { sum += v; hasAny = true }
  }
  return hasAny ? new Metric(label, name, sum) : null
}

/**
 * Сумма часов с одной десятичной.
 * @param {Task[]} tasks
 * @returns {Metric|null}
 */
function sumByFieldHours(tasks) {
  const m = sumByField(tasks, 'hours', '∑ h', 'amount_hours')
  return m ? new Metric(m.label, m.name, m.value.toFixed(1)) : null
}

/**
 * По одной метрике на каждый тег: `#name count`. Сортировка по убыванию count.
 * @param {Task[]} tasks
 * @returns {Metric[]}
 */
function tagMetrics(tasks) {
  const counts = new Map()
  for (const t of tasks) {
    const cats = Array.isArray(t.categories) ? t.categories : []
    for (const c of cats) counts.set(c, (counts.get(c) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => new Metric(`#${name}`, `tag_${name}`, count))
}

/**
 * Парсит число с возможными запятыми/пробелами как разделителями.
 * @param {string|number} value
 * @returns {number}
 */
function parseNumber(value) {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return NaN
  return parseFloat(value.replace(/[, ]/g, ''))
}
