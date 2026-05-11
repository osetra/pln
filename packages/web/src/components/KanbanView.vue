<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'

import { frontendFilter } from '@pln/core/utils/frontend-filter.js'
import { Filter, Condition } from '@pln/core/dto/filter.js'

import { useTasks } from '../composables/useTasks.js'

const emit = defineEmits(['edit'])
const { filteredTasks, updateTask } = useTasks()

const zoom = ref(Number(localStorage.getItem('kanban-zoom')) || 100)

/** @param {number} delta — шаг изменения зума в процентах */
function changeZoom(delta) {
  zoom.value = Math.max(30, Math.min(150, zoom.value + delta))
  localStorage.setItem('kanban-zoom', zoom.value)
}

const kanbanWrapper = ref(null)

/**
 * Обрабатывает pinch-zoom (ctrl+wheel) на канбан-области
 * @param {WheelEvent} e
 */
function onPinchZoom(e) {
  if (!e.ctrlKey) return
  e.preventDefault()
  changeZoom(e.deltaY > 0 ? -5 : 5)
}

let lastPinchDist = 0

/**
 * Расстояние между двумя касаниями
 * @param {TouchList} touches
 * @returns {number}
 */
function getTouchDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.hypot(dx, dy)
}

/** @param {TouchEvent} e */
function onTouchStart(e) {
  if (e.touches.length === 2) lastPinchDist = getTouchDist(e.touches)
}

/** @param {TouchEvent} e */
function onTouchMove(e) {
  if (e.touches.length !== 2) return
  e.preventDefault()
  const dist = getTouchDist(e.touches)
  const delta = dist - lastPinchDist
  if (Math.abs(delta) > 5) {
    changeZoom(delta > 0 ? 3 : -3)
    lastPinchDist = dist
  }
}

onMounted(() => {
  const el = kanbanWrapper.value
  if (!el) return
  el.addEventListener('wheel', onPinchZoom, { passive: false })
  el.addEventListener('touchstart', onTouchStart, { passive: true })
  el.addEventListener('touchmove', onTouchMove, { passive: false })
})
onUnmounted(() => {
  const el = kanbanWrapper.value
  if (!el) return
  el.removeEventListener('wheel', onPinchZoom)
  el.removeEventListener('touchstart', onTouchStart)
  el.removeEventListener('touchmove', onTouchMove)
})

const defaultColumns = [
  { id: 'inbox', title: 'Inbox', field: 'categories', value: 'inbox', dot: '#5b7fff' },
  { id: 'pj',   title: 'PJ',    field: 'categories', value: 'pj',    dot: '#ffb740' },
  { id: 'next', title: 'Next',   field: 'categories', value: 'next',  dot: '#38e8a0' },
  { id: 'done', title: 'Done',   field: 'statuses',   value: 'COMPLETED', dot: '#888' },
]

const STORAGE_KEY = 'kanban-columns'

/**
 * Загружает колонки из localStorage или возвращает дефолтные
 * @returns {Object[]}
 */
function loadColumns() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* невалидный JSON — используем дефолт */ }
  return defaultColumns
}

/**
 * Сохраняет конфигурацию колонок в localStorage
 * @param {Object[]} cols
 */
function saveColumns(cols) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cols))
}

const columns = ref(loadColumns())

watch(columns, saveColumns, { deep: true })

const draggedTask = ref(null)
const sourceCol = ref(null)
const dropTargetColId = ref(null)
const draggedColId = ref(null)

const fieldOptions = [
  { label: 'Категория', value: 'categories' },
  { label: 'Статус', value: 'status' },
  { label: 'Без категории', value: '_uncategorized' },
]

/**
 * Возвращает задачи, соответствующие фильтру колонки
 * @param {Object} col — конфиг колонки
 * @returns {Object[]}
 */
