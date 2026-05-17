import yaml from '@zkochan/js-yaml'
import { calculateSessionTime } from './session-calculator.js'

/** @typedef {import('../dto/task').default} Task */
/** @typedef {import('../dto/task').TaskAnalized} TaskAnalized */

export const analizator = {
    /**
     * @param {Task[]} tasks
     * @returns {TaskAnalized[]} tasksAnalized
     */
    analize(tasks) {
        const result = tasks.map(task => {
            const { yamlProps, cleanDescription } = this._parseYamlHeader(task.description)

            // присваиваем yamlProps, если есть (иначе оставляем существующие customProperties)
            task.customProperties = { ...(task.customProperties || {}), ...(yamlProps || {}) }

            const sessions = task.customProperties?.sessions
            if (sessions) {
                const { totalHours = 0, hasActiveSession } = calculateSessionTime(sessions)

                task.customProperties = { ...task.customProperties, hasActiveSession }
                task.customProperties.hours = Number((Number(yamlProps.hours) || 0) + totalHours).toFixed(1)
            }
            task.customProperties.cleanDescription = cleanDescription
            return task
        })

        // dependsOnStatuses + isBlocked: смотрим завершён ли каждый предшественник
        const statusByUid = new Map(result.map(t => [t.uid, t.status]))
        for (const t of result) {
            if (!t.dependsOn?.length) continue
            const statuses = {}
            let blocked = false
            for (const uid of t.dependsOn) {
                const s = statusByUid.get(uid) // undefined если не в выборке
                statuses[uid] = s
                if (s !== 'COMPLETED' && s !== 'CANCELLED') blocked = true
            }
            t.customProperties.dependsOnStatuses = statuses
            if (blocked) t.customProperties.isBlocked = true
        }

        return result
    },

    /**
     * Парсит YAML-заголовок из описания задачи
     * @param {string} description 
     * @returns {{ yamlProps: Object, cleanDescription: string }}
     */
    _parseYamlHeader(description) {
        const yamlSeparator = '---'
        const yamlEndRegex = new RegExp(`\n${yamlSeparator}(?:\n|$)`)
        
        if (!description.startsWith(yamlSeparator)) {
            return {
                yamlProps: {},
                cleanDescription: description
            }
        }
        
        const endMatch = description.match(yamlEndRegex)
        if (!endMatch) {
            return {
                yamlProps: {},
                cleanDescription: description
            }
        }
        
        const yamlEndIndex = endMatch.index + endMatch[0].length
        const yamlContent = description
            .slice(yamlSeparator.length, endMatch.index)
            .trim()
        
        try {
            const parsed = yaml.load(yamlContent) || {}
            return {
                yamlProps: parsed,
                cleanDescription: description.slice(yamlEndIndex).trim()
            }
        } catch (error) {
            console.warn('Ошибка парсинга YAML-заголовка:', {errorMessage: error.message, description: description.slice(yamlEndIndex).trim().split('\n').slice(0,3).join('')})
            return {
                yamlProps: {},
                cleanDescription: description
            }
        }
    },
}
