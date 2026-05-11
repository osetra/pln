/**
 * Модуль для расчета времени сессий
 */

/**
 * Рассчитывает общее время сессий и активную сессию
 * @param {Array} sessionsData - данные сессий из customProperties.sessions
 * @returns {{totalHours: number, hasActiveSession: boolean}}
 */
export function calculateSessionTime(sessionsData) {
    if (!sessionsData || !Array.isArray(sessionsData)) {
        return { totalHours: 0, hasActiveSession: false }
    }

    let totalMs = 0
    let hasActiveSession = false

    console.debug('sessions data for calculation:', sessionsData)

    for (const sessionPair of sessionsData) {
        if (!Array.isArray(sessionPair)) continue
        
        const startStr = sessionPair[0]
        const endStr = sessionPair[1]
        
        console.debug(`Session calc: start="${startStr}", end="${endStr}"`)
        
        if (startStr) {
            const start = new Date(startStr)
            const end = endStr ? new Date(endStr) : null
            
            if (!isNaN(start.getTime())) {
                if (start && end) {
                    const duration = end.getTime() - start.getTime()
                    console.debug(`Session: ${start} -> ${end} = ${duration}ms`)
                    totalMs += duration
                } else if (start) {
                    const duration = new Date() - start.getTime()
                    console.debug(`Active session: ${start} -> ${new Date()} = ${duration}ms`)
                    totalMs += duration
                    hasActiveSession = true
                }
            }
        }
    }
    
    const totalHours = totalMs / (1000 * 60 * 60)
    console.debug(`Total: ${totalMs}ms = ${totalHours}h`)
    
    return {
        totalHours: Math.round(totalHours * 100) / 100,
        hasActiveSession
    }
}
