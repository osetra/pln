import { cli } from './cli.js'

export const app = {
    start() {
        cli.handleInput(process.argv.slice(2))
    }
}

