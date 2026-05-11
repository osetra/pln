/**
 * Worker для загрузки задач через tasksService
 * Разгружает основной поток от CalDAV-запросов
 */
import { tasksService } from '@pln/core/services/tasks.js'

self.onmessage = async () => {
    try {
        const tasks = await tasksService.list()
        self.postMessage({ tasks })
    } catch (e) {
        self.postMessage({ error: e.message })
    }
}
