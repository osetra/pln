/**
 * Платформенный адаптер: fs, path, os
 * В Node.js — нативные модули
 * В браузере/Worker — эмуляция через in-memory Map
 */

const isNode = typeof process !== 'undefined' && !!process.versions?.node

let fs, path, os

if (!isNode) {
    const store = new Map()

    fs = {
        existsSync(filePath) {
            return store.has(filePath)
        },
        readFileSync(filePath) {
            return store.get(filePath) || ''
        },
        writeFileSync(filePath, data) {
            store.set(filePath, data)
        },
        unlinkSync(filePath) {
            store.delete(filePath)
        },
    }

    path = {
        join(...parts) {
            return parts.filter(Boolean).join('/')
        },
    }

    os = {
        tmpdir() { return '' },
        homedir() { return '' },
    }
} else {
    const fsModule = await import('fs')
    const pathModule = await import('path')
    const osModule = await import('os')
    fs = fsModule.default
    path = pathModule.default
    os = osModule.default
}

export { fs, path, os }
