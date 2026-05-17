import { configRef } from './getConfigRef.js'

/** @typedef {import('../dto/task.js').default} Task */

/**
 * Разбирает значение CLI-флага --sort вида "<dir>:<by>" → {by, dir}.
 * Зачем: единая точка валидации, переиспользуется в list.js и tui.js.
 * @param {string|undefined} raw
 * @returns {{by:string, dir:'asc'|'desc'}|undefined}
 */
export function parseSortFlag(raw) {
  if (!raw) return undefined
  const [dir, by] = raw.split(':')
  if (!dir || !by) throw new Error(`--sort: ожидается формат "<dir>:<by>", получено "${raw}"`)
  return { by, dir }
}

/**
 * Стабильная сортировка задач для вывода в CLI/TUI/web.
 *
 * Дефолтный порядок (каждое следующее — тайбрейкер):
 *   1. Статус: CANCELLED → внизу, COMPLETED → ниже активных
 *   2. Категориальный уровень: liftTags → выше, dropTags → ниже (из конфига)
 *   3. Приоритет: 1 — высший, 0 — без приоритета, оба-без → пропустить
 *   4. Дедлайн (due): задачи с due выше задач без; раньше → выше
 *   5. Summary: localeCompare ru с numeric: true (понимает "1 ...", "10 ...")
 *
 * При `opts.by='created'` правила 3–5 заменяются на сортировку по `created`
 * (asc/desc), внутри COMPLETED тоже по `created` — единый ключ во всех группах.
 * Статус и категориальный уровень остаются как «жёсткие» группировки.
 *
 * Мутирует входной массив (как Array.prototype.sort) и возвращает его же.
 *
 * @param {Task[]} tasks
 * @param {{by?: 'created', dir?: 'asc'|'desc'}} [opts]
 * @returns {Task[]}
 */
export default function sortTasks(tasks, opts = {}) {
  const { by, dir = 'asc' } = opts
  if (by && by !== 'created') {
    throw new Error(`sortTasks: неизвестный ключ сортировки '${by}' (поддерживается: created)`)
  }
  if (by && dir !== 'asc' && dir !== 'desc') {
    throw new Error(`sortTasks: неизвестное направление '${dir}' (asc|desc)`)
  }
  const useCreated = by === 'created'
  const dirMul = dir === 'desc' ? -1 : 1

  const liftTags = new Set(configRef.value.sort?.liftTags || [])
  const dropTags = new Set(configRef.value.sort?.dropTags || [])

  /**
   * @param {Task} task
   * @returns {1|0|-1} уровень категории
   */
  const getCatLevel = task => {
    const cats = task.categories || []
    if (cats.some(c => liftTags.has(c))) return 1
    if (cats.some(c => dropTags.has(c))) return -1
    return 0
  }

  const collator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' })

  tasks.sort((a, b) => {
    // 1. Статусы
    if (a.status === 'CANCELLED' && b.status !== 'CANCELLED') return 1
    if (a.status !== 'CANCELLED' && b.status === 'CANCELLED') return -1
    if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') return 1
    if (a.status !== 'COMPLETED' && b.status === 'COMPLETED') return -1

    // 1a. Внутри COMPLETED — свежезавершённые выше (только в дефолтном режиме;
    //     при useCreated COMPLETED сортируется тем же ключом, что и активные).
    if (!useCreated && a.status === 'COMPLETED' && b.status === 'COMPLETED') {
      const aC = a.completed ? new Date(a.completed).getTime() : 0
      const bC = b.completed ? new Date(b.completed).getTime() : 0
      if (aC !== bC) return bC - aC
    }

    // 1b. Активная сессия (-was) — наверх среди активных, даже выше liftTags
    const aActive = !!a.customProperties?.hasActiveSession
    const bActive = !!b.customProperties?.hasActiveSession
    if (aActive !== bActive) return aActive ? -1 : 1

    // 2. Категориальный уровень
    const aLevel = getCatLevel(a)
    const bLevel = getCatLevel(b)
    if (aLevel !== bLevel) return bLevel - aLevel

    // 2a. Заблокированные (ждут предшественника) — вниз внутри уровня
    const aBlocked = !!a.customProperties?.isBlocked
    const bBlocked = !!b.customProperties?.isBlocked
    if (aBlocked !== bBlocked) return aBlocked ? 1 : -1

    if (useCreated) {
      const aC = a.created ? new Date(a.created).getTime() : 0
      const bC = b.created ? new Date(b.created).getTime() : 0
      if (aC !== bC) return (aC - bC) * dirMul
      return collator.compare(a.summary || '', b.summary || '')
    }

    // 3. Приоритет (внутри одного уровня)
    const aPrio = a.priority ?? 0
    const bPrio = b.priority ?? 0
    if (aPrio !== 0 || bPrio !== 0) {
      if (aPrio === 0) return 1
      if (bPrio === 0) return -1
      if (aPrio !== bPrio) return aPrio - bPrio
    }

    // 4. Дедлайн (due)
    const aDue = a.due ? new Date(a.due).getTime() : null
    const bDue = b.due ? new Date(b.due).getTime() : null
    if (aDue !== null && bDue === null) return -1
    if (aDue === null && bDue !== null) return 1
    if (aDue !== null && bDue !== null && aDue !== bDue) return aDue - bDue

    // 5. Summary
    return collator.compare(a.summary || '', b.summary || '')
  })

  return tasks
}