function getColumnTasks(col) {
  if (col.field === '_uncategorized') {
    return filteredTasks.value.filter(t =>
      (!t.categories || t.categories.length === 0) && t.status !== 'COMPLETED'
    )
  }
  const filter = new Filter([
    new Condition({ field: col.field, value: col.value, combineType: 'add' })
  ])
  const tasks = frontendFilter.applyFilter(filteredTasks.value, filter)
  return tasks.sort((a, b) => (a.status === 'COMPLETED') - (b.status === 'COMPLETED'))
}

/**
 * Добавляет новую колонку с дефолтными значениями
 */
function addColumn() {
  columns.value.push({
    id: Date.now().toString(),
    title: 'New',
    field: 'categories',
    value: '',
    dot: '#999',
  })
}

/**
 * Удаляет колонку по id
 * @param {string} id
 */
function removeColumn(id) {
  columns.value = columns.value.filter(c => c.id !== id)
}

/**
 * Начало перетаскивания колонки за хедер
 * @param {DragEvent} e
 * @param {Object} col
 */
function onColDragStart(e, col) {
  draggedColId.value = col.id
  draggedTask.value = null
  e.dataTransfer.effectAllowed = 'move'
}

/**
 * Начало перетаскивания карточки
 * @param {DragEvent} e
 * @param {Object} task
 * @param {Object} col — исходная колонка
 */
function onDragStart(e, task, col) {
  draggedTask.value = task
  sourceCol.value = col
  draggedColId.value = null
  e.dataTransfer.effectAllowed = 'move'
}

/**
 * Подсветка колонки при наведении
 * @param {DragEvent} e
 * @param {string} colId
 */
function onDragOver(e, colId) {
  e.preventDefault()
  dropTargetColId.value = colId
}

/**
 * Убираем подсветку при уходе курсора
 * @param {string} colId
 */
function onDragLeave(colId) {
  if (dropTargetColId.value === colId) dropTargetColId.value = null
}

/**
 * Обработка drop — обновляет категорию/статус задачи
 * @param {DragEvent} e
 * @param {Object} targetCol — целевая колонка
 */
async function onDrop(e, targetCol) {
  e.preventDefault()
  dropTargetColId.value = null

  if (draggedColId.value) {
    const arr = columns.value
    const fromIdx = arr.findIndex(c => c.id === draggedColId.value)
    const toIdx = arr.findIndex(c => c.id === targetCol.id)
    if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
      const [moved] = arr.splice(fromIdx, 1)
      arr.splice(toIdx, 0, moved)
    }
    draggedColId.value = null
    return
  }

  const task = draggedTask.value
  const src = sourceCol.value
  if (!task || !src || src.id === targetCol.id) return

  const props = { uid: task.uid }

  // убрать из старой колонки (источник _uncategorized — ничего убирать не надо)
  if (src.field === 'categories') {
    props.categories = task.categories.filter(c => c !== src.value)
  }

  // добавить в новую колонку
  if (targetCol.field === '_uncategorized') {
    props.categories = []
    props.status = 'NEEDS-ACTION'
  } else if (targetCol.field === 'categories') {
    props.categories = [...(props.categories ?? task.categories), targetCol.value]
  } else if (targetCol.field === 'statuses') {
    props.status = targetCol.value
  }

  await updateTask(task, props)
  draggedTask.value = null
  sourceCol.value = null
}

/* ── Touch DnD для карточек ── */
let touchDragEl = null
let touchClone = null
let touchTimer = null

/**
 * Находит колонку под точкой касания (скрывая ghost)
 * @param {number} x
 * @param {number} y
 * @returns {string|null}
 */
function getColIdAtPoint(x, y) {
  if (touchClone) touchClone.style.display = 'none'
  const el = document.elementFromPoint(x, y)
  if (touchClone) touchClone.style.display = ''
  const colEl = el?.closest('.kanban-col')
  if (!colEl) return null
  const idx = [...colEl.parentElement.children]
    .filter(c => c.classList.contains('kanban-col')).indexOf(colEl)
  return columns.value[idx]?.id || null
}

