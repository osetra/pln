/**
 * Прототип TaskPicker на ink.
 * Зачем: дерево задач с навигацией j/k/стрелки и выходом по q.
 * Используется как замена enquirer-варианту для визуальной оценки ink.
 *
 * JSX не используется — только React.createElement, чтобы файл работал
 * под нативным ESM-Node без babel/loader-ов.
 */
import React, { useState, useMemo } from 'react'
import { Box, Text, useInput, useApp } from 'ink'

const e = React.createElement

/**
 * Построить плоский список задач в порядке обхода дерева (DFS).
 * Зачем: в ink проще итерировать по плоскому массиву строк с уровнем отступа.
 * @param {import('../../dto/task.js').default[]} tasks - все задачи
 * @returns {{ task: object, depth: number }[]}
 */
function buildTree(tasks) {
    const byUid = new Map(tasks.map(t => [t.uid, t]))
    const childrenByParent = new Map()
    for (const task of tasks) {
        const parentKey = task.parent && byUid.has(task.parent) ? task.parent : null
        if (!childrenByParent.has(parentKey)) childrenByParent.set(parentKey, [])
        childrenByParent.get(parentKey).push(task)
    }
    const result = []
    /**
     * Рекурсивно добавить задачу и её детей в плоский результат.
     * @param {object} task
     * @param {number} depth
     */
    const walk = (task, depth) => {
        result.push({ task, depth })
        const children = childrenByParent.get(task.uid) || []
        for (const child of children) walk(child, depth + 1)
    }
    const roots = childrenByParent.get(null) || []
    for (const root of roots) walk(root, 0)
    return result
}

/**
 * Отдать символ статуса для задачи.
 * Зачем: визуальное различие COMPLETED / NEEDS-ACTION / прочих в одну колонку.
 * @param {string} status
 * @returns {string}
 */
function statusBox(status) {
    if (status === 'COMPLETED') return '[x]'
    if (status === 'NEEDS-ACTION') return '[ ]'
    return '[s]'
}

/**
 * Корневой компонент прототипа: список задач + навигация.
 * Зачем: оборачивает useInput / useApp / стейт выделения; рендерит строки.
 * @param {{ tasks: object[] }} props
 */
export function TaskPicker({ tasks }) {
    const flat = useMemo(() => buildTree(tasks), [tasks])
    const [cursor, setCursor] = useState(0)
    const { exit } = useApp()

    useInput((input, key) => {
        if (input === 'q' || key.escape || (key.ctrl && input === 'c')) {
            exit()
            return
        }
        if (input === 'j' || key.downArrow) {
            setCursor(c => Math.min(flat.length - 1, c + 1))
            return
        }
        if (input === 'k' || key.upArrow) {
            setCursor(c => Math.max(0, c - 1))
            return
        }
        if (input === 'g') { setCursor(0); return }
        if (input === 'G') { setCursor(flat.length - 1); return }
    })

    const rowsToShow = Math.max(5, (process.stdout.rows || 24) - 4)
    const half = Math.floor(rowsToShow / 2)
    let start = Math.max(0, cursor - half)
    const end = Math.min(flat.length, start + rowsToShow)
    start = Math.max(0, end - rowsToShow)

    const visible = flat.slice(start, end)

    return e(Box, { flexDirection: 'column' },
        e(Text, { color: 'cyan' },
            `tui-ink prototype | tasks: ${flat.length} | j/k or arrows: nav, g/G: top/bottom, q: quit`),
        ...visible.map(({ task, depth }, i) => {
            const absoluteIndex = start + i
            const isCursor = absoluteIndex === cursor
            const indent = '  '.repeat(depth)
            const sBox = statusBox(task.status)
            const shortUid = task.shortUid || (task.uid ? String(task.uid).slice(0, 6) : '------')
            const cats = (task.categories && task.categories.length)
                ? ' #' + task.categories.join(' #')
                : ''
            const line = `${indent}${sBox} ${shortUid} ${task.summary || ''}${cats}`
            return e(Text, { key: task.uid || absoluteIndex, inverse: isCursor }, line)
        }),
        e(Text, { color: 'gray' }, `[${cursor + 1}/${flat.length}]`),
    )
}

export default TaskPicker
