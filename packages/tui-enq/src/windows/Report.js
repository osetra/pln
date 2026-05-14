import Enquirer from 'enquirer'
import { Window } from './Window/index.js'
import { state } from '../state.js'
import chalk from 'chalk'
import { NumberEditor } from './common/number-editor.js'

import { completedTasksService } from '@pln/core/services/completedTasks.js'

let viewMode = 'default'

/**
 * показывает задачи с суммарным временем сессий за указанные дни
 */
export default class Sessions extends Window {
    constructor() {
        super()
        
        this.daysBackCount = 2 // по умолчанию 2 дня

        this.keyHandlers = {
            'q': () => this.prompt?.cancel(),
            'й': () => this.prompt?.cancel(),
            
            '?': this.showHelp.bind(this),
            'd': this.changeDaysBack.bind(this),

            'j': this.down.bind(this),
            'о': this.down.bind(this),
            'k': this.up.bind(this),
            'л': this.up.bind(this),
        }

        this.open()
    }

    open() {
        const w = process.stdout.columns || 80;
        const line = '-'.repeat(w);

        console.clear();
        console.log(line);

        console.log(chalk.blue(`⌛ Дней назад: ${this.daysBackCount})`));
        console.log(line);

        // Получаем задачи с сессиями за последние N дней
        const tasksWithSessions = this.#getTasksWithSessions(this.daysBackCount);
        
        // Группируем по дням
        const groupedByDay = this.#groupTasksByDay(tasksWithSessions);
        
        if (viewMode === 'forCopy') {
            this.renderForCopy(groupedByDay)
        } else {
            this.renderDefault(groupedByDay, line)
        }

        this.prompt = new Enquirer.Select({
            name: 'action',
            message: 'Выберите действие:',
            choices: [
                { name: 'changeDays', message: 'Изменить дни отображения' },
                { name: 'changeViewMode', message: 'Изменить формат' },
                { name: 'quit', message: 'Выйти' }
            ]
        });

        this.prompt.run()
            .then(answer => {
                switch (answer) {
                    case 'changeDays':
                        this.changeDaysBack()
                        //this.open()
                        break
                    case 'changeViewMode':
                        viewMode = viewMode === 'default' ? 'forCopy' : 'default'
                        this.open()
                        break
                    case 'quit':
                        this.close()
                        break
                }
            })
            .catch((err) => {
                //console.log({err})
                this.close()
            })
    }

    /**
     * Получает задачи с сессиями за указанное количество дней
     * @param {number} daysBack - количество дней назад
     * @returns {Array} задачи с сессиями
     */
    #getTasksWithSessions(daysBack) {
        const now = new Date();
        const tasksWithSessions = [];
        
        state.tasks.forEach(task => {
            const sessions = this.#extractSessionsFromTask(task);
            
            if (sessions.length > 0) {
                // Фильтруем сессии по дате
                const recentSessions = sessions.filter(session => {
                    const sessionDate = this.#getSessionDate(session);
                    const daysDiff = Math.floor((now - sessionDate) / (1000 * 60 * 60 * 24));
                    return daysDiff < daysBack;
                });
                
                if (recentSessions.length > 0) {
                    const totalTime = this.#calculateTotalSessionTime(recentSessions);
                    tasksWithSessions.push({
                        ...task,
                        sessions: recentSessions,
                        totalTime: totalTime
                    });
                }
            }
        });
        
