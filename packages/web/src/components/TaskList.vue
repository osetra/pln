<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { useTasks } from '../composables/useTasks.js'
import { useUiState } from '../composables/useUiState.js'

defineEmits(['edit', 'add-subtask'])

const draggedTaskUid = ref(null)
const dropTargetUid = ref(null)

const { tasks, filteredTasks, loading, updateTask } = useTasks()

/**
 * Начало перетаскивания задачи
 * @param {DragEvent} e
 * @param {Object} task
 */
function onDragStart(e, task) {
    draggedTaskUid.value = task.uid
    e.dataTransfer.effectAllowed = 'move'
}

/** Сброс состояния DnD */
function onDragEnd() {
    draggedTaskUid.value = null
    dropTargetUid.value = null
}

/**
 * Разрешаем drop, подсвечиваем цель
 * @param {DragEvent} e
 * @param {Object} task
 */
function onDragOver(e, task) {
    if (!draggedTaskUid.value || draggedTaskUid.value === task.uid) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    dropTargetUid.value = task.uid
}

/**
 * Убираем подсветку при уходе курсора
 * @param {Object} task
 */
function onDragLeave(task) {
    if (dropTargetUid.value === task.uid) dropTargetUid.value = null
}

/**
 * Перемещение: обновить parent перетаскиваемой задачи
 * @param {DragEvent} e
 * @param {Object} targetTask
 */
async function onDrop(e, targetTask) {
    e.preventDefault()
    const sourceTask = tasks.value.find(t => t.uid === draggedTaskUid.value)
    if (!sourceTask || sourceTask.uid === targetTask.uid) return
    if (isDescendant(targetTask.uid, sourceTask.uid)) return
    await updateTask(sourceTask, { uid: sourceTask.uid, parent: targetTask.uid })
    draggedTaskUid.value = null
    dropTargetUid.value = null
}

/**
 * Drop в корень — сброс parent
 * @param {DragEvent} e
 */
async function onDropRoot(e) {
    e.preventDefault()
    const sourceTask = tasks.value.find(t => t.uid === draggedTaskUid.value)
    if (!sourceTask?.parent) return
    await updateTask(sourceTask, { uid: sourceTask.uid, parent: undefined })
    draggedTaskUid.value = null
    dropTargetUid.value = null
}

/**
 * Проверяет, является ли checkUid потомком ancestorUid (защита от циклов)
 * @param {string} checkUid
 * @param {string} ancestorUid
 * @returns {boolean}
 */
function isDescendant(checkUid, ancestorUid) {
    const taskMap = new Map(tasks.value.map(t => [t.uid, t]))
    let current = taskMap.get(checkUid)
    while (current?.parent) {
        const parentUid = current.parent?.value || current.parent
        if (parentUid === ancestorUid) return true
        current = taskMap.get(parentUid)
    }
    return false
}
const treeRef = ref(null)
const expanded = ref(false)

function toggleExpandAll() {
    if (!treeRef.value) return
    if (expanded.value) {
        treeRef.value.collapseAll()
    } else {
        treeRef.value.expandAll()
    }
    expanded.value = !expanded.value
}
const { uiState } = useUiState()

/** @returns {boolean} совпадает ли задача с поисковым запросом */
function matchesQuery(task, q) {
    return task.summary?.toLowerCase().includes(q) ||
        task.categories?.some(c => c.toLowerCase().includes(q))
}

/** @returns {Object[]} все задачи, совпавшие с find-запросом */
const findMatches = computed(() => {
    if (uiState.value.searchType !== 'find') return []
    const q = (uiState.value.searchQuery || '').toLowerCase().trim()
    if (!q) return []
    return tasks.value.filter(t => matchesQuery(t, q))
})

const findIndex = ref(0)
const findMatchUid = computed(() => findMatches.value[findIndex.value]?.uid ?? null)

watch(() => uiState.value.searchQuery, () => { findIndex.value = 0 })

/**
 * Переход к следующему совпадению find (циклически)
 */
