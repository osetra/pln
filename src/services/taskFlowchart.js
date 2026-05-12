/** @typedef {import('../dto/task.js').default} Task */

const MAX_SUMMARY = 30

/**
 * Подрезает summary и убирает символы, ломающие mermaid внутри "...".
 * @param {string} s
 * @returns {string}
 */
function escapeLabel(s) {
  const cut = (s || '').slice(0, MAX_SUMMARY) + (s?.length > MAX_SUMMARY ? '…' : '')
  return cut.replace(/["\n\r\\]/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Строит mermaid-flowchart для набора задач по связям DEPENDS-ON.
 * Узлы — все переданные задачи (изолированные тоже попадут). Рёбра —
 * для каждой пары (dep → task), если dep тоже в наборе.
 *
 * @param {Task[]} tasks - задачи текущего scope
 * @param {Object} [options]
 * @param {string}  [options.centerUid]            - выделить эту задачу маркером ⏿
 * @param {'LR'|'TB'} [options.direction='LR']     - направление графа
 * @param {boolean} [options.onlyConnected=false]  - оставить только связанные узлы
 * @returns {string} mermaid-код (graph LR ...)
 */
export function buildMermaid(tasks, {
  centerUid,
  direction = 'LR',
  onlyConnected = false,
} = {}) {
  const inScope = new Set(tasks.map(t => t.uid))

  const edges = []
  for (const t of tasks) {
    for (const depUid of (t.dependsOn || [])) {
      if (inScope.has(depUid)) edges.push([depUid, t.uid])
    }
  }

  let nodes = tasks
  if (onlyConnected) {
    const connected = new Set()
    for (const [a, b] of edges) { connected.add(a); connected.add(b) }
    nodes = tasks.filter(t => connected.has(t.uid))
  }

  const uid2id = new Map(nodes.map((t, i) => [t.uid, 'n' + i]))
  const lines = [`graph ${direction}`]
  for (const t of nodes) {
    const mark = centerUid && t.uid === centerUid ? '⏿ ' : ''
    lines.push(`  ${uid2id.get(t.uid)}["${mark}${escapeLabel(t.summary)}"]`)
  }
  for (const [from, to] of edges) {
    const fid = uid2id.get(from)
    const tid = uid2id.get(to)
    if (fid && tid) lines.push(`  ${fid} --> ${tid}`)
  }
  return lines.join('\n')
}
