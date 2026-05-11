/**
 * Smoke-test: запускает 'node index.js -t test -L' дважды подряд и
 * замеряет время. Это самый тяжёлый сценарий (все уровни вложенности).
 *
 * Прогоняй: `node --test tests/test.js`
 *
 * Полезно как baseline до/после правок кеширования. Тест не проверяет
 * "стало быстрее" — для этого было бы нужно несколько прогонов и сеть
 * без шумов. Только: завершилось без ошибок, оба прогона.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const indexJs = path.join(repoRoot, 'index.js')

/**
 * Запускает cli, возвращает { ms, status, stderr } для assert и логов
 * @param {string[]} args
 */
function runCli(args) {
    const t0 = performance.now()
    const r = spawnSync('node', [indexJs, ...args], {
        cwd: repoRoot,
        encoding: 'utf8',
    })
    const ms = +(performance.now() - t0).toFixed(0)
    return { ms, status: r.status, stderr: r.stderr }
}

test('pln -t test -L: два последовательных запуска', () => {
    const args = ['-t', 'test', '-L']

    const first = runCli(args)
    console.log(`  1st run: ${first.ms} ms`)
    assert.equal(first.status, 0, `1-й запуск упал:\n${first.stderr}`)

    const second = runCli(args)
    console.log(`  2nd run: ${second.ms} ms`)
    assert.equal(second.status, 0, `2-й запуск упал:\n${second.stderr}`)
})
