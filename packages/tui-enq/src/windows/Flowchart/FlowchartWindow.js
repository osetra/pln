import Enquirer from 'enquirer'
import chalk from 'chalk'
import { renderMermaidASCII } from 'beautiful-mermaid'

import { Window } from '#tui/windows/Window/index.js'
import { state }  from '#tui/state.js'
import { buildMermaid } from '@pln/core/services/taskFlowchart.js'

/**
 * Окно: ASCII-flowchart по DEPENDS-ON для всех задач текущего scope
 * (state.tasks). Текущая задача выделяется маркером ⏿.
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

    const code = buildMermaid(state.tasks, {
      centerUid: state.currentTask?.uid,
      onlyConnected: true,
    })

    if (!code.includes('-->')) {
      console.log(chalk.gray('⊘ В этом scope нет связей DEPENDS-ON'))
    } else {
      try {
        console.log(renderMermaidASCII(code, { colorMode: 'none', boxBorderPadding: 0 }))
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
}
