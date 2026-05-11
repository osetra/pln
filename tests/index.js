import createDg from '@izpodvypodverta/dg'
import { readdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function autoImportTests() {
  const files = await readdir(__dirname)
  const testFiles = files.filter(f => f.endsWith('.test.js'))

  if (testFiles.length < 1) {
    throw new Error('Маловато тестов с test в названии...')
  }

  const testsFromFolder = []
  for (const file of testFiles) {
    const modulePath = join(__dirname, file)
    const module = await import(modulePath)
    if (typeof module.default !== 'function') {
      throw new Error(`Файл ${file} не экспортирует default функцию`)
    }
    testsFromFolder.push(module.default)
  }

  return testsFromFolder
}

const tests = await autoImportTests()
const dg = createDg({ tests })
await dg.runTests()
console.log(dg.testResultsFormatted)
