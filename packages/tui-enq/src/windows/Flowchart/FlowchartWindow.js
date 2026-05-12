import Enquirer from 'enquirer'
import chalk from 'chalk'
import { renderMermaidASCII } from 'beautiful-mermaid'

import { Window } from '#tui/windows/Window/index.js'
import { state }  from '#tui/state.js'

const MAX_SUMMARY = 30

/**
 * Окно: ASCII flowchart цепочки задач по DEPENDS-ON вокруг текущей задачи.
 * Вверх: задачи, от которых зависит текущая (предшественники, рекурсивно).
 * Вниз: задачи, которые зависят от текущей (потомки, рекурсивно).
 */
export default class FlowchartWindow extends Window {
  constructor() {
    super()
    this.keyHandlers = {
      'q': () => this.prompt?.cancel(),
      'й': () => this.prompt?.cancel(),
      '?': this.showHelp.bind(this),
    }
    this.open()
  }

  open() {
    console.clear()

    if (!state.currentTask) { this.close(); return }

    const { nodes, edges } = this.#collectChain(state.currentTask)

    if (edges.length === 0) {
      console.log(chalk.gray('⊘ У задачи нет предшественников и потомков'))
    } else {
      const code = this.#buildMermaid(nodes, edges, state.currentTask.uid)
      try {
        console.log(renderMermaidASCII(code, { colorMode: 'none' }))
      } catch (err) {
        console.log(chalk.red('Не удалось отрендерить:\n') + err.message)
        console.log(chalk.gray('\nИсходник:\n') + code)
      }
    }

    this.prompt = new Enquirer.Select({
      name: 'action',
      message: 'q — закрыть',
      choices: [{ name: 'close', message: 'Закрыть' }],
    })

    this.prompt.run().catch(() => {}).finally(() => this.close())
  }

  /**
   * Собирает уникальные узлы и рёбра вокруг центральной задачи (рекурсивно
   * вверх по dependsOn и вниз — кто на неё ссылается).
   * @param {Object} center
   * @returns {{ nodes: Object[], edges: [string, string][] }}
   */
  #collectChain(center) {
    const byUid = new Map(state.tasks.map(t => [t.uid, t]))
    const nodes = new Map()
    const edges = []
    const visited = new Set()

    const walk = (task) => {
      if (!task || visited.has(task.uid)) return
      visited.add(task.uid)
      nodes.set(task.uid, task)

      for (const depUid of (task.dependsOn || [])) {
        const dep = byUid.get(depUid)
        if (dep) {
          edges.push([dep.uid, task.uid])
          nodes.set(dep.uid, dep)
          walk(dep)
        }
      }
      for (const t of state.tasks) {
        if (t.dependsOn?.includes(task.uid)) {
          edges.push([task.uid, t.uid])
          nodes.set(t.uid, t)
          walk(t)
        }
      }
    }

    walk(center)
    return { nodes: [...nodes.values()], edges }
  }

  /**
   * Строит mermaid-код графа.
   * @param {Object[]} nodes
   * @param {[string,string][]} edges
   * @param {string} centerUid - текущая задача (выделяется ⏿)
   * @returns {string}
   */
  #buildMermaid(nodes, edges, centerUid) {
    const uid2id = new Map(nodes.map((t, i) => [t.uid, 'n' + i]))
    const lines = ['graph LR']
    for (const t of nodes) {
      const mark = t.uid === centerUid ? '⏿ ' : ''
      lines.push(`  ${uid2id.get(t.uid)}["${mark}${this.#escape(t.summary)}"]`)
    }
    for (const [from, to] of edges) {
      lines.push(`  ${uid2id.get(from)} --> ${uid2id.get(to)}`)
    }
    return lines.join('\n')
  }

  /**
   * Подрезает summary и убирает символы, ломающие mermaid внутри "...".
   * @param {string} s
   * @returns {string}
   */
  #escape(s) {
    const trimmed = (s || '').slice(0, MAX_SUMMARY) + (s?.length > MAX_SUMMARY ? '…' : '')
    return trimmed.replace(/["\n\r\\]/g, ' ').replace(/\s+/g, ' ').trim()
  }
}