function findNext() {
    if (!findMatches.value.length) return
    findIndex.value = (findIndex.value + 1) % findMatches.value.length
    scrollToMatch(findMatchUid.value)
}

/**
 * Собирает цепочку родительских uid от задачи до корня
 * @param {string} uid
 * @returns {string[]}
 */
function getAncestorUids(uid) {
    const ancestors = []
    const taskMap = new Map(tasks.value.map(t => [t.uid, t]))
    let current = taskMap.get(uid)
    while (current) {
        const parentUid = current.parent?.value || current.parent
        if (!parentUid || !taskMap.has(parentUid)) break
        ancestors.push(parentUid)
        current = taskMap.get(parentUid)
    }
    return ancestors
}

/**
 * Разворачивает дерево до узла и скроллит к нему
 * @param {string} uid
 */
async function scrollToMatch(uid) {
    if (!uid || !treeRef.value) return
    for (const ancestorUid of getAncestorUids(uid)) {
        treeRef.value.setExpanded(ancestorUid, true)
    }
    await nextTick()
    const el = treeRef.value.$el?.querySelector(`[data-uid="${uid}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

watch(findMatchUid, (uid) => scrollToMatch(uid))

watch(() => uiState.value.findNextTrigger, () => findNext())

/**
 * Строит дерево из плоского списка задач
 * @param {Object[]} taskList
 * @returns {Object[]}
 */
function buildTree(taskList) {
    const map = new Map()
    const roots = []

    for (const task of taskList) {
        map.set(task.uid, { key: task.uid, label: task.summary, task, children: [] })
    }

    for (const task of taskList) {
        const parentUid = task.parent?.value || task.parent
        const node = map.get(task.uid)
        if (parentUid && map.has(parentUid)) {
            map.get(parentUid).children.push(node)
        } else {
            roots.push(node)
        }
    }

    return roots
}

const treeNodes = computed(() => buildTree(filteredTasks.value))

async function toggleStatus(task) {
    const nextStatus = task.status === 'COMPLETED' ? 'NEEDS-ACTION' : 'COMPLETED'
    await updateTask(task, { uid: task.uid, status: nextStatus })
}

function statusIcon(status) {
    switch (status) {
        case 'COMPLETED': return 'check_circle'
        case 'IN-PROCESS': return 'pending'
        default: return 'radio_button_unchecked'
    }
}

function statusColor(status) {
    switch (status) {
        case 'COMPLETED': return 'green'
        case 'IN-PROCESS': return 'orange'
        default: return 'grey-6'
    }
}

function priorityColor(priority) {
    if (priority >= 1 && priority <= 4) return 'red'
    if (priority === 5) return 'orange'
    return 'blue'
}

function priorityLabel(priority) {
    if (priority >= 1 && priority <= 4) return 'HIGH'
    if (priority === 5) return 'MED'
    return 'LOW'
}

/**
 * Сортирует категории задачи для единообразного отображения
 * @param {string[]} cats
 * @returns {string[]}
 */
function sortedCategories(cats) {
    if (!cats) return []
    return [...cats].sort()
}

function formatDate(date) {
    if (!date) return ''
    const d = date instanceof Date ? date : new Date(date)
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}
</script>

<template>
    <q-tree
        ref="treeRef"
        v-if="!loading && treeNodes.length > 0"
        :nodes="treeNodes"
        node-key="key"
        dense
        :no-connectors="false"
    >
        <template v-slot:default-header="{ node }">
            <div class="full-width" :data-uid="node.task.uid">
                <div class="row items-center full-width task-node"
                    v-ripple
                    draggable="true"
                    @dragstart="onDragStart($event, node.task)"
                    @dragend="onDragEnd"
                    @dragover="onDragOver($event, node.task)"
                    @dragleave="onDragLeave(node.task)"
                    @drop="onDrop($event, node.task)"
                    :class="{
                        'find-highlight': findMatchUid === node.task.uid,
                        'drop-target': dropTargetUid === node.task.uid,
                    }"
                    @dblclick.stop="$emit('edit', node.task)">
                    <q-checkbox
                        :model-value="node.task.status === 'COMPLETED'"
                        @update:model-value="toggleStatus(node.task)"
                        :color="statusColor(node.task.status)"
                        size="md"
                        dense
                        class="q-mr-sm"
                        @click.stop
                    />
                    <span :class="{ 'text-strike text-muted': node.task.status === 'COMPLETED' }">
                        {{ node.label }}
                    </span>
                    <q-space />
                    <div class="row items-center no-wrap q-gutter-x-xs">
                        <q-chip
                            v-for="cat in sortedCategories(node.task.categories)"
                            :key="cat"
                            size="md"
                            dense
                        >{{ cat }}</q-chip>
                        <span v-if="node.task.due" class="text-muted">
                            <q-icon name="schedule" size="12px" />
                            {{ formatDate(node.task.due) }}
                        </span>
                        <q-badge
                            v-if="node.task.priority > 0"
                            :color="priorityColor(node.task.priority)"
                            :label="priorityLabel(node.task.priority)"
                        />
                        <q-btn flat dense round size="sm" icon="more_vert" class="task-menu-btn" @click.stop>
                            <q-menu>
                                <q-list dense style="min-width: 140px">
                                    <q-item clickable v-close-popup @click="$emit('edit', node.task)">
                                        <q-item-section side><q-icon name="edit" size="xs" /></q-item-section>
                                        <q-item-section>Edit</q-item-section>
                                    </q-item>
                                    <q-item clickable v-close-popup @click="$emit('add-subtask', node.task)">
                                        <q-item-section side><q-icon name="playlist_add" size="xs" /></q-item-section>
                                        <q-item-section>Subtask</q-item-section>
                                    </q-item>
                                </q-list>
                            </q-menu>
                        </q-btn>
                    </div>
                </div>
            </div>
        </template>
    </q-tree>
    <div v-if="!loading && treeNodes.length > 0" class="q-pa-sm q-pl-md row items-center">
        <q-btn
            flat dense no-caps size="sm"
            :icon="expanded ? 'unfold_less' : 'unfold_more'"
            :label="expanded ? 'Collapse' : 'Expand All'"
            class="text-muted"
            @click="toggleExpandAll"
        />
    </div>
    <div
        v-if="!loading && treeNodes.length > 0 && draggedTaskUid"
        class="drop-root-zone"
        :class="{ 'drag-active': draggedTaskUid }"
        @drop="onDropRoot"
        @dragover.prevent
    >
        В корень
    </div>
    <div v-if="loading" class="text-center q-pa-md">
        <q-spinner color="primary" size="2em" />
        <div class="text-muted q-mt-sm">
            Loading tasks...
        </div>
    </div>
    <div v-if="!loading && treeNodes.length === 0" class="text-center text-muted q-pa-md">
        No tasks
    </div>
</template>


<style scoped>
:deep(.q-tree__arrow) {
    font-size: 20px;
}
.task-node {
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    position: relative;
    transition: background 0.15s ease;
}
.task-node:hover {
    background: rgba(0, 0, 0, 0.03);
}
.find-highlight {
    background: rgba(var(--q-primary-rgb, 25, 118, 210), 0.15);
    border-radius: 4px;
}
.task-menu-btn {
    opacity: 0.4;
    transition: opacity 0.15s;
}
.task-node:hover .task-menu-btn,
.task-menu-btn:focus {
    opacity: 1;
}
.drop-target {
    outline: 2px dashed var(--q-primary);
    outline-offset: -2px;
    background: rgba(var(--q-primary-rgb, 25, 118, 210), 0.08);
}
.task-node[draggable="true"] { cursor: grab; }
.task-node[draggable="true"]:active { cursor: grabbing; }
.drop-root-zone {
    padding: 8px 16px;
    text-align: center;
    color: #999;
    border: 2px dashed transparent;
    border-radius: 6px;
    transition: all 0.15s;
}
.drop-root-zone.drag-active {
    border-color: var(--q-primary);
    background: rgba(var(--q-primary-rgb, 25, 118, 210), 0.05);
}
</style>
