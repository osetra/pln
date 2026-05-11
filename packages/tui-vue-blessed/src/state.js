/**
 * Реактивное состояние TUI.
 * Зачем: единый источник правды для всех хэндлеров — cursor, задачи, фильтр, выделение.
 */
import { ref, computed } from '@vue/reactivity'

import { config } from '@pln/core/config.js'

/**
 * Собирает uid всех задач, у которых есть видимые дети — для стартового
 * полного collapse (флаг config.tuiCollapseSubtasks).
 * @param {object[]} tasks
 * @returns {Record<string, boolean>}
 */
function collectParentUids(tasks) {
  const uids = new Set(tasks.map(t => t.uid))
  const out = {}
  for (const t of tasks) {
    if (t.parent && uids.has(t.parent)) out[t.parent] = true
  }
  return out
}

/**
 * Плоское дерево задач (DFS). Записи помечаются `hiddenChildren`
 * — числом скрытых детей (0 если разворот или детей нет).
 * @param {object[]} tasks
 * @param {Record<string,boolean>} hidden - uid задач со скрытыми подзадачами
 * @returns {{ task: object, depth: number, hiddenChildren: number }[]}
 */
function buildFlatTree(tasks, hidden = {}) {
  const byUid = new Map(tasks.map(t => [t.uid, t]))
  const childrenOf = new Map()
  for (const t of tasks) {
    const parentUid = t.parent && byUid.has(t.parent) ? t.parent : null
    if (!childrenOf.has(parentUid)) childrenOf.set(parentUid, [])
    childrenOf.get(parentUid).push(t)
  }
  const result = []
  const walk = (task, depth) => {
    const kids = childrenOf.get(task.uid) || []
    const isCollapsed = !!hidden[task.uid] && kids.length > 0
    result.push({ task, depth, hiddenChildren: isCollapsed ? kids.length : 0 })
    if (!isCollapsed) for (const child of kids) walk(child, depth + 1)
  }
  for (const root of childrenOf.get(null) || []) walk(root, 0)
  return result
}

/**
 * Создаёт реактивное состояние TUI.
 * @param {object[]} initialTasks
 */
export function createState(initialTasks) {
  const rawTasks    = ref(initialTasks)
  const cursor      = ref(0)
  const hiddenSubs  = ref(config.tuiCollapseSubtasks ? collectParentUids(initialTasks) : {})
  const activeOnly  = ref(false)      // фильтр: только активные
  const selected    = ref([])         // выделенные задачи (uid[])

  const tasks = computed(() => {
    let list = rawTasks.value
    if (activeOnly.value) {
      list = list.filter(t =>
        t.status === 'NEEDS-ACTION' &&
        !t.categories?.includes('someday') &&
        !t.categories?.includes('cancel')
      )
    }
    return list
  })

  const flatTree    = computed(() => buildFlatTree(tasks.value, hiddenSubs.value))
  const maxIdx      = computed(() => Math.max(0, flatTree.value.length - 1))
  const currentTask = computed(() => flatTree.value[cursor.value]?.task || null)

  return { rawTasks, cursor, hiddenSubs, activeOnly, selected, tasks, flatTree, maxIdx, currentTask }
}
