/** @typedef {import('../dto/task.js').default} Task */

/**
 * Находит «следующую к выполнению» задачу в выборке — первый лист в DFS
 * pre-order по уже отсортированному дереву (порядок такой же, как у treeify).
 * Зачем: подсветить в CLI/TUI задачу, за которую логично взяться сейчас.
 *
 * Лист = задача, у которой нет потомков среди переданных tasks.
 *
 * @param {Task[]} tasks - уже отсортированный массив (через sortTasks)
 * @returns {Task|null}
 */
export default function findNextTask(tasks) {
  const allUids = new Set(tasks.map(t => t.uid))
  const childrenMap = new Map()
  const roots = []
  for (const t of tasks) {
    const parentUid = t.parent?.value || t.parent
    if (parentUid && allUids.has(parentUid)) {
      if (!childrenMap.has(parentUid)) childrenMap.set(parentUid, [])
      childrenMap.get(parentUid).push(t)
    } else {
      roots.push(t)
    }
  }
  return dfsFirstLeaf(roots, childrenMap)
}

/**
 * Рекурсивный DFS pre-order: возвращает первый лист, либо null.
 * @param {Task[]} nodes
 * @param {Map<string, Task[]>} childrenMap
 * @returns {Task|null}
 */
function dfsFirstLeaf(nodes, childrenMap) {
  for (const node of nodes) {
    const children = childrenMap.get(node.uid)
    if (!children || children.length === 0) return node
    const found = dfsFirstLeaf(children, childrenMap)
    if (found) return found
  }
  return null
}