/**
 * Long press начинает touch-drag карточки
 * @param {TouchEvent} e
 * @param {Object} task
 * @param {Object} col
 */
function onCardTouchStart(e, task, col) {
  if (e.touches.length !== 1) return
  const x = e.touches[0].clientX
  const y = e.touches[0].clientY
  const card = e.target.closest('.kanban-card')
  touchTimer = setTimeout(() => {
    draggedTask.value = task
    sourceCol.value = col
    touchDragEl = card
    touchClone = card.cloneNode(true)
    touchClone.classList.add('kanban-card-ghost')
    document.body.appendChild(touchClone)
    touchClone.style.left = `${x - 80}px`
    touchClone.style.top = `${y - 20}px`
    card.style.opacity = '0.3'
  }, 300)
}

/** @param {TouchEvent} e */
function onCardTouchMove(e) {
  if (!touchClone) { clearTimeout(touchTimer); return }
  e.preventDefault()
  const t = e.touches[0]
  touchClone.style.left = `${t.clientX - 80}px`
  touchClone.style.top = `${t.clientY - 20}px`
  dropTargetColId.value = getColIdAtPoint(t.clientX, t.clientY)
}

/** @param {TouchEvent} _e */
function onCardTouchEnd(_e) {
  clearTimeout(touchTimer)
  if (!touchClone) return
  if (touchDragEl) touchDragEl.style.opacity = ''
  touchClone.remove()
  touchClone = null
  touchDragEl = null

  const colId = dropTargetColId.value
  if (colId) {
    const targetCol = columns.value.find(c => c.id === colId)
    if (targetCol) onDrop(new Event('drop'), targetCol)
  }
  dropTargetColId.value = null
  draggedTask.value = null
  sourceCol.value = null
}

/**
 * Сортирует категории для единообразного отображения
 * @param {string[]} cats
 * @returns {string[]}
 */
function sortedCategories(cats) {
  if (!cats) return []
  return [...cats].sort()
}

/**
 * Форматирует дату для отображения
 * @param {Date|string} date
 * @returns {string}
 */
function formatDate(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}
</script>

<template>
  <div ref="kanbanWrapper" class="kanban-wrapper">
  <div class="kanban-board" :style="{ zoom: `${zoom}%` }">
    <div
      v-for="col in columns"
      :key="col.id"
      class="kanban-col"
      :class="{ 'col-drop-target': dropTargetColId === col.id, 'col-dragging': draggedColId === col.id }"
      @dragover.prevent="onDragOver($event, col.id)"
      @dragleave="onDragLeave(col.id)"
      @drop="onDrop($event, col)"
    >
      <div class="col-header" @click.stop
           draggable="true"
           @dragstart.stop="onColDragStart($event, col)"
           @dragend="draggedColId = null">
        <span class="col-dot" :style="{ background: col.dot }"></span>
        <span class="col-title">{{ col.title }}</span>
        <span class="col-count">{{ getColumnTasks(col).length }}</span>
        <q-btn flat dense round size="xs" icon="more_vert">
          <q-menu>
            <q-card style="min-width: 220px" class="q-pa-sm q-gutter-sm">
              <q-input v-model="col.title" label="Title" dense />
              <q-select v-model="col.field" :options="fieldOptions" emit-value map-options
                        label="Field" dense />
              <q-input v-if="col.field !== '_uncategorized'" v-model="col.value"
                       label="Value" dense />
              <q-color v-model="col.dot" default-view="palette" no-header class="q-mt-sm" />
              <q-btn flat dense color="negative" label="Удалить" icon="delete"
                     @click="removeColumn(col.id)" v-close-popup />
            </q-card>
          </q-menu>
        </q-btn>
      </div>
      <div
        v-for="task in getColumnTasks(col)"
        :key="task.uid"
        class="kanban-card"
        :class="{ 'kanban-card--done': task.status === 'COMPLETED' }"
        draggable="true"
        @dragstart="onDragStart($event, task, col)"
        @contextmenu.prevent
        @touchstart.passive="onCardTouchStart($event, task, col)"
        @touchmove="onCardTouchMove"
        @touchend="onCardTouchEnd"
        @click="emit('edit', task)"
      >
        <div class="kanban-card-title">{{ task.summary }}</div>
        <div class="kanban-card-meta">
          <q-icon name="schedule" size="12px" />
          <span v-if="task.due">{{ formatDate(task.due) }}</span>
          <q-chip
            v-for="cat in sortedCategories(task.categories)"
            :key="cat"
            size="md"
            dense
          >{{ cat }}</q-chip>
        </div>
      </div>
    </div>
    <div class="kanban-col-add" @click="addColumn">
      <q-icon name="add" size="20px" />
    </div>
  </div>
  </div>
  <div class="kanban-zoom-controls">
    <q-btn flat dense round size="sm" icon="remove" @click="changeZoom(-10)" />
    <span class="text-caption">{{ zoom }}%</span>
    <q-btn flat dense round size="sm" icon="add" @click="changeZoom(10)" />
  </div>
