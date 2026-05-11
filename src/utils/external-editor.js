import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'

export const externalEditor = {
    /**
     * Открывает файл во внешнем редакторе
     * @param {string} filePath - Путь к файлу
     * @returns {Promise<void>}
     */
    openFileInEditor(filePath) {
        return new Promise((resolve, reject) => {
            const platform = os.platform()
            let cmd, args

            if (process.env.EDITOR) {
                cmd = process.env.EDITOR
                args = [filePath]
            } else if (platform === 'darwin') {
                cmd = 'open'
                args = [filePath]
            } else if (platform === 'win32') {
                cmd = 'cmd'
                args = ['/c', 'start', '', filePath]
            } else {
                cmd = 'xdg-open'
                args = [filePath]
            }

            const child = spawn(cmd, args, { stdio: 'inherit', shell: false })
            child.on('error', reject)
            child.on('exit', (code) => {
                if (code === 0) resolve()
                else reject(new Error(`Редактор завершился с кодом ${code}`))
            })
        })
    },

    /**
     * Открывает текст во внешнем редакторе и возвращает изменённый текст
     * @param {string} initialText - Исходный текст
     * @param {string} [filenamePrefix='pln-edit-'] - префикс имени временно сохраняемого файла для редактирования
     * @returns {Promise<string>} Изменённый текст
     */
    async openTextInEditor(initialText = '', filenamePrefix = 'pln-edit-') {
        // Создаём временный файл
        const tempDir = os.tmpdir()
        const tempFilePath = path.join(tempDir, filenamePrefix + ' - ' + Date.now() + '.md')
        //const tempFilePath = path.join(tempDir, filenamePrefix + Date.now() + '.md')
        fs.writeFileSync(tempFilePath, initialText, 'utf8')

        try {
            // Открываем файл в редакторе
            await this.openFileInEditor(tempFilePath)
            
            // Читаем изменённый текст
            return fs.readFileSync(tempFilePath, 'utf8')
        } finally {
            // Удаляем временный файл
            try {
                fs.unlinkSync(tempFilePath)
            } catch (err) {
                console.error('Не удалось удалить временный файл', err)
            }
        }
    }
}