        return tasksWithSessions;
    }

    /**
     * Извлекает сессии из задачи
     * @param {Object} task - задача
     * @returns {Array} массив сессий
     */
    #extractSessionsFromTask(task) {
        // Проверяем customProperties.sessions
        if (task.customProperties?.sessions) {
            return task.customProperties.sessions;
        }
        
        // Если нет в customProperties, парсим из description
        if (task.description) {
            return this.#parseSessionsFromDescription(task.description);
        }
        
        return [];
    }

    /**
     * Парсит сессии из описания задачи
     * @param {string} description - описание задачи
     * @returns {Array} массив сессий
     */
    #parseSessionsFromDescription(description) {
        const yamlSeparator = '---';
        
        if (!description.startsWith(yamlSeparator)) {
            return [];
        }
        
        const yamlEndMatch = description.match(new RegExp(`\n${yamlSeparator}(?:\n|$)`));
        if (!yamlEndMatch) {
            return [];
        }
        
        const yamlContent = description.slice(yamlSeparator.length, yamlEndMatch.index).trim();
        const sessionsMatch = yamlContent.match(/sessions:\s*\n((?:\s*-\s*\[[^\]]*\](?:\s*,\s*\[[^\]]*\])*\s*\n)*)/);
        
        if (!sessionsMatch) {
            return [];
        }
        
        try {
            const sessionsLines = sessionsMatch[1].split('\n').filter(line => line.trim().startsWith('-'));
            return sessionsLines.map(line => {
                const match = line.match(/\[(.*?)\]/);
                if (match) {
                    const times = match[1].split(',').map(t => t.trim()).filter(t => t);
                    return times.map(time => {
                        // Преобразуем строку "2024-01-13 10:00" в Date
                        return new Date(time.replace(' ', 'T') + ':00');
                    });
                }
                return [];
            });
        } catch (error) {
            console.warn('Ошибка парсинга сессий:', error.message);
            return [];
        }
    }

    /**
     * Группирует задачи по дням с суммарным временем
     * @param {Array} tasks - задачи с сессиями
     * @returns {Object} сгруппированные по дням задачи
     */
    #groupTasksByDay(tasks) {
        const grouped = {};

        tasks.forEach(task => {
            task.sessions.forEach(session => {
                const sessionDate = this.#getSessionDate(session);
                const dayKey = this.#dayKeyFor(sessionDate);
                const dateStr = dayKey.split('|')[0];

                if (!grouped[dayKey]) {
                    grouped[dayKey] = { dateStr, tasks: [], totalTime: 0, completedTasks: [] };
                }

                const existingTask = grouped[dayKey].tasks.find(t => t.uid === task.uid);
                if (!existingTask) {
                    grouped[dayKey].tasks.push(task);
                }

                if (session.length === 2) {
                    const start = new Date(session[0]);
                    const end = new Date(session[1]);
                    const duration = (end - start) / (1000 * 60 * 60); // в часах
                    grouped[dayKey].totalTime += duration;
                }
            });
        });

        // Добавляем задачи, завершённые в окне daysBack, по дате завершения
        const completed = completedTasksService.completedInDays(state.tasks, this.daysBackCount);
        completed.forEach(task => {
            const completedDate = new Date(task.completed);
            const dayKey = this.#dayKeyFor(completedDate);
            const dateStr = dayKey.split('|')[0];

            if (!grouped[dayKey]) {
                grouped[dayKey] = { dateStr, tasks: [], totalTime: 0, completedTasks: [] };
            }
            if (!grouped[dayKey].completedTasks) grouped[dayKey].completedTasks = [];

            // не дублируем — если задача уже в session-блоке этого дня, пропускаем
            const alreadyInSessions = grouped[dayKey].tasks.find(t => t.uid === task.uid);
            const alreadyInCompleted = grouped[dayKey].completedTasks.find(t => t.uid === task.uid);
            if (!alreadyInSessions && !alreadyInCompleted) {
                grouped[dayKey].completedTasks.push(task);
            }
        });

        // Сортируем дни по дате (новые выше)
        const sortedEntries = Object.entries(grouped).sort(([dayKeyA], [dayKeyB]) => {
            const dateA = dayKeyA.split('|')[0];
            const dateB = dayKeyB.split('|')[0];
            return dateB.localeCompare(dateA);
        });

        return Object.fromEntries(sortedEntries);
    }

    /**
     * Формирует ключ дня "YYYY-MM-DD|пн, 12 мая" для группировки.
     * @param {Date} date
     * @returns {string}
     */
    #dayKeyFor(date) {
        // локальная YYYY-MM-DD, чтобы группировка совпадала с label
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        const label = date.toLocaleDateString('ru-RU', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        });
        return dateStr + '|' + label;
    }

    /**
     * Определяет дату сессии
     * @param {Array} session - сессия [start, end] или [start]
     * @returns {Date}
     */
    #getSessionDate(session) {
        const sessionTime = session[0] || new Date();
        return new Date(sessionTime);
    }

    /**
     * Вычисляет суммарное время сессий в часах
     * @param {Array} sessions - массив сессий
     * @returns {number} время в часах
     */
    #calculateTotalSessionTime(sessions) {
        let totalHours = 0;
        
        sessions.forEach(session => {
            if (session.length === 2) {
                const start = new Date(session[0]);
                const end = new Date(session[1]);
                const duration = (end - start) / (1000 * 60 * 60); // в часах
                totalHours += duration;
            }
        });
        
        return totalHours;
    }

    changeDaysBack() {
        new NumberEditor(this.daysBackCount, (newValue) => {
            this.daysBackCount = newValue
            this.open()
        })
    }

    renderDefault(groupedByDay, line) {
        if (Object.keys(groupedByDay).length === 0) {
            console.log(chalk.gray('🤷 Нет задач за указанный период'));
        } else {
            Object.entries(groupedByDay).forEach(([dayKey, dayData]) => {
                const totalDayTime = dayData.totalTime;
                const dayLabel = dayKey.split('|')[1] || dayKey;
                console.log(`\n📅 ${dayLabel} ${chalk.yellow(`(${totalDayTime.toFixed(1)}ч)`)}`);

                dayData.tasks.forEach(task => {
                    const timeStr = task.totalTime > 0
                        ? chalk.yellow(`(${task.totalTime.toFixed(1)}ч) `)
                        : ' ';
                    console.log(`    ${timeStr}${task.summary}`);
                });

                dayData.completedTasks
                    ?.slice()
                    .sort((a, b) => new Date(b.completed) - new Date(a.completed))
                    .forEach(task => {
                        const t = new Date(task.completed);
                        const time = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
                        console.log(`    ${chalk.green('✓')} ${chalk.gray(time)} ${chalk.gray(task.summary)}`);
                    });
            });
        }

        console.log(line);
    }

    renderForCopy(groupedByDay) {
        const dayEntries = Object.entries(groupedByDay);
        
        const daysWithDates = dayEntries.map(([dayKey, dayData], index) => {
            const [dateStr, dayLabel] = dayKey.split('|');
            const dayDate = new Date(dateStr);
            return { dayKey, dayLabel, dayData, dayDate, dateStr, index };
        });
        
        const oldestDay = daysWithDates[daysWithDates.length - 1];
        const newestDay = daysWithDates[0];
        
        daysWithDates.forEach(({ dayKey, dayLabel, dayData, dayDate, dateStr, index }) => {
            const totalDayTime = dayData.totalTime;
            const dayStr = dayDate.toLocaleDateString('ru-RU').replace(/\./g, '.');
            
            const prevDateStr = new Date(dayDate.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            const nextDateStr = new Date(dayDate.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            
            const hasPrev = dayDate.getTime() > oldestDay.dayDate.getTime();
            const hasNext = dayDate.getTime() < newestDay.dayDate.getTime();
            
            // Следующий хронологический день (index - 1, т.к. отсортировано: новые first)
            const nextDayData = daysWithDates.find(d => d.index === index - 1);
            
            console.log(`# Отчёт ? [[ubicomb]]`);
            
            if (hasPrev) {
                console.log(`[<- предыдущий](${prevDateStr})`);
            }
            if (hasNext) {
                console.log(`[следующий  ->](${nextDateStr})`);
            }
            
            console.log(`\nОтчёт #report`);
            console.log(`1) ${dayStr}`);
            console.log(`2) ${totalDayTime.toFixed(1)} ч`);
            console.log(`3) отчуждаемые результаты:`);
            console.log(`  - \`https://gitlab.com/mb-main/comfyui-recloth/-/commit/\``);
            console.log(`4) неотчуждаемые результаты:`);
            
            if (dayData.tasks.length === 0) {
                console.log(`  - `);
            } else {
                dayData.tasks.forEach(task => {
                    const hours = task.totalTime > 0 ? task.totalTime.toFixed(1) : '';
                    console.log(`  - (${hours}ч) ${task.summary}`);
                });
            }
            
            if (nextDayData) {
                const nextDayStr = nextDayData.dayDate.toLocaleDateString('ru-RU').replace(/\./g, '.');
                const nextTotalHours = nextDayData.dayData.totalTime.toFixed(1);
                console.log(`5) Планы ${nextDayStr}, ${nextTotalHours} ч`);
                nextDayData.dayData.tasks.forEach(task => {
                    const hours = task.totalTime > 0 ? task.totalTime.toFixed(1) : '';
                    console.log(`  - (${hours}ч) ${task.summary}`);
                });
            } else {
                console.log(`5) Планы`);
            }

            if (index < daysWithDates.length - 1) {
                console.log('\n---\n');
            }
        });
        
        console.log('\n' + '-'.repeat(process.stdout.columns || 80));
    }
}