</template>

<style scoped>
.kanban-wrapper {
  height: 100%;
  touch-action: pan-x pan-y;
}
.kanban-zoom-controls {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: rgba(var(--q-dark-rgb, 30, 30, 30), 0.85);
  border-radius: 20px;
  backdrop-filter: blur(8px);
  z-index: 100;
  color: white;
}
.kanban-board {
  display: flex;
  justify-content: center;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 10px;
  height: 100%;
}
.kanban-board::-webkit-scrollbar { height: 5px; }
.kanban-board::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.3);
  border-radius: 4px;
}

.kanban-col {
  min-width: 250px;
  width: 250px;
  background: rgba(128, 128, 128, 0.06);
  border: 1px solid rgba(128, 128, 128, 0.15);
  border-radius: 12px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: border-color 0.15s, background 0.15s;
}

.col-drop-target {
  border-color: var(--q-primary);
  background: rgba(var(--q-primary-rgb, 25, 118, 210), 0.06);
}

.col-dragging { opacity: 0.4; }

.col-header {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 2px 2px 6px;
  cursor: grab;
}

.col-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.col-title {
  font-size: 12.5px;
  font-weight: 600;
  flex: 1;
}

.col-count {
  font-size: 10px;
  font-family: monospace;
  background: rgba(128, 128, 128, 0.15);
  color: rgba(128, 128, 128, 0.7);
  padding: 1px 6px;
  border-radius: 20px;
}

.kanban-card {
  background: rgba(128, 128, 128, 0.08);
  border: 1px solid rgba(128, 128, 128, 0.15);
  border-radius: 9px;
  padding: 10px 11px;
  cursor: grab;
  transition: border-color 0.15s, transform 0.12s;
}
.kanban-card:hover {
  border-color: var(--q-primary);
  transform: translateY(-2px);
}
.kanban-card:active { cursor: grabbing; }
.kanban-card--done { opacity: 0.5; }
.kanban-card--done .kanban-card-title { text-decoration: line-through; }

.kanban-card-title {
  font-size: 13px;
  margin-bottom: 6px;
}

.kanban-card-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  color: rgba(128, 128, 128, 0.8);
}

.kanban-col-add {
  min-width: 250px;
  width: 250px;
  background: transparent;
  border: 2px dashed rgba(128, 128, 128, 0.25);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(128, 128, 128, 0.5);
  transition: border-color 0.15s, color 0.15s;
}
.kanban-col-add:hover {
  border-color: var(--q-primary);
  color: var(--q-primary);
}
</style>

<style>
.kanban-card-ghost {
  position: fixed;
  width: 200px;
  pointer-events: none;
  opacity: 0.85;
  z-index: 1000;
  background: rgba(128, 128, 128, 0.15);
  border: 1px solid var(--q-primary);
  border-radius: 9px;
  padding: 10px 11px;
  font-size: 13px;
}
</style>
