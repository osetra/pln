import createDg from '@izpodvypodverta/dg'

const testModules = import.meta.glob('./*.test.js', { eager: true })
const tests = Object.values(testModules).map(m => m.default)

const dg = createDg({ tests })
await dg.runTests()
